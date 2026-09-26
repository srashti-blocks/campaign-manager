import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ethers } from 'ethers';
import { useWallet } from '../hooks/useWallet';
import CrowdfundingArtifact from '../Crowdfunding.json';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;

/**
 * CONTRACT-FIRST TYPING REFERENCE (Exact match to api.py):
 * 
 * class CampaignResponse(BaseModel):
 *     campaign_id: str
 *     creator: str
 *     goal_amount: str
 *     total_pledged: str
 *     deadline: int
 *     is_successful: bool
 *     withdrawn: bool
 *     metadata_uri: Optional[str] = None
 *     created_at_block: int
 *     transaction_hash: str
 * 
 * class PledgeResponse(BaseModel):
 *     backer: str
 *     amount: str
 *     refunded: bool
 *     created_at_block: int
 *     transaction_hash: str
 * 
 * class CampaignDetailResponse(BaseModel):
 *     campaign: CampaignResponse
 *     pledges: List[PledgeResponse]
 */

export default function CampaignDetail() {
  const { id } = useParams();
  const { address, signer, isCorrectNetwork, switchToSepolia } = useWallet();

  const [campaign, setCampaign] = useState(null);
  const [pledges, setPledges] = useState([]);
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [pledgeAmount, setPledgeAmount] = useState('');
  const [pledging, setPledging] = useState(false);
  const [pledgeError, setPledgeError] = useState(null);
  const [pledgeSuccess, setPledgeSuccess] = useState(null);

  const [refunding, setRefunding] = useState(false);
  const [refundError, setRefundError] = useState(null);
  const [refundSuccess, setRefundSuccess] = useState(null);

  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState(null);

  // Stable fetch function depending only on id
  const fetchCampaignDetail = useCallback(async (signal) => {
    setError(null);

    try {
      const response = await fetch(`http://127.0.0.1:8000/campaigns/${id}`, { signal });

      if (!response.ok) {
        throw new Error(`Campaign not found or server error (${response.status})`);
      }

      const data = await response.json();
      
      setCampaign(data.campaign);
      setPledges(data.pledges || []);

      if (data.campaign.metadata_uri) {
        let metaUri = data.campaign.metadata_uri;
        
        if (metaUri.startsWith("ipfs://")) {
          const hash = metaUri.replace("ipfs://", "");
          if (hash.length > 4) {
            metaUri = `https://cloudflare-ipfs.com/ipfs/${hash}`;
          } else {
            setMetadata({ title: `Campaign #${data.campaign.campaign_id}`, description: "Mock/Test Metadata URI." });
            metaUri = null;
          }
        }

        if (metaUri && (metaUri.startsWith("http://") || metaUri.startsWith("https://"))) {
          try {
            const metaRes = await fetch(metaUri, { signal });
            if (metaRes.ok) {
              const metaData = await metaRes.json();
              setMetadata(metaData);
            } else {
              setMetadata({ title: `Campaign #${data.campaign.campaign_id}`, description: "Metadata failed to load." });
            }
          } catch (ipfsErr) {
            console.warn("Could not fetch metadata from gateway:", ipfsErr);
            setMetadata({ title: `Campaign #${data.campaign.campaign_id}`, description: "Metadata unavailable." });
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.message || 'Failed to load campaign details');
    }
  }, [id]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetchCampaignDetail(controller.signal).finally(() => setLoading(false));
    return () => controller.abort();
  }, [fetchCampaignDetail]);

  // Computed check for whether the connected wallet can claim a refund
  const userHasRefundablePledge = useMemo(() => {
    if (!campaign || !address || !pledges) return false;
    const deadlinePassed = Math.floor(Date.now() / 1000) >= campaign.deadline;
    const failed = !campaign.is_successful;
    
    const unrefundedSum = pledges
      .filter(p => p.backer.toLowerCase() === address.toLowerCase() && !p.refunded)
      .reduce((acc, p) => acc + BigInt(p.amount), 0n);

    return deadlinePassed && failed && unrefundedSum > 0n;
  }, [campaign, address, pledges]);

  // Computed check for whether the connected wallet is the creator and can withdraw funds
  const canWithdraw = useMemo(() => {
    if (!campaign || !address) return false;
    const isCreator = campaign.creator.toLowerCase() === address.toLowerCase();
    const deadlinePassed = Math.floor(Date.now() / 1000) >= campaign.deadline;
    return isCreator && campaign.is_successful && deadlinePassed && !campaign.withdrawn;
  }, [campaign, address]);

  const handlePledge = async (e) => {
    e.preventDefault();
    setPledgeError(null);
    setPledgeSuccess(null);

    if (!address) {
      alert("Please connect your wallet first.");
      return;
    }

    if (!isCorrectNetwork) {
      await switchToSepolia();
      return;
    }

    if (!id || isNaN(Number(id))) {
      setPledgeError("Invalid campaign ID format.");
      return;
    }

    if (campaign) {
      const now = Math.floor(Date.now() / 1000);
      if (campaign.deadline && now >= campaign.deadline) {
        setPledgeError("This campaign has ended. Pledges are closed.");
        return;
      }
      if (campaign.is_successful) {
        setPledgeError("This campaign has already reached its goal and is successful.");
        return;
      }
    }

    if (!pledgeAmount || Number(pledgeAmount) <= 0) {
      setPledgeError("Please enter a valid amount greater than 0 ETH.");
      return;
    }

    try {
      setPledging(true);
      
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CrowdfundingArtifact.abi || CrowdfundingArtifact,
        signer
      );

      const valueInWei = ethers.parseEther(pledgeAmount);
      const tx = await contract.pledge(BigInt(id), { value: valueInWei });
      
      setPledgeSuccess(
        <span>
          Transaction submitted! View on{' '}
          <a 
            href={`https://sepolia.etherscan.io/tx/${tx.hash}`} 
            target="_blank" 
            rel="noreferrer"
            style={{ color: '#155724', fontWeight: 'bold', textDecoration: 'underline' }}
          >
            Etherscan ({tx.hash.substring(0, 10)}...)
          </a>
        </span>
      );

      await tx.wait();
      setPledgeSuccess(
        <span>
          🎉 Pledge confirmed successfully on Sepolia!{' '}
          <a 
            href={`https://sepolia.etherscan.io/tx/${tx.hash}`} 
            target="_blank" 
            rel="noreferrer"
            style={{ color: '#155724', fontWeight: 'bold', textDecoration: 'underline' }}
          >
            Check receipt
          </a>
        </span>
      );
      setPledgeAmount('');
      
      // Refetch fresh campaign data & indexer updates
      await fetchCampaignDetail();
      
    } catch (err) {
      console.error("Pledge failed:", err);
      setPledgeError(err.reason || err.message || "Transaction failed.");
    } finally {
      setPledging(false);
    }
  };

  const handleRefund = async () => {
    setRefundError(null);
    setRefundSuccess(null);

    if (!address) {
      alert("Please connect your wallet first.");
      return;
    }

    if (!isCorrectNetwork) {
      await switchToSepolia();
      return;
    }

    try {
      setRefunding(true);
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CrowdfundingArtifact.abi || CrowdfundingArtifact,
        signer
      );

      const tx = await contract.refund(BigInt(id));
      setRefundSuccess(
        <span>
          Refund transaction submitted!{' '}
          <a href={`https://sepolia.etherscan.io/tx/${tx.hash}`} target="_blank" rel="noreferrer" style={{ color: '#155724', fontWeight: 'bold', textDecoration: 'underline' }}>
            View on Etherscan
          </a>
        </span>
      );
      
      await tx.wait();
      setRefundSuccess(
        <span>
          🎉 Refund confirmed on-chain!{' '}
          <a href={`https://sepolia.etherscan.io/tx/${tx.hash}`} target="_blank" rel="noreferrer" style={{ color: '#155724', fontWeight: 'bold', textDecoration: 'underline' }}>
            View on Etherscan
          </a>
        </span>
      );

      // Refetch fresh campaign data & indexer updates
      await fetchCampaignDetail();

    } catch (err) {
      console.error("Refund failed:", err);
      setRefundError(err.reason || err.message || "Refund transaction failed.");
    } finally {
      setRefunding(false);
    }
  };

  const handleWithdraw = async () => {
    setWithdrawError(null);
    setWithdrawSuccess(null);

    if (!address) {
      alert("Please connect your wallet first.");
      return;
    }

    if (!isCorrectNetwork) {
      await switchToSepolia();
      return;
    }

    try {
      setWithdrawing(true);
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CrowdfundingArtifact.abi || CrowdfundingArtifact,
        signer
      );

      const tx = await contract.withdraw(BigInt(id));
      setWithdrawSuccess(
        <span>
          Withdrawal transaction submitted!{' '}
          <a href={`https://sepolia.etherscan.io/tx/${tx.hash}`} target="_blank" rel="noreferrer" style={{ color: '#155724', fontWeight: 'bold', textDecoration: 'underline' }}>
            View on Etherscan
          </a>
        </span>
      );

      await tx.wait();
      const withdrawnEth = ethers.formatEther(campaign.total_pledged);
      setWithdrawSuccess(
        <span>
          🎉 Successfully withdrew {withdrawnEth} ETH!{' '}
          <a href={`https://sepolia.etherscan.io/tx/${tx.hash}`} target="_blank" rel="noreferrer" style={{ color: '#155724', fontWeight: 'bold', textDecoration: 'underline' }}>
            Check receipt
          </a>
        </span>
      );

      // Refetch fresh campaign data & indexer updates
      await fetchCampaignDetail();

    } catch (err) {
      console.error("Withdrawal failed:", err);
      setWithdrawError(err.reason || err.message || "Withdrawal transaction failed.");
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#6c757d' }}>⏳ Loading campaign details...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '20px', background: '#f8d7da', color: '#721c24', borderRadius: '6px', marginTop: '20px' }}>
        <p><strong>Error:</strong> {error}</p>
        <Link to="/" style={{ color: '#721c24', fontWeight: 'bold' }}>← Back to Campaigns</Link>
      </div>
    );
  }

  if (!campaign) return <div>No campaign data available.</div>;

  const totalEth = campaign ? ethers.formatEther(campaign.total_pledged) : '0';
  const goalEth = campaign ? ethers.formatEther(campaign.goal_amount) : '0';
  const progressPercent = campaign ? Math.min(100, Math.round((Number(totalEth) / Number(goalEth)) * 100)) : 0;

  return (
    <div style={{ marginTop: '20px' }}>
      <Link to="/" style={{ color: '#007bff', textDecoration: 'none', fontSize: '14px' }}>← Back to All Campaigns</Link>

      <div style={{ background: '#fff', padding: '30px', borderRadius: '8px', border: '1px solid #eaeaea', marginTop: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: '0 0 5px 0' }}>{metadata?.title || `Campaign #${campaign.campaign_id}`}</h2>
            <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>
              Created by: <code>{campaign.creator}</code>
            </p>
          </div>
          <span style={{ fontSize: '13px', background: campaign.is_successful ? '#e2f0d9' : '#fff3cd', color: campaign.is_successful ? '#2d572c' : '#856404', padding: '6px 12px', borderRadius: '4px', fontWeight: 'bold' }}>
            {campaign.is_successful ? 'Successful 🎯' : 'Active 🚀'}
          </span>
        </div>

        {metadata?.description && (
          <p style={{ marginTop: '20px', color: '#444', lineHeight: '1.5' }}>
            {metadata.description}
          </p>
        )}

        <div style={{ margin: '30px 0', background: '#f8f9fa', padding: '20px', borderRadius: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '16px' }}>
            <span>Raised: <strong>{totalEth} ETH</strong></span>
            <span>Goal: <strong>{goalEth} ETH</strong></span>
          </div>
          <div style={{ background: '#e9ecef', borderRadius: '4px', height: '12px', overflow: 'hidden' }}>
            <div style={{ width: `${progressPercent}%`, background: '#28a745', height: '100%', transition: 'width 0.3s ease' }} />
          </div>
          <p style={{ textAlign: 'right', fontSize: '13px', color: '#6c757d', marginTop: '6px' }}>{progressPercent}% funded</p>
        </div>

        {/* Three-Way Mutually Exclusive Action Area: Withdraw vs Refund vs Pledge Form */}
        {canWithdraw ? (
          <div style={{ background: '#e2f0d9', border: '1px solid #c3e6cb', padding: '20px', borderRadius: '8px', marginTop: '20px' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#155724' }}>Campaign Successful & Expired</h3>
            <p style={{ fontSize: '14px', color: '#155724', marginBottom: '15px' }}>
              Congratulations! Your campaign reached its goal and the deadline has passed. You can now withdraw all raised funds ({totalEth} ETH).
            </p>

            {withdrawError && (
              <div style={{ background: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '4px', marginBottom: '10px', fontSize: '14px' }}>
                <strong>Error:</strong> {withdrawError}
              </div>
            )}

            {withdrawSuccess && (
              <div style={{ background: '#d4edda', color: '#155724', padding: '10px', borderRadius: '4px', marginBottom: '10px', fontSize: '14px' }}>
                {withdrawSuccess}
              </div>
            )}

            <button
              onClick={handleWithdraw}
              disabled={withdrawing}
              style={{
                width: '100%',
                padding: '12px',
                background: withdrawing ? '#6c757d' : '#28a745',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 'bold',
                cursor: withdrawing ? 'not-allowed' : 'pointer'
              }}
            >
              {withdrawing ? 'Processing Withdrawal...' : `Withdraw Funds (${totalEth} ETH)`}
            </button>
          </div>
        ) : userHasRefundablePledge ? (
          <div style={{ background: '#fff3cd', border: '1px solid #ffeeba', padding: '20px', borderRadius: '8px', marginTop: '20px' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#856404' }}>Campaign Expired & Failed</h3>
            <p style={{ fontSize: '14px', color: '#664d03', marginBottom: '15px' }}>
              This campaign did not reach its goal before the deadline. You are eligible to reclaim your pledged funds.
            </p>

            {refundError && (
              <div style={{ background: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '4px', marginBottom: '10px', fontSize: '14px' }}>
                <strong>Error:</strong> {refundError}
              </div>
            )}

            {refundSuccess && (
              <div style={{ background: '#d4edda', color: '#155724', padding: '10px', borderRadius: '4px', marginBottom: '10px', fontSize: '14px' }}>
                {refundSuccess}
              </div>
            )}

            <button
              onClick={handleRefund}
              disabled={refunding}
              style={{
                width: '100%',
                padding: '12px',
                background: refunding ? '#6c757d' : '#ffc107',
                color: '#212529',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 'bold',
                cursor: refunding ? 'not-allowed' : 'pointer'
              }}
            >
              {refunding ? 'Processing Refund...' : 'Reclaim Your Pledge (Refund)'}
            </button>
          </div>
        ) : (
          <div style={{ borderTop: '1px solid #eaeaea', paddingTop: '20px', marginTop: '20px' }}>
            <h3>Back this Campaign</h3>
            
            {!address ? (
              <p style={{ color: '#dc3545', fontSize: '14px' }}>Please connect your wallet using the top navigation to submit a pledge.</p>
            ) : (
              <form onSubmit={handlePledge} style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '5px', fontWeight: 'bold' }}>Pledge Amount (ETH):</label>
                  <input 
                    type="number" 
                    step="0.001" 
                    min="0.0001"
                    value={pledgeAmount}
                    onChange={(e) => setPledgeAmount(e.target.value)}
                    placeholder="0.1" 
                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                  />
                </div>

                {pledgeError && <div style={{ color: '#721c24', background: '#f8d7da', padding: '10px', borderRadius: '4px', fontSize: '13px' }}>{pledgeError}</div>}
                {pledgeSuccess && <div style={{ color: '#155724', background: '#d4edda', padding: '10px', borderRadius: '4px', fontSize: '13px' }}>{pledgeSuccess}</div>}

                <button 
                  type="submit" 
                  disabled={pledging}
                  style={{ background: '#28a745', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold', cursor: pledging ? 'not-allowed' : 'pointer' }}
                >
                  {pledging ? 'Submitting Transaction...' : 'Pledge ETH'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Pledges List Section */}
        <div style={{ borderTop: '1px solid #eaeaea', marginTop: '30px', paddingTop: '20px' }}>
          <h3>Pledges History ({pledges.length})</h3>
          {pledges.length === 0 ? (
            <p style={{ color: '#666', fontSize: '14px' }}>No pledges recorded yet. Be the first to back this campaign!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
              {pledges.map((p, index) => (
                <div key={index} style={{ background: '#fcfcfc', padding: '12px 15px', borderRadius: '6px', border: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
                  <div>
                    <span style={{ fontFamily: 'monospace', color: '#333' }}>{p.backer.substring(0, 6)}...{p.backer.substring(p.backer.length - 4)}</span>
                    <span style={{ color: '#888', marginLeft: '10px', fontSize: '12px' }}>Block #{p.created_at_block}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {p.refunded && (
                      <span style={{ background: '#f8d7da', color: '#721c24', fontSize: '11px', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                        Refunded
                      </span>
                    )}
                    <strong>{ethers.formatEther(p.amount)} ETH</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}