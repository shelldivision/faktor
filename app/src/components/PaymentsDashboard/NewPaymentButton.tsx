import { Icon, IconName } from "@components";

import { PlusIcon } from "@heroicons/react/solid";

export function NewPaymentButton({ showModal }: { showModal: () => void }) {
  return (
    <button
      onClick={showModal}
      type="button"
      className="flex flex-row px-4 py-2 space-x-1 text-base font-semibold text-white transition bg-orange-500 rounded hover:bg-gray-900"
    >
      {/* <Icon name={IconName.Plus} className="w-4 h-4 my-auto" /> */}
      <PlusIcon className="w-5 h-5 my-auto" aria-hidden="true" />
      {/* <CashIcon className="w-6 h-6 text-gray-500" aria-hidden="true" /> */}
      <span>New Payment</span>
    </button>
  );
}
