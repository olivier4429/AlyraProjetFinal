/** Raccourcit une adresse Ethereum : "0x1234…abcd" */
export function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/** Raccourcit un CID IPFS : "QmXxxx…yyyy" */
export function shortenCid(cid: string): string {
  if (!cid || cid.length <= 20) return cid || "-";
  return `${cid.slice(0, 10)}…${cid.slice(-6)}`;
}
