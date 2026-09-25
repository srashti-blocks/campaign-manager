import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Link } from 'react-router-dom';

export default function CampaignList() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Pure pagination state
  const [pagination, setPagination] = useState({
    skip: 0,
    limit: 5,
    total: 0
  });

  // Isolated refetch signal state
  const [retryTrigger, setRetryTrigger] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    
    const fetchCampaigns = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `http://127.0.0.1:8000/campaigns?skip=${pagination.skip}&limit=${pagination.limit}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(`Server returned status ${response.status}`);
        }

        const data = await response.json();
        setCampaigns(data.campaigns);
        setPagination(prev => ({ ...prev, total: data.total }));
      } catch (err) {
        if (err.name === 'AbortError') {
          return;
        }
        setError(err.message || 'Failed to fetch campaigns');
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();

    return () => controller.abort();
  }, [pagination.skip, pagination.limit, retryTrigger]);

  const handleNext = () => {
    if (pagination.skip + pagination.limit < pagination.total) {
      setPagination(prev => ({ ...prev, skip: prev.skip + prev.limit }));
    }
  };

  const handlePrev = () => {
    if (pagination.skip > 0) {
      setPagination(prev => ({ ...prev, skip: Math.max(0, prev.skip - prev.limit) }));
    }
  };

  const handleRetry = () => {
    setRetryTrigger(prev => prev + 1);
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <h2>Active Campaigns</h2>

      {loading && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#6c757d' }}>
          <p>⏳ Loading campaigns from indexer...</p>
        </div>
      )}

      {!loading && error && (
        <div style={{ background: '#f8d7da', color: '#721c24', padding: '15px', borderRadius: '6px', border: '1px solid #f5c6cb' }}>
          <p><strong>Error loading data:</strong> {error}</p>
          <button 
            onClick={handleRetry} 
            style={{ marginTop: '10px', background: '#721c24', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && campaigns.length === 0 && (
        <div style={{ background: '#e2e3e5', color: '#383d41', padding: '30px', textAlign: 'center', borderRadius: '6px' }}>
          <p>📭 No active crowdfunding campaigns found.</p>
          <p style={{ fontSize: '14px', color: '#6c757d' }}>Be the first creator to deploy and index a campaign!</p>
        </div>
      )}

      {!loading && !error && campaigns.length > 0 && (
        <>
          <div style={{ display: 'grid', gap: '15px', marginTop: '15px' }}>
            {campaigns.map((c) => {
              const totalEth = ethers.formatEther(c.total_pledged);
              const goalEth = ethers.formatEther(c.goal_amount);
              const progressPercent = Math.min(100, Math.round((Number(totalEth) / Number(goalEth)) * 100));

              return (
                <div key={c.campaign_id} style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #eaeaea', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
  <h3 style={{ margin: '0 0 10px 0' }}>
    <Link to={`/campaign/${c.campaign_id}`} style={{ color: '#007bff', textDecoration: 'none' }}>
      Campaign #{c.campaign_id}
    </Link>
  </h3>
  <span style={{ fontSize: '12px', background: c.is_successful ? '#e2f0d9' : '#fff3cd', color: c.is_successful ? '#2d572c' : '#856404', padding: '4px 8px', borderRadius: '4px' }}>
    {c.is_successful ? 'Successful' : 'Active'}
  </span>
</div>
                  <p style={{ margin: '5px 0', fontSize: '14px', color: '#555' }}>
                    <strong>Creator:</strong> {c.creator}
                  </p>
                  <div style={{ margin: '15px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '5px' }}>
                      <span>Raised: <strong>{totalEth} ETH</strong></span>
                      <span>Goal: <strong>{goalEth} ETH</strong></span>
                    </div>
                    <div style={{ background: '#e9ecef', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                      <div style={{ width: `${progressPercent}%`, background: '#28a745', height: '100%', transition: 'width 0.3s ease' }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
            <button 
              onClick={handlePrev} 
              disabled={pagination.skip === 0}
              style={{ padding: '8px 16px', background: pagination.skip === 0 ? '#e9ecef' : '#007bff', color: pagination.skip === 0 ? '#6c757d' : '#fff', border: 'none', borderRadius: '4px', cursor: pagination.skip === 0 ? 'not-allowed' : 'pointer' }}
            >
              Previous
            </button>
            <span style={{ fontSize: '14px', color: '#6c757d' }}>
              Showing {pagination.skip + 1} - {Math.min(pagination.skip + pagination.limit, pagination.total)} of {pagination.total}
            </span>
            <button 
              onClick={handleNext} 
              disabled={pagination.skip + pagination.limit >= pagination.total}
              style={{ padding: '8px 16px', background: (pagination.skip + pagination.limit >= pagination.total) ? '#e9ecef' : '#007bff', color: (pagination.skip + pagination.limit >= pagination.total) ? '#6c757d' : '#fff', border: 'none', borderRadius: '4px', cursor: (pagination.skip + pagination.limit >= pagination.total) ? 'not-allowed' : 'pointer' }}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}