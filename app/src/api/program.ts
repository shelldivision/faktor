import { Idl } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import idl from "./idl.json";

export const FAKTOR_PROGRAM_ID = new PublicKey(idl.metadata.address);
export const FAKTOR_IDL = idl as FaktorIdl;

export type FaktorIdl = Idl & {
  metadata: {
    address: string;
  };
};
