import { FAKTOR_PROGRAM_ID } from "@api";
import { BN, Program } from "@project-serum/anchor";
import { PublicKey, SystemProgram, SYSVAR_CLOCK_PUBKEY } from "@solana/web3.js";
import { assertExists } from "@utils";

const PAYMENT_SEED: Buffer = Buffer.from("payment");

export type CreatePaymentRequest = {
  debtor?: PublicKey;
  creditor?: PublicKey;
  balance?: number;
  memo?: string;
};

export const createPayment = async (faktor: Program, req: CreatePaymentRequest): Promise<any> => {
  // Validate request
  assertExists(req.debtor);
  assertExists(req.creditor);
  assertExists(req.balance);
  assertExists(req.memo);

  // Execute RPC request
  const [address, bump] = await PublicKey.findProgramAddress(
    [PAYMENT_SEED, req.debtor.toBuffer(), req.creditor.toBuffer()],
    FAKTOR_PROGRAM_ID
  );
  try {
    await faktor.rpc.createPayment(bump, new BN(req.balance), req.memo, {
      accounts: {
        payment: address,
        debtor: req.debtor,
        creditor: req.creditor,
        systemProgram: SystemProgram.programId,
        clock: SYSVAR_CLOCK_PUBKEY
      }
    });
    return await faktor.account.payment.fetch(address);
  } catch (error: any) {
    throw new Error(`Failed to issue payment: ${error.message}`);
  }
};
