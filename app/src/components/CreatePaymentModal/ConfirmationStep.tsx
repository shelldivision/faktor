import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { CreatePaymentRequest } from "@api";
import { SecondaryAction, PrimaryAction } from "@components";
import React from "react";

export interface ConfirmationStepProps {
  request: CreatePaymentRequest;
  isBusy: boolean;
  onBack: () => void;
  onConfirm: () => void;
}

export function ConfirmationStep({ request, isBusy, onBack, onConfirm }: ConfirmationStepProps) {
  if (!request) return null;
  return (
    <div className="w-full space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Confirm Payment</h1>
      <div className="flex flex-col mt-8 space-y-4">
        <Section>
          <Label>To</Label>
          <Value>{request.creditor.toString()}</Value>
        </Section>
        <Section>
          <Label>Memo</Label>
          <Value>{request.memo}</Value>
        </Section>
        <Section>
          <Label>Amount</Label>
          <Value>{(request.amount ?? 0) / LAMPORTS_PER_SOL} wSOL</Value>
        </Section>
        <Section>
          <Label>Scheduled for</Label>
          <Value>{request.nextTransferAt.toLocaleString()}</Value>
        </Section>
      </div>
      <div className="flex items-center justify-between w-full space-x-3">
        <SecondaryAction onClick={onBack}>Back</SecondaryAction>
        <PrimaryAction disabled={isBusy} onClick={onConfirm}>
          Confirm
        </PrimaryAction>
      </div>
    </div>
  );
}

export function Section({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="flex flex-col w-full px-4 py-2 space-y-1 border border-gray-200 rounded-md">
      {children}
    </div>
  );
}

export function Label({ children }: React.PropsWithChildren<{}>) {
  return <span className="text-sm font-medium text-gray-500">{children}</span>;
}

export function Value({ children }: React.PropsWithChildren<{}>) {
  return <span className="text-base font-medium text-gray-900">{children}</span>;
}
