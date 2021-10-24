import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useState } from "react";
import { Program, Provider } from "@project-serum/anchor";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { createCashflow, CreateCashflowRequest } from "src/api";
import { InputStep } from "./InputStep";
import { ConfirmationStep } from "./ConfirmationStep";

export enum CreateCashflowStep {
  Input = 0,
  Confirmation = 1,
}

interface CreateCashflowModalProps {
  open: any;
  setOpen: any;
  refresh: () => void;
  provider: Provider;
  program: Program;
}

export function CreateCashflowModal({
  open,
  setOpen,
  refresh,
  provider,
  program,
}: CreateCashflowModalProps) {
  const wallet = useAnchorWallet();
  const [step, setStep] = useState(CreateCashflowStep.Input);
  const [request, setRequest] = useState<CreateCashflowRequest | null>(
    wallet
      ? {
          program,
          sender: provider.wallet.publicKey,
        }
      : null
  );

  const onSubmit = (data: CreateCashflowRequest) => {
    setRequest({
      receiver: data.receiver,
      balance: data.balance,
      memo: data.memo,
      ...request,
    });
    setStep(CreateCashflowStep.Confirmation);
  };

  const onConfirm = async () => {
    if (!wallet) return;
    createCashflow(request)
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
    setStep(CreateCashflowStep.Input);
    setRequest({
      program,
      sender: provider.wallet.publicKey,
    });
  };

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog
        as="div"
        className="fixed inset-0 z-10 overflow-y-auto"
        onClose={setOpen}
      >
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
          <span
            className="hidden sm:inline-block sm:align-middle sm:h-screen"
            aria-hidden="true"
          >
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
            <div className="inline-block w-full max-w-2xl px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform rounded-lg shadow-xl bg-gray-50 sm:my-8 sm:align-middle sm:p-6">
              <div className="flex items-center my-4 divide-x-2">
                {step === CreateCashflowStep.Input && (
                  <InputStep
                    request={request}
                    onCancel={onClose}
                    onSubmit={onSubmit}
                  />
                )}
                {step === CreateCashflowStep.Confirmation && (
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
