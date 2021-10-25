import { BN, Program } from "@project-serum/anchor";
import { PublicKey, SystemProgram, SYSVAR_CLOCK_PUBKEY } from "@solana/web3.js";
import { assertExists } from "src/utils";

const PAYMENT_SEED: Buffer = Buffer.from("payment");

export type CreatePaymentRequest = {
  program?: Program;
  debtor?: PublicKey;
  creditor?: PublicKey;
  balance?: number;
  memo?: string;
};

export const createPayment = async (
  req: CreatePaymentRequest
): Promise<any> => {
  // Validate request
  assertExists(req.program);
  assertExists(req.debtor);
  assertExists(req.creditor);
  assertExists(req.balance);
  assertExists(req.memo);

  // Execute RPC request
  const [address, bump] = await PublicKey.findProgramAddress(
    [PAYMENT_SEED, req.debtor.toBuffer(), req.creditor.toBuffer()],
    req.program.programId
  );
  try {
    await req.program.rpc.createPayment(bump, new BN(req.balance), req.memo, {
      accounts: {
        payment: address,
        debtor: req.debtor,
        creditor: req.creditor,
        systemProgram: SystemProgram.programId,
        clock: SYSVAR_CLOCK_PUBKEY,
      },
    });
    return await req.program.account.payment.fetch(address);
  } catch (error: any) {
    throw new Error(`Failed to issue payment: ${error.message}`);
  }
};
