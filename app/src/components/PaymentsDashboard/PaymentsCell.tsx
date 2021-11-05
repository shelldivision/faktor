import { PaymentsFilter } from "@components";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { abbreviate, MINTS } from "@utils";
import { useState } from "react";

export type PaymentCellProps = {
  payment: any;
  currentFilter: PaymentsFilter;
};

export function PaymentCell({ currentFilter, payment }: PaymentCellProps) {
  const [isOpen, setIsOpen] = useState(false);

  console.log(payment.publicKey.toString());

  const amount = (payment.account.amount / LAMPORTS_PER_SOL).toString();
  const nextTransferAt = new Date(payment.account.nextTransferAt.toNumber() * 1000);
  const status = Object.keys(payment.account.status)[0];

  function onClick() {
    setIsOpen(!isOpen);
  }

  return (
    <tr className="text-base transition cursor-pointer hover:bg-gray-50" onClick={() => {}}>
      <td className="w-full px-4 py-3 font-medium text-gray-900">
        <span className="truncate"></span> {payment.account.memo}
      </td>
      <td className="px-4 py-3">
        <span className="flex flex-row w-32 space-x-2">
          <span className="text-gray-700 truncate">{amount}</span>
          <span className="text-gray-700 truncate">wSOL</span>
          <img src={MINTS.WSOL.icon} className="h-3 my-auto" />
        </span>
      </td>
      <td className="px-4 py-3 text-gray-700">
        <span className="flex w-32">
          {currentFilter === PaymentsFilter.Incoming
            ? abbreviate(payment.account.debtor)
            : abbreviate(payment.account.creditor)}
        </span>
      </td>
      <td className="px-4 py-3 text-gray-700">
        <span className="flex w-48">{nextTransferAt.toLocaleString()}</span>
      </td>
      <PaymentStatusColumn status={status} />
    </tr>
  );
}

type PaymentStatusColumnProps = {
  status: string;
};

function PaymentStatusColumn({ status }: PaymentStatusColumnProps) {
  let title = "";
  let tagClassName = "px-2 py-1 my-auto text-sm font-medium truncate rounded";
  switch (status) {
    case "completed":
      title = "Completed";
      tagClassName += " bg-green-100 text-green-600";
      break;
    case "scheduled":
      title = "Scheduled";
      tagClassName += " bg-gray-200 text-gray-700";
      break;
    default:
      break;
  }
  return (
    <td className="px-4">
      <span className={tagClassName}>{title}</span>
    </td>
  );
}
