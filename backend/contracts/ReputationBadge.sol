//SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title ReputationBadge
 * @author OLB
 * @notice Ce contrat permet d'attribuer un badge de réputation à un utilisateur. Le badge est un token ERC721 qui ne peut pas être transféré. C'est un SoulBound token. Tout auditeur qui s'inscrit sur la DApp peut recevoir un NFT.
 *
 * ============================================================
 * FLUX FINANCIERS  (exemple sur un dépôt de 100 USDC)
 * ============================================================
 *
 *  PHASE 4 : depositAudit()
 *  ─────────────────────────────────────────────────────────
 *  Requester ──[100 USDC]──► AuditRegistry
 *                                  │
 *                     ┌────────────┴────────────┐
 *                     ▼                         ▼
 *               Treasury (5%)            AuditEscrow (95%)
 *                5 USDC                    95 USDC
 *
 *  PHASE 5a : validateAudit()  =>  lockFunds()
 *  ─────────────────────────────────────────────────────────
 *  AuditRegistry ──────────────────────► AuditEscrow
 *                                          │
 *                             ┌────────────┴────────────┐
 *                             ▼                         ▼
 *                     Paiement immédiat          Retenue de garantie
 *                       70% = 66.5 USDC            30% = 28.5 USDC
 *                     (claimable aussitôt)       (bloqué jusqu'à guaranteeEnd)
 *
 *  PHASE 5b : claimRefundAfterTimeout()  (alternatif – si pas de validation sous 10j)
 *  ─────────────────────────────────────────────────────────
 *  Requester ──► AuditRegistry ──► AuditEscrow.refund()
 *  Requester ◄──[95 USDC]──────────────────────────────────
 *  Note : les 5 USDC Treasury ne sont pas remboursés
 *
 *  PHASE 6a : claimPayment()  (pull payment, pas de délai après validation)
 *  ─────────────────────────────────────────────────────────
 *  Auditeur ──► AuditRegistry ──► AuditEscrow.releasePayment()
 *  Auditeur ◄──[66.5 USDC]──────────────────────────────────
 *
 *  PHASE 7a : claimGuarantee()  (après guaranteeEnd, ou exploit rejeté)
 *  ─────────────────────────────────────────────────────────
 *  Auditeur ──► AuditRegistry ──► AuditEscrow.releaseGuarantee()
 *  Auditeur ◄──[28.5 USDC]──────────────────────────────────
 *
 *  CAS EXPLOIT : resolveIncident(validated=true)
 *  ─────────────────────────────────────────────────────────
 *  DAOVoting ──► AuditRegistry ──► ReputationBadge.incExploits()
 *  Note : la libération des 28.5 USDC vers le requester
 *         est gérée par AuditEscrow (hors scope de cette Registry)
 *
 * ============================================================
 */
contract ReputationBadge is ERC721, Ownable {
    /** @notice Adresse du contrat AuditRegistry : seul autorisé à mint/update */
    address public registryAddress;

    uint256 private tokenCounter;
    string private imageURI;

    /**
     * @notice Metatdonnées du NFT de réputation.
     * @dev Variable packing pour tenir dans un seul slot (256 bits exactement).
     */
    struct AuditorData {
        uint120 registrationDate; // max = 1.3e36 (année 4.2e21, bien suffisant)
        uint72 reputationScore; // max = 4.7e21 (largement suffisant pour score)
        uint32 totalAudits; // max = 4,294,967,295 (audits par auditeur)
        uint32 totalExploits; // max = 4,294,967,295 (exploits par auditeur)
    }

    /**
     * @notice Mapper le tokenId et les metadata de l'auditeur : score de réputation, nb audits, nb exploits subits, date d'obtention du badge, etc.
     * @dev j'aurais aimé que la clé du mapping soit l'adresse de l'auditeur mais tokenID est le point d'entrée pour le tokenURI.
     */
    mapping(uint256 => AuditorData) private _auditorData;

    /**
     * @notice Mapping entre une adresse et un tokenID
     * @dev Utile pour retrouver le tokenId d'un auditeur à partir de son adresse, par exemple pour update ses metadata après un audit.
     */
    mapping(address => uint256) public tokenIdOf;

    //Erreurs :
    error ReputationBadge__Soulbound();
    error ReputationBadge__NotRegistry();
    error ReputationBadge__AlreadyMinted();
    error ReputationBadge__TokenDoesNotExist();
    error ReputationBadge__ZeroAddress();

    // =========================================================================
    // EIP-5192 Soul-bound + EIP-4906 Metadata Update
    // =========================================================================

    /** @dev EIP-5192 : émis au mint pour signaler que le token est verrouillé à vie */
    event Locked(uint256 tokenId);

    /** @dev EIP-4906 : émis après chaque modification de metadata pour notifier les indexeurs */
    event MetadataUpdate(uint256 tokenId);

    // =========================================================================
    // Modifiers
    // =========================================================================

    /** @notice Seul la registry peut modifier les metadata du badge de réputation */
    modifier onlyRegistry() {
        if (msg.sender != registryAddress)
            revert ReputationBadge__NotRegistry();
        _;
    }

    constructor(
        string memory svgImage
    ) ERC721("AuditRegistry ReputationBadge", "AURB") Ownable(msg.sender) {
        tokenCounter = 1; //1 et pas 0 pour éviter les problèmes de tokenId 0 qui est considéré comme non existant dans ERC721
        imageURI = svgToImageURI(svgImage);
    }

    /**
     * @notice Définit l'adresse du contrat AuditRegistry
     * @dev Appelé par le owner après déploiement d'AuditRegistry. Elle peut être modifiée plus tard en cas de changement de registery (update)
     * @param registry Adresse du contrat AuditRegistry
     */
    function setRegistryAddress(address registry) external onlyOwner {
        if (registry == address(0)) revert ReputationBadge__ZeroAddress();
        registryAddress = registry;
    }

    function mintNft(address auditor) external onlyRegistry returns (uint256) {
        if (tokenIdOf[auditor] != 0) revert ReputationBadge__AlreadyMinted();

        uint256 tokenId = tokenCounter;

        // Alimentation du mapping inverse adresse/tokenId
        tokenIdOf[auditor] = tokenId;

        // Initialisation des metadata
        _auditorData[tokenId] = AuditorData({
            reputationScore: 0,
            registrationDate: uint120(block.timestamp),
            totalAudits: 0,
            totalExploits: 0
        });

        _safeMint(auditor, tokenId);
        emit Locked(tokenId); // EIP-5192 : signaler que le token est verrouillé à vie

        tokenCounter++;
        return tokenId;
    }

    /**
     * @notice Cette fonction convertit une chaîne SVG en une URI d'image encodée en base64.
     * @dev inspiration https://github.com/BenBktech/NFT-Project-with-OnChain-Metadatas/blob/main/contracts/NFTIsERC721.sol
     * @param svg La chaîne SVG à convertir.
     * @return Une URI d'image encodée en base64.
     */
    function svgToImageURI(
        string memory /*pas de calldata car cette fonction est appelée par le constructor et il ne peut pas avoir un calldata en parametre*/ svg
    ) public pure returns (string memory) {
        string memory baseURL = "data:image/svg+xml;base64,";
        string memory svgBase64Encoded = Base64.encode(
            bytes(string(abi.encodePacked(svg)))
        );
        return string(abi.encodePacked(baseURL, svgBase64Encoded));
    }

    /** @notice Override de la fonction _baseURI pour retourner une URI de base qui indique que les metadata sont encodées en base64. */
    function _baseURI() internal pure override returns (string memory) {
        return "data:application/json;base64,";
    }

    /**
     * @notice Retourne dynamiquement les metadata en base64 :score de réputation, nb audits, nb expoits subits, date d'obtention du badge, etc. L'image est une chaîne SVG encodée en base64.
     * @dev Basé sur la documenation d'OpenSea :https://docs.opensea.io/docs/metadata-standards
     * @param tokenId L'ID du token pour lequel retourner l'URI.
     * @return les metadata encodées en base64.
     */
    function tokenURI(
        uint256 tokenId
    ) public view override returns (string memory) {
        if (_ownerOf(tokenId) == address(0)) {
            revert ReputationBadge__TokenDoesNotExist();
        }

        AuditorData memory metadata = _auditorData[tokenId];

        return
            string(
                abi.encodePacked(
                    _baseURI(),
                    Base64.encode(
                        bytes(
                            abi.encodePacked(
                                '{"name":"',
                                name(), // nom passé dans le constructeur
                                '", "description":"ReputationBadge for SmartContract ", ',
                                '"attributes": [',
                                '{"trait_type":"Reputation Score","value":',
                                Strings.toString(metadata.reputationScore),
                                "},",
                                '{"trait_type":"Total Audits","value":',
                                Strings.toString(uint256(metadata.totalAudits)),
                                "},",
                                '{"trait_type":"Total Exploits","value":',
                                Strings.toString(
                                    uint256(metadata.totalExploits)
                                ),
                                "},",
                                '{"trait_type":"Registration Date","display_type":"date","value":',
                                Strings.toString(
                                    uint256(metadata.registrationDate)
                                ),
                                "}",
                                '], "image":"',
                                getSVG(),
                                '"}'
                            )
                        )
                    )
                )
            );
    }

    function getSVG() public view returns (string memory) {
        return imageURI;
    }


    /** @notice Retourne les données de réputation d'un auditeur par adresse */
    function getAuditorData(
        address auditor
    ) external view returns (AuditorData memory) {
        uint256 tokenId = tokenIdOf[auditor];
        if (tokenId == 0) revert ReputationBadge__TokenDoesNotExist();
        return _auditorData[tokenId];
    }

    //----------------------------------------------------------
    //Fonctions de calcul de la réputation
    //----------------------------------------------------------

    /** @notice Ces fonctions sont appelées par la registry après chaque audit pour mettre à jour les metadata du badge de réputation de l'auditeur */
    function incAudits(
        uint256 tokenId,
        uint256 guaranteeAmount //  100_000_000 => 100 USDC en unités ERC-20
    ) external onlyRegistry {
        AuditorData storage data = _auditorData[tokenId];
        data.totalAudits += 1;
        uint256 guaranteeInUsdc = guaranteeAmount / 1e6; // => 100 USDC
        uint256 gain = Math.log10(guaranteeInUsdc) * 10;
        data.reputationScore = uint72(uint256(data.reputationScore) + gain);
        emit MetadataUpdate(tokenId); // EIP-4906 : signaler que les metadata ont été mises à jour
    }

    /** @notice Incrémente le nombre d'exploits subits par l'auditeur et met à jour son score de réputation en conséquence */
    function incExploits(
        uint256 tokenId,
        uint256 guaranteeAmount //  100_000_000 => 100 USDC en unités ERC-20
    ) external onlyRegistry {
        AuditorData storage data = _auditorData[tokenId];
        data.totalExploits += 1;
        uint256 guaranteeInUsdc = guaranteeAmount / 1e6; // => 100 USDC
        uint256 penalty = Math.log10(guaranteeInUsdc) * 10;

        // Plancher à 0 : pas de underflow possible
        data.reputationScore = uint256(data.reputationScore) > penalty
            ? uint72(uint256(data.reputationScore) - penalty)
            : 0;
        emit MetadataUpdate(tokenId); // EIP-4906 : signaler que les metadata ont été mises à jour
    }
    //----------------------------------------------------------
    //Fin fonctions de calcul de la réputation
    //----------------------------------------------------------

    /**
     * @notice Override de la fonction _update pour empêcher le transfert du badge de réputation. C'est un SoulBound token.
     * @dev _safetransfer,_transfert appellent _update en interne.
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);
        //on ne bloque que s'il y a une adresse assciée au tokenId, c'est à dire que le token existe déjà. Sinon, on bloque pas pour permettre le mint du token (from = address(0) lors du mint)
        if (from != address(0)) revert ReputationBadge__Soulbound();
        return super._update(to, tokenId, auth);
    }

    /**
     * @notice Déclare les interfaces supportées (ERC-165). Celles qui ne sont pas héritées: pour indiquer que c'est un SoulBound token (EIP-5192) et qu'il supporte la mise à jour des metadata (EIP-4906)
     * @dev 0xb45a3c0e = EIP-5192 (soul-bound)
     *      0x49064906 = EIP-4906 (metadata update)
     *      super gère ERC-721 (0x80ac58cd) et ERC-165 (0x01ffc9a7)
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view override returns (bool) {
        return
            interfaceId == 0xb45a3c0e || // EIP-5192 : https://eips.ethereum.org/EIPS/eip-5192
            interfaceId == 0x49064906 || // EIP-4906 : https://eips.ethereum.org/EIPS/eip-4906
            super.supportsInterface(interfaceId);
    }

    /**
     * @notice Retourne true si le token est verrouillé : toujours true pour ce NFT (EIP-5192)
     * @dev Requis par EIP-5192 : permet aux marketplaces de détecter le soul-bound sans tenter un transfert qui echouerait
     */
    function locked(uint256 tokenId) external view returns (bool) {
        if (_ownerOf(tokenId) == address(0))
            revert ReputationBadge__TokenDoesNotExist();
        return true;
    }
}
