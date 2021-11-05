import { Icon, IconName } from "@components";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

export function ConnectWalletPrompt() {
  const { setVisible } = useWalletModal();

  function onClickConnectWallet(e: any) {
    e.preventDefault();
    setVisible(true);
  }

  return (
    <div className="flex flex-col py-32 mx-auto space-y-8">
      <img className="mx-auto max-h-40" src="/png/graphic/wallet.png" />
      <button
        className="flex flex-row px-4 py-2 mx-auto space-x-2 text-base font-semibold text-white transition duration-200 bg-orange-500 rounded hover:bg-gray-900"
        onClick={onClickConnectWallet}
      >
        <Icon name={IconName.Wallet} className="w-4 h-4 my-auto" />
        <span>Connect wallet</span>
      </button>
    </div>
  );
}
