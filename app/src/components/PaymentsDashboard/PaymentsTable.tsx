import { useEffect, useMemo, useState } from "react";
import { PaymentCell, useFaktor } from "@components";
import { CashIcon } from "@heroicons/react/solid";

export enum PaymentsFilter {
  Incoming = "Incoming",
  Outgoing = "Outgoing"
}

export const PAYMENTS_FILTERS = [PaymentsFilter.Outgoing, PaymentsFilter.Incoming];

export type PaymentsTableProps = {
  currentFilter: PaymentsFilter;
};

export function PaymentsTable({ currentFilter }: PaymentsTableProps) {
  // Get Faktor program
  const faktor = useFaktor();

  // Cached data
  const [payments, setPayments] = useState<Record<string, any[]>>({
    Incoming: [],
    Outgoing: []
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
      Incoming: payments.filter(
        (inv: any) => inv.account.creditor.toString() === wallet.publicKey.toString()
      ),
      Outgoing: payments.filter(
        (inv: any) => inv.account.debtor.toString() === wallet.publicKey.toString()
      )
    });
  }

  return (
    <div className="flex flex-col min-w-full overflow-hidden overflow-x-auto">
      {visiblePayments.length > 0 ? (
        <>
          <table className="min-w-full divide-y divide-gray-200">
            <PaymentsTableHeader currentFilter={currentFilter} />
            <PaymentsTableBody currentFilter={currentFilter} visiblePayments={visiblePayments} />
          </table>
        </>
      ) : (
        <PaymentsTableEmptyPrompt />
      )}
    </div>
  );
}

function PaymentsTableHeader({ currentFilter }: PaymentsTableProps) {
  return (
    <thead>
      <tr className="py-2 text-xs text-left text-gray-900 uppercase ">
        <th className="px-4 py-2 font-semibold">Memo</th>
        <th className="px-4 py-2 font-semibold">Amount</th>
        <th className="px-4 py-2 font-semibold">
          {currentFilter === PaymentsFilter.Incoming ? "From" : "To"}
        </th>
        <th className="px-4 py-2 font-semibold">Date</th>
        <th className="px-4 py-2 font-semibold">Status</th>
      </tr>
    </thead>
  );
}

export type PaymentsTableBodyProps = {
  currentFilter: PaymentsFilter;
  visiblePayments: any[];
};

function PaymentsTableBody({ currentFilter, visiblePayments }: PaymentsTableBodyProps) {
  return (
    <tbody className="bg-white divide-y divide-gray-200">
      {(visiblePayments ?? []).map((payment: any, i: number) => {
        return <PaymentCell key={i} currentFilter={currentFilter} payment={payment} />;
      })}
    </tbody>
  );
}

function PaymentsTableEmptyPrompt() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-center w-12 h-12 mx-auto bg-gray-200 rounded-full">
        <CashIcon className="w-6 h-6 text-gray-500" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-base font-medium text-center text-gray-900">No payments found</h3>
    </div>
  );
}
