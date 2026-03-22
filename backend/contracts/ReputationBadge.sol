//SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

/// @title ReputationBadge
/// @author OLB
/// @notice Ce contrat permet d'attribuer un badge de réputation à un utilisateur. Le badge est un token ERC721 qui ne peut pas être transféré. C'est un SoulBound token. Tout auditeur qui s'inscrit sur la DApp peut recevoir un NFT.
contract ReputationBadge is ERC721, Ownable {
    uint256 private s_tokenCounter;
    string private s_imageURI;

    //Erreurs :
    error ReputationBadge__Soulbound();
    error ReputationBadge__NotRegistry();
    error ReputationBadge__AlreadyMinted();
    error ReputationBadge__TokenDoesNotExist();
    error ReputationBadge__ZeroAddress();

    constructor(
        string memory imageURI
    ) ERC721("AuditRegistry ReputationBadge", "AURB") Ownable(msg.sender) {
        s_tokenCounter = 0;
        s_imageURI = svgToImageURI(imageURI);
    }

    function mintNft() public {
        _safeMint(msg.sender, s_tokenCounter);
        s_tokenCounter = s_tokenCounter + 1;
    }

    /**
     *@notice Cette fonction convertit une chaîne SVG en une URI d'image encodée en base64.
     *@dev inspiration https://github.com/BenBktech/NFT-Project-with-OnChain-Metadatas/blob/main/contracts/NFTIsERC721.sol
     *@param svg La chaîne SVG à convertir.
     *@return Une URI d'image encodée en base64.
     */
    function svgToImageURI(
        string memory svg
    ) public pure returns (string memory) {
        string memory baseURL = "data:image/svg+xml;base64,";
        string memory svgBase64Encoded = Base64.encode(
            bytes(string(abi.encodePacked(svg)))
        );
        return string(abi.encodePacked(baseURL, svgBase64Encoded));
    }

    function _baseURI() internal pure override returns (string memory) {
        return "data:application/json;base64,";
    }

    /**
     *@notice Retourne dynamiquement les metadata en base64.
     *@dev Basé sur la documenation d'OpenSea :https://docs.opensea.io/docs/metadata-standards
     *@param tokenId L'ID du token pour lequel retourner l'URI.
     *@return les metadata encodées en base64.
     */
    function tokenURI(
        uint256 tokenId
    ) public view virtual override returns (string memory) {
        if (_ownerOf(tokenId) == address(0)) {
            revert ReputationBadge__TokenDoesNotExist();
        }
        return
            string(
                abi.encodePacked(
                    _baseURI(),
                    Base64.encode(
                        bytes(
                            abi.encodePacked(
                                '{"name":"',
                                name(), // You can add whatever name here
                                '", "description":"An NFT with onChain Metadatas", ',
                                '"attributes": [{"trait_type": "alyra", "value": 100}], "image":"',
                                getSVG(),
                                '"}'
                            )
                        )
                    )
                )
            );
    }

    function getSVG() public view returns (string memory) {
        return s_imageURI;
    }

    function getTokenCounter() public view returns (uint256) {
        return s_tokenCounter;
    }
}
