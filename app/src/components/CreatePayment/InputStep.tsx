import { useEffect, useState } from "react";
import { SecondaryAction, PrimaryAction } from "../ActionButtons";
import { checkWalletAddressExists, CreatePaymentRequest } from "@api";
import { InputField } from "../InputField";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { useConnection } from "@solana/wallet-adapter-react";
import { TransferRateInput } from "../TransferRateInput";
import { MintSelect } from "@components";

export interface InputStepProps {
  request: CreatePaymentRequest;
  onCancel: () => void;
  onSubmit: (request: CreatePaymentRequest) => void;
}

export const InputStep: React.FC<InputStepProps> = ({ request, onCancel, onSubmit }) => {
  const [isSubmitEnabled, setIsSubmitEnabled] = useState(false);

  const [creditor, setReceiver] = useState(request.creditor?.toString() ?? "");
  const [creditorError, setReceiverError] = useState("");

  const [balance, setBalance] = useState(request.balance?.toString() ?? "");
  const [memo, setMemo] = useState(request.memo?.toString() ?? "");

  const { connection } = useConnection();

  const _onSubmit = () => {
    onSubmit({
      creditor: new PublicKey(creditor),
      balance: parseFloat(balance) * LAMPORTS_PER_SOL,
      memo: memo
    });
  };

  useEffect(() => {
    // TODO input validation (valid address, non-negative balance, etc.)
    setIsSubmitEnabled(creditor !== "" && balance !== "" && memo !== "");
  }, [creditor, balance, memo]);

  useEffect(() => {
    if (creditor) {
      setReceiverError("");
      checkWalletAddressExists(connection, creditor).then((res) => {
        if (!res) {
          setReceiverError("Invalid account");
        }
      });
    }
  }, [creditor]);

  return (
    <form onSubmit={_onSubmit} className="w-full space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">New Payment</h1>
      <div className="flex flex-col space-y-4">
        <InputField
          error={creditorError}
          label="To"
          type="text"
          placeholder="Public address"
          value={creditor}
          onChange={(v) => setReceiver(v)}
        />

        <InputField
          label="Memo"
          type="text"
          placeholder="What's it for?"
          value={memo}
          onChange={(v) => setMemo(v)}
        />

        <div className="flex flex-row flex-1 space-x-2">
          <InputField label="Mint" labelClassName="mt-2" input={<MintSelect />} />
          <InputField
            label="Amount"
            type="number"
            placeholder="0.00"
            step="1"
            className="text-2xl"
          />
        </div>
        <TransferRateInput />
      </div>
      <div className="flex items-center justify-between w-full space-x-3">
        <SecondaryAction className="w-1/2" onClick={onCancel}>
          Cancel
        </SecondaryAction>
        <PrimaryAction className="w-1/2" disabled={!isSubmitEnabled} onClick={_onSubmit}>
          Continue
        </PrimaryAction>
      </div>
    </form>
  );
};
