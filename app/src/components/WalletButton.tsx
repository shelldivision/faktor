import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { abbreviate } from '@utils';

export function WalletButton() {
  const wallet = useAnchorWallet();

  const { setVisible } = useWalletModal();

  function onClickConnectWallet(e: any) {
    e.preventDefault();
    setVisible(true);
  }

  function onClickWallet(e: any) {
    e.preventDefault();
    // TODO
  }

  if (wallet)
    return (
      <button
        className="px-6 py-3 my-auto text-lg font-semibold text-gray-900 transition duration-200 bg-white rounded-full shadow hover:shadow-lg"
        onClick={onClickWallet}
      >
        {abbreviate(wallet.publicKey)}
      </button>
    );
  else
    return (
      <button
        className="px-6 py-3 my-auto text-lg font-semibold text-white transition duration-200 bg-orange-500 rounded-lg shadow hover:shadow-lg"
        onClick={onClickConnectWallet}
      >
        Connect wallet
      </button>
    );
}
