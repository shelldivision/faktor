import { PublicKey } from "@solana/web3.js";
import idl from "./idl.json";

export const FAKTOR_PROGRAM_ID = new PublicKey(idl.metadata.address);
export const FAKTOR_IDL = idl as any;
