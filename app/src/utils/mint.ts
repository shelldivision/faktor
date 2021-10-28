import { PublicKey } from "@solana/web3.js";

export type Mint = {
  address: PublicKey;
  name: string;
  ticker: string;
  icon: string;
};

export const MINTS = {
  WSOL: {
    address: new PublicKey("So11111111111111111111111111111111111111112"),
    name: "Solana",
    ticker: "wSOL",
    icon: "/svg/token/sol.svg"
  },
  USDC: {
    address: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
    name: "USD Coin",
    ticker: "USDC",
    icon: "/svg/token/usdc.svg"
  }
};
