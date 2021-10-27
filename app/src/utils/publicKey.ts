import { PublicKey } from "@solana/web3.js";

export function abbreviate(publicKey: PublicKey): string {
  return publicKey.toString().slice(0, 4) + "..." + publicKey.toString().slice(-4);
}
