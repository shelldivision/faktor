import { useEffect, useState } from "react";
import { SecondaryAction, PrimaryAction } from "../ActionButtons";
import { checkWalletAddressExists, CreateCashflowRequest } from "src/api";
import { InputField } from "../InputField";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { useConnection } from "@solana/wallet-adapter-react";

export interface EditingStepProps {
  request: CreateCashflowRequest;
  onCancel: () => void;
  onSubmit: (request: CreateCashflowRequest) => void;
}

export const EditingStep: React.FC<EditingStepProps> = ({
  request,
  onCancel,
  onSubmit,
}) => {
  const [isSubmitEnabled, setIsSubmitEnabled] = useState(false);

  const [receiver, setReceiver] = useState(request.receiver?.toString() ?? "");
  const [receiverError, setReceiverError] = useState("");

  const [balance, setBalance] = useState(request.balance?.toString() ?? "");
  const [memo, setMemo] = useState(request.memo?.toString() ?? "");

  const { connection } = useConnection();

  const _onSubmit = () => {
    onSubmit({
      receiver: new PublicKey(receiver),
      balance: parseFloat(balance) * LAMPORTS_PER_SOL,
      memo: memo,
    });
  };

  useEffect(() => {
    // TODO input validation (valid address, non-negative balance, etc.)
    setIsSubmitEnabled(receiver !== "" && balance !== "" && memo !== "");
  }, [receiver, balance, memo]);

  useEffect(() => {
    if (receiver) {
      setReceiverError("");
      checkWalletAddressExists(connection, receiver).then((res) => {
        if (!res) {
          setReceiverError("Invalid account");
        }
      });
    }
  }, [receiver]);

  return (
    <form onSubmit={_onSubmit} className="w-full">
      <h1 className="copy-title">New invoice</h1>
      <div className="flex flex-col mt-8 space-y-4">
        <InputField
          type="text"
          placeholder="Wallet address"
          error={receiverError}
          value={receiver}
          onChange={(v) => setReceiver(v)}
        />
        <InputField
          type="number"
          placeholder="Amount (SOL)"
          onChange={(v) => setBalance(v)}
        />
        <InputField
          type="text"
          placeholder="Add a note"
          value={memo}
          onChange={(v) => setMemo(v)}
        />
      </div>
      <div className="flex items-center justify-between w-full mt-8 space-x-3">
        <SecondaryAction className="w-1/2" onClick={onCancel}>
          Cancel
        </SecondaryAction>
        <PrimaryAction
          className="w-1/2"
          disabled={!isSubmitEnabled}
          onClick={_onSubmit}
        >
          Send
        </PrimaryAction>
      </div>
    </form>
  );
};
