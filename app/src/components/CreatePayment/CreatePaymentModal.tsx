import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { createPayment, CreatePaymentRequest } from "@api";
import { InputStep } from "./InputStep";
import { ConfirmationStep } from "./ConfirmationStep";
import { useWeb3 } from "@components";

export enum CreatePaymentStep {
  Input = 0,
  Confirmation = 1
}

interface CreatePaymentModalProps {
  open: any;
  setOpen: any;
  refresh: () => void;
}

export function CreatePaymentModal({ open, setOpen, refresh }: CreatePaymentModalProps) {
  const { faktor, provider, wallet } = useWeb3();

  const [step, setStep] = useState(CreatePaymentStep.Input);
  const [request, setRequest] = useState<CreatePaymentRequest>({
    debtor: provider.wallet.publicKey
  });

  const onSubmit = (data: CreatePaymentRequest) => {
    setRequest({
      creditor: data.creditor,
      balance: data.balance,
      memo: data.memo,
      ...request
    });
    setStep(CreatePaymentStep.Confirmation);
  };

  const onConfirm = async () => {
    if (!wallet) return;
    createPayment(faktor, request)
      .then(() => {
        onClose();
        refresh();
      })
      .catch((error) => {
        console.warn("Failed to issue invoice: ", error.message);
      });
  };

  const onClose = () => {
    setOpen(false);
    setStep(CreatePaymentStep.Input);
    setRequest({
      debtor: provider.wallet.publicKey
    });
  };

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
                  <InputStep request={request} onCancel={onClose} onSubmit={onSubmit} />
                )}
                {step === CreatePaymentStep.Confirmation && (
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
