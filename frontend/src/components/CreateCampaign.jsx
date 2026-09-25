import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ethers } from 'ethers';
import { useWallet } from '../hooks/useWallet';
import CrowdfundingArtifact from '../Crowdfunding.json';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;

export default function CreateCampaign() {
  const navigate = useNavigate();
  const { address, signer, isCorrectNetwork, switchToSepolia } = useWallet();

  const [goalAmount, setGoalAmount] = useState('');
  const minValidDate = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().slice(0, 16);
  const [deadlineDate, setDeadlineDate] = useState('');
  const [metadataURI, setMetadataURI] = useState('');

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!address) {
      setError("Please connect your wallet first.");
      return;
    }

    if (!isCorrectNetwork) {
      setError("Wrong network detected. Please switch to Sepolia testnet.");
      await switchToSepolia();
      return;
    }

    if (!goalAmount || Number(goalAmount) <= 0) {
      setError("Please enter a valid goal amount greater than 0 ETH.");
      return;
    }

    if (!deadlineDate) {
      setError("Please select a valid deadline date.");
      return;
    }

    const selectedTimestamp = Math.floor(new Date(deadlineDate).getTime() / 1000);
    const now = Math.floor(Date.now() / 1000);
    const minBufferSeconds = 48 * 60 * 60;

    if (selectedTimestamp <= now + minBufferSeconds) {
      setError("Campaign deadline must be at least 48 hours in the future.");
      return;
    }

    if (!metadataURI || metadataURI.trim() === '') {
      setError("Metadata URI cannot be empty.");
      return;
    }

    try {
      setCreating(true);

      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CrowdfundingArtifact.abi || CrowdfundingArtifact,
        signer
      );

      const goalInWei = ethers.parseEther(goalAmount);
      const tx = await contract.createCampaign(goalInWei, BigInt(selectedTimestamp), metadataURI.trim());

      setSuccess(
        <span>
          Deployment submitted! Waiting for confirmation on{' '}
          <a 
            href={`https://sepolia.etherscan.io/tx/${tx.hash}`} 
            target="_blank" 
            rel="noreferrer"
            style={{ color: '#155724', fontWeight: 'bold', textDecoration: 'underline' }}
          >
            Etherscan
          </a>...
        </span>
      );

      const receipt = await tx.wait();

      const event = receipt.logs
        .map((log) => {
          try {
            return contract.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((parsed) => parsed?.name === 'CampaignCreated');

      if (!event) {
        throw new Error("Transaction confirmed, but CampaignCreated event could not be parsed from receipt logs.");
      }

      const newCampaignId = event.args.campaignId.toString();

      setSuccess(
        <span>
          🎉 Campaign created successfully! Redirecting to campaign #{newCampaignId}...
        </span>
      );

      setTimeout(() => {
        navigate(`/campaign/${newCampaignId}`);
      }, 1500);

    } catch (err) {
      console.error("Campaign creation failed:", err);
      setError(err.reason || err.message || "Transaction failed.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <Link to="/" style={{ color: '#007bff', textDecoration: 'none', fontSize: '14px' }}>← Back to All Campaigns</Link>

      <div style={{ background: '#fff', padding: '30px', borderRadius: '8px', border: '1px solid #eaeaea', marginTop: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
        <h2>Create a New Campaign</h2>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
          Deploy a fresh campaign contract state onto Sepolia.
        </p>

        {!address ? (
          <div style={{ background: '#fff3cd', color: '#856404', padding: '12px', borderRadius: '6px', fontSize: '14px' }}>
            Please connect your wallet using the top navigation bar to create a campaign.
          </div>
        ) : (
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', fontWeight: 'bold' }}>Goal Amount (ETH):</label>
              <input 
                type="number" 
                step="0.001" 
                min="0.0001"
                value={goalAmount}
                onChange={(e) => setGoalAmount(e.target.value)}
                placeholder="1.5" 
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', fontWeight: 'bold' }}>Deadline (Min 48 hours from now):</label>
              <input 
                type="datetime-local" 
                min={minValidDate}
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', fontWeight: 'bold' }}>Metadata URI (JSON URL):</label>
              <input 
                type="text" 
                value={metadataURI}
                onChange={(e) => setMetadataURI(e.target.value)}
                placeholder="https://raw.githubusercontent.com/.../metadata.json" 
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
              />
            </div>

            {error && <div style={{ color: '#721c24', background: '#f8d7da', padding: '12px', borderRadius: '6px', fontSize: '13px' }}>{error}</div>}
            {success && <div style={{ color: '#155724', background: '#d4edda', padding: '12px', borderRadius: '6px', fontSize: '13px' }}>{success}</div>}

            <button 
              type="submit" 
              disabled={creating}
              style={{ background: '#007bff', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold', cursor: creating ? 'not-allowed' : 'pointer', marginTop: '10px' }}
            >
              {creating ? 'Submitting Deployment...' : 'Create Campaign'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}