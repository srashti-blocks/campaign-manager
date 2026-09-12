import { WalletProvider } from './context/WalletContext';
import Navbar from './components/Navbar';
import NetworkBanner from './components/NetworkBanner';
import CampaignList from './components/CampaignList';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import CampaignList from './CampaignList';
import CampaignDetail from './CampaignDetail'; 

export default function App() {
  return (
    <WalletProvider>
      <Router>
      <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: 'Arial, sans-serif' }}>
        <Navbar />
        <NetworkBanner />
        <main style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
          <CampaignList />
        </main>
      </div>
      </Router>
    </WalletProvider>
  );
}