import { Fragment, useEffect, useMemo, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { createPayment, CreatePaymentRequest, FaktorIdl } from "@api";
import { InputStep } from "./InputStep";
import { ConfirmationStep } from "./ConfirmationStep";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { Program } from "@project-serum/anchor";

export enum CreatePaymentStep {
  Input = 0,
  Confirmation = 1
}

// TODO add mint to form data
export type CreatePaymentFormData = {
  creditor: string;
  memo: string;
  amount: string;
};

const DEFAULT_FORM_DATA = {
  creditor: "",
  memo: "",
  amount: ""
};

function isValid(formData: CreatePaymentFormData) {
  try {
    new PublicKey(formData.creditor);
    parseFloat(formData.amount);
    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
}

interface CreatePaymentModalProps {
  open: any;
  setOpen: any;
  faktor: Program<FaktorIdl>;
}

export function CreatePaymentModal({ open, setOpen, faktor }: CreatePaymentModalProps) {
  const [step, setStep] = useState(CreatePaymentStep.Input);
  const [formData, setFormData] = useState<CreatePaymentFormData>(DEFAULT_FORM_DATA);

  const request = useMemo<CreatePaymentRequest | null>(() => {
    if (!isValid(formData)) return null;
    return {
      debtor: faktor.provider.wallet.publicKey,
      creditor: new PublicKey(formData.creditor),
      memo: formData.memo,
      amount: parseFloat(formData.amount) * LAMPORTS_PER_SOL,
      authorizedBalance: parseFloat(formData.amount) * LAMPORTS_PER_SOL,
      recurrenceInterval: 0
    };
  }, [formData]);

  useEffect(() => {
    if (!request) setStep(CreatePaymentStep.Input);
    else setStep(CreatePaymentStep.Confirmation);
  }, [request]);

  function onSubmit(data: CreatePaymentFormData) {
    setFormData(data);
  }

  async function onConfirm() {
    if (!request) return;
    createPayment(faktor, request)
      .then(() => {
        onClose();
        // refresh();
      })
      .catch((error) => {
        console.warn("Failed to create payment: ", error.message);
      });
  }

  function onClose() {
    setOpen(false);
    setFormData(DEFAULT_FORM_DATA);
  }

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="fixed inset-0 z-10 overflow-y-auto" onClose={setOpen}>
        <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block">
          {/* Background overlay */}
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Dialog.Overlay className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" />
          </Transition.Child>

          {/* This element is to trick the browser into centering the modal contents. */}
          <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
            &#8203;
          </span>

          {/* Modal */}
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enterTo="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <div className="inline-block w-full max-w-2xl px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-gray-100 rounded-lg shadow-xl sm:my-8 sm:align-middle sm:p-6">
              <div className="flex items-center my-4 divide-x-2">
                {step === CreatePaymentStep.Input && (
                  <InputStep formData={formData} onCancel={onClose} onSubmit={onSubmit} />
                )}
                {step === CreatePaymentStep.Confirmation && request && (
                  <ConfirmationStep
                    request={request}
                    onBack={() => setStep(step - 1)}
                    onConfirm={onConfirm}
                  />
                )}
              </div>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
