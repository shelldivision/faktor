import { useEffect, useMemo, useState } from "react";
import { useFaktor } from "@components";
import { CashIcon } from "@heroicons/react/solid";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { abbreviate, MINTS } from "@utils";

export enum PaymentsFilter {
  Incoming = "incoming",
  Outgoing = "outgoing"
}

export const PAYMENTS_FILTERS = [PaymentsFilter.Outgoing, PaymentsFilter.Incoming];

export function getPaymentsFilterName(filter: PaymentsFilter) {
  switch (filter) {
    case PaymentsFilter.Incoming:
      return "Incoming";
    case PaymentsFilter.Outgoing:
      return "Outgoing";
    default:
      return "";
  }
}

export type PaymentsTableProps = {
  currentFilter: PaymentsFilter;
};

type PaymentsFeed = {
  incoming: any[];
  outgoing: any[];
};

export function PaymentsTable({ currentFilter }: PaymentsTableProps) {
  // Get Faktor program
  const faktor = useFaktor();

  // Cached data
  const [payments, setPayments] = useState<PaymentsFeed>({
    incoming: [],
    outgoing: []
  });

  const visiblePayments = useMemo(
    () => payments[currentFilter.toString() as keyof typeof payments],
    [payments, currentFilter]
  );

  // Refresh page on load
  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    if (!faktor) return;
    const payments: any = await faktor.account.payment.all();
    const wallet = faktor.provider.wallet;
    setPayments({
      incoming: payments.filter(
        (inv: any) => inv.account.creditor.toString() === wallet.publicKey.toString()
      ),
      outgoing: payments.filter(
        (inv: any) => inv.account.debtor.toString() === wallet.publicKey.toString()
      )
    });
  }

  return (
    <div className="flex flex-col min-w-full overflow-hidden overflow-x-auto">
      {visiblePayments.length > 0 ? (
        <>
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="py-2 space-x-4 text-sm font-medium text-gray-900">
                <th className="tracking-wider">Memo</th>
                <th className="tracking-wider">Memo</th>
                <th className="tracking-wider">Memo</th>
                <th className="tracking-wider">Memo</th>
                <th className="tracking-wider">Memo</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(visiblePayments ?? []).map((payment: any, i: number) => {
                return <PaymentCell key={i} currentFilter={currentFilter} payment={payment} />;
              })}
            </tbody>
          </table>
        </>
      ) : (
        <div className="p-8">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-gray-200 rounded-full">
            <CashIcon className="w-6 h-6 text-gray-500" aria-hidden="true" />
          </div>
          <div className="mt-3 text-center sm:mt-5">
            <h3 className="text-lg font-medium leading-6 text-gray-900">No payments found</h3>
          </div>
        </div>
      )}
    </div>
  );
}

type PaymentCellProps = {
  payment: any;
  currentFilter: PaymentsFilter;
};

function PaymentCell({ currentFilter, payment }: PaymentCellProps) {
  const [isOpen, setIsOpen] = useState(false);

  console.log(payment.publicKey.toString());

  const amount = (payment.account.amount / LAMPORTS_PER_SOL).toString();
  const nextTransferAt = new Date(payment.account.nextTransferAt.toNumber() * 1000);
  const status = Object.keys(payment.account.status)[0];

  function onClick() {
    setIsOpen(!isOpen);
  }

  // border-t border-b

  return (
    <tr
      className={`flex flex-row w-full p-4 space-x-8 hover:bg-gray-50 transition`}
      onClick={onClick}
    >
      <td className="w-full my-auto mr-auto font-medium text-gray-900 truncate">
        {payment.account.memo}
      </td>
      <span className="flex flex-row my-auto space-x-2">
        <td className="my-auto text-gray-500 truncate">{amount}</td>
        <td className="my-auto text-gray-500 truncate">wSOL</td>
        <img src={MINTS.WSOL.icon} className="h-3 my-auto" />
      </span>
      <td className="my-auto text-gray-500 truncate">{abbreviate(payment.account.creditor)}</td>
      <td className="flex flex-row my-auto text-gray-500 truncate">
        {nextTransferAt.toLocaleString()}
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
  let className = "flex flex-row px-3 py-1 my-auto font-medium truncate rounded";
  switch (status) {
    case "completed":
      title = "Completed";
      className += " bg-green-100 text-green-600";
      break;
    case "scheduled":
      title = "Scheduled";
      className += " text-gray-500 text-gray-200";
      break;
    default:
      break;
  }
  return <td className={className}>{title}</td>;
}
