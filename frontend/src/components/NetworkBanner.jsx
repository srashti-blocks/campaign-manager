import { useWallet } from '../hooks/useWallet';

export default function NetworkBanner() {
  const { address, isCorrectNetwork } = useWallet();

  if (!address || isCorrectNetwork) return null;

  return (
    <div style={{ background: '#fff3cd', color: '#856404', padding: '10px 20px', textAlign: 'center', fontSize: '14px', borderBottom: '1px solid #ffeeba' }}>
      ⚠️ You are connected to the wrong network. Please switch to **Sepolia Testnet** to interact with contracts.
    </div>
  );
}