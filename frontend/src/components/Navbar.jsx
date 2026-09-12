import { useWallet } from '../hooks/useWallet';

export default function Navbar() {
  const { address, isCorrectNetwork, connectWallet, disconnectWallet, switchToSepolia } = useWallet();

  const truncate = (addr) => `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;

  // Dynamic styling for address badge based on network validity
  const badgeStyle = {
    background: isCorrectNetwork ? '#e2f0d9' : '#fff3cd',
    color: isCorrectNetwork ? '#2d572c' : '#856404',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '14px',
    border: `1px solid ${isCorrectNetwork ? '#c8e1b9' : '#ffeeba'}`
  };

  return (
    <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 30px', borderBottom: '1px solid #eaeaea', background: '#fff' }}>
      <h2 style={{ margin: 0, fontSize: '20px' }}>🚀 Crowdfunding DApp</h2>
      
      <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
        {address && !isCorrectNetwork && (
          <button 
            onClick={switchToSepolia}
            style={{ background: '#ffc107', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Switch to Sepolia
          </button>
        )}

        {!address ? (
          <button 
            onClick={connectWallet}
            style={{ background: '#007bff', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Connect Wallet
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={badgeStyle}>
              {isCorrectNetwork ? '🟢' : '⚠️'} {truncate(address)}
            </span>
            <button 
              onClick={disconnectWallet}
              style={{ background: '#f8d7da', color: '#721c24', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}