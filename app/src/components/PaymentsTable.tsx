import { useFaktor } from "@components";
import { CashIcon } from "@heroicons/react/solid";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { abbreviate, MINTS } from "@utils";
import { useEffect, useMemo, useState } from "react";

export type PaymentsTableProps = {
  currentTab: string;
};

type PaymentsFeed = {
  incoming: any[];
  outgoing: any[];
};

export function PaymentsTable({ currentTab }: PaymentsTableProps) {
  // Get Faktor program
  const faktor = useFaktor();

  // Cached data
  const [payments, setPayments] = useState<PaymentsFeed>({
    incoming: [],
    outgoing: []
  });

  const visiblePayments = useMemo(
    () => payments[currentTab.toString() as keyof typeof payments],
    [payments, currentTab]
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
    <div className="flex flex-col min-w-full overflow-hidden overflow-x-auto bg-white rounded-lg shadow">
      {visiblePayments.length > 0 ? (
        <>
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase bg-gray-50">
                  Memo
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase bg-gray-50">
                  To
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase bg-gray-50">
                  From
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase bg-gray-50">
                  Amount
                </th>
                {currentTab === "Payables" && (
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase bg-gray-50"></th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(visiblePayments ?? []).map((payment: any, i: number) => {
                const amount = (payment.account.amount / LAMPORTS_PER_SOL).toString();
                console.log("Payment: ", payment.publicKey.toString());

                return (
                  <tr key={i} className="bg-white">
                    <td className="w-full px-6 py-4 text-sm text-gray-900 max-w-0 whitespace-nowrap">
                      <p className="text-gray-500 truncate group-hover:text-gray-900">
                        {payment.account.memo}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-500 whitespace-nowrap">
                      <span>{abbreviate(payment.account.creditor)}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-500 whitespace-nowrap">
                      <span>{abbreviate(payment.account.debtor)}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-500 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <span className="font-medium text-gray-900">{amount}</span>
                        <div className="flex items-center">
                          SOL
                          <img src={MINTS.WSOL.icon} className="h-4 ml-2" />
                        </div>
                      </div>
                    </td>
                    {currentTab === "Payables" && (
                      <td className="px-6 py-4 text-sm text-right text-gray-500 whitespace-nowrap">
                        <button
                          onClick={() => {}}
                          type="button"
                          className="inline-flex items-center px-3 py-2 text-sm font-medium leading-4 text-white bg-green-600 rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                          Pay
                        </button>
                      </td>
                    )}
                  </tr>
                );
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
