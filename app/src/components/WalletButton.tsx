import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { abbreviate } from "@utils";

export function WalletButton() {
  const wallet = useAnchorWallet();

  function onClick(e: any) {
    e.preventDefault();
    // TODO
  }

  if (!wallet) return null;
  return (
    <button
      className="flex flex-row px-3 py-2 my-auto space-x-2 text-base font-semibold text-gray-900 transition duration-200 bg-gray-200 rounded-full hover:bg-gray-900 hover:text-white"
      onClick={onClick}
    >
      <span className="w-6 h-6 my-auto bg-white rounded-full" />
      <span className="my-auto">{abbreviate(wallet.publicKey)}</span>
    </button>
  );
}
