import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { CreatePaymentRequest } from "@api";
import { SecondaryAction, PrimaryAction } from "@components";
import React from "react";

export interface ConfirmationStepProps {
  request: CreatePaymentRequest;
  onBack: () => void;
  onConfirm: () => void;
}

export function ConfirmationStep({ request, onBack, onConfirm }: ConfirmationStepProps) {
  if (!request) return null;
  return (
    <div className="w-full bg-gray-50">
      <h1 className="copy-title">Confirm Payment</h1>
      <div className="flex flex-col mt-8 space-y-4">
        <Section>
          <Label>Receiver</Label>
          <Value>{request.creditor.toString()}</Value>
        </Section>
        <Section>
          <Label>Balance</Label>
          <Value>{(request.amount ?? 0) / LAMPORTS_PER_SOL} SOL</Value>
        </Section>
        <Section>
          <Label>Memo</Label>
          <Value>{request.memo}</Value>
        </Section>
      </div>
      <div className="flex items-center justify-between w-full mt-8 space-x-3">
        <SecondaryAction className="w-1/2" onClick={onBack}>
          Back
        </SecondaryAction>
        <PrimaryAction className="w-1/2" onClick={onConfirm}>
          Confirm
        </PrimaryAction>
      </div>
    </div>
  );
}

export function Section({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="flex flex-col justify-center border border-gray-200 rounded-md px-3 py-2 w-full space-y-0.5">
      {children}
    </div>
  );
}

export function Label({ children }: React.PropsWithChildren<{}>) {
  return <span className="mb-2 font-medium text-gray-500">{children}</span>;
}

export function Value({ children }: React.PropsWithChildren<{}>) {
  return <span className="text-lg font-semibold text-gray-800">{children}</span>;
}
