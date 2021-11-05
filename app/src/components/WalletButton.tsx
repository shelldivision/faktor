import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { abbreviate } from "@utils";
import UserImg from "@components/user-solid.svg";
import { Icon, IconName } from "@components";

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
      <Icon name={IconName.User} className="w-4 h-4 my-auto ml-1" />
      <span className="my-auto">{abbreviate(wallet.publicKey)}</span>
    </button>
  );
}
