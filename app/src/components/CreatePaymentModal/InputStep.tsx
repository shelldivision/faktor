import { CreatePaymentFormData } from "./types";
import {
  InputField,
  InputGroup,
  InputLabel,
  MintSelect,
  PrimaryAction,
  SecondaryAction,
  Toggle
} from "@components";
import { PublicKey } from "@solana/web3.js";
import { useEffect, useMemo, useState } from "react";
import { TimeUnit, TransferRateInput } from "./TransferRateInput";

export interface InputStepProps {
  formData: CreatePaymentFormData;
  onSubmit: (formData: CreatePaymentFormData) => void;
  onCancel: () => void;
}

export function InputStep({ formData, onCancel, onSubmit }: InputStepProps) {
  const [isSubmitEnabled, setIsSubmitEnabled] = useState(false);

  const [creditor, setCreditor] = useState(formData.creditor?.toString() ?? "");
  const [creditorError, setCreditorError] = useState("");
  const [memo, setMemo] = useState(formData.memo);
  const [nextTransferAt, setNextTransferAt] = useState(formData.nextTransferAt);
  const [amount, setAmount] = useState(formData.amount);
  const [interval, setInterval] = useState<TimeUnit>(formData.interval);
  const [frequency, setFrequency] = useState(formData.frequency);
  const [endDate, setEndDate] = useState<string>(formData.endDate);

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

  function handleSubmit() {
    onSubmit({ creditor, amount, memo, interval, frequency, nextTransferAt, endDate });
  }

  const isRecurring = useMemo(() => Boolean(frequency), [frequency]);

  function onToggleRecurrence(shouldRecur: boolean) {
    setFrequency(shouldRecur ? 1 : 0);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">New Payment</h1>
      <div className="flex flex-col space-y-4">
        <InputField
          label="To"
          type="text"
          placeholder="Public address"
          value={creditor}
          validator={validatePublicAddress}
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
          <InputGroup className="w-1/2">
            <InputLabel title="Mint" className="mt-2" />
            <MintSelect />
          </InputGroup>
          <InputField
            label="Amount"
            type="number"
            placeholder="0.00"
            className="w-1/2"
            value={amount}
            onChange={(v) => setAmount(v)}
          />
        </div>

        <div className="flex space-x-3 items-center w-full">
          <Toggle
            srOnly="Make this recurring"
            enabled={isRecurring}
            onToggle={onToggleRecurrence}
          />
          {isRecurring ? (
            <TransferRateInput
              {...{ endDate, setEndDate, interval, setInterval, frequency, setFrequency }}
            />
          ) : (
            <span className="text-base text-gray-900">Does not repeat</span>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between w-full space-x-3">
        <SecondaryAction className="w-1/2" onClick={onCancel}>
          Cancel
        </SecondaryAction>
        <PrimaryAction className="w-1/2" disabled={!isSubmitEnabled} onClick={handleSubmit}>
          Continue
        </PrimaryAction>
      </div>
    </form>
  );
}

export function validatePublicAddress(val: string) {
  let result: string | null = null;
  try {
    new PublicKey(val);
    result = null;
  } catch (e) {
    result = "Invalid address";
  }
  console.log(result ? `❌ ${result}` : "✅ valid address!");
  debugger;
  return result;
}
