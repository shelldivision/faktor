import { useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import {
  MintInputField,
  SecondaryAction,
  PrimaryAction,
  InputField,
  TransferRateInput,
  CreatePaymentFormData
} from "@components";

export interface InputStepProps {
  formData: CreatePaymentFormData;
  onSubmit: (formData: CreatePaymentFormData) => void;
  onCancel: () => void;
}

export function InputStep({ formData, onCancel, onSubmit }: InputStepProps) {
  const [isSubmitEnabled, setIsSubmitEnabled] = useState(false);

  const [creditor, setCreditor] = useState(formData.creditor?.toString() ?? "");
  const [creditorError, setCreditorError] = useState("");

  const [memo, setMemo] = useState(formData.memo?.toString() ?? "");
  const [amount, setAmount] = useState(formData.amount?.toString() ?? "");

  const _onSubmit = () => {
    onSubmit({
      creditor: creditor,
      memo: memo,
      amount: amount
    });
  };

  useEffect(() => {
    // TODO input validation (valid address, non-negative amount, etc.)
    setIsSubmitEnabled(creditor !== "" && amount !== "" && memo !== "");
  }, [creditor, amount, memo]);

  useEffect(() => {
    if (creditor) {
      setCreditorError("");
      try {
        new PublicKey(creditor);
      } catch (e) {
        setCreditorError("Invalid address");
      }
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
          onChange={(v) => setCreditor(v)}
        />

        <InputField
          label="Memo"
          type="text"
          placeholder="What's it for?"
          value={memo}
          onChange={(v) => setMemo(v)}
        />

        <div className="flex flex-row flex-1 space-x-2">
          <MintInputField error={null} onChange={() => {}} />
          <InputField
            label="Amount"
            type="number"
            placeholder="0.00"
            onChange={(v) => setAmount(v)}
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
}
