
import Navbar from './components/Navbar';
import NetworkBanner from './components/NetworkBanner';
import CampaignList from './components/CampaignList';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { WalletProvider } from  './context/WalletContext';
import CampaignDetail from './components/CampaignDetail'; 
import CreateCampaign from './components/CreateCampaign';

export default function App() {
  return (
    <WalletProvider>
      <Router>
        <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: 'Arial, sans-serif' }}>
          <Navbar />
          <NetworkBanner />
          <main style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
            <Routes>
              <Route path="/" element={<CampaignList />} />
              <Route path="/campaign/:id" element={<CampaignDetail />} />
              <Route path="/create" element={<CreateCampaign />} />
            </Routes>
          </main>
        </div>
      </Router>
    </WalletProvider>
  );
}