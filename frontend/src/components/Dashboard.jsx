// src/components/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, ROYALTY_DISTRIBUTOR_ABI } from '../config/contracts';

export default function Dashboard() {
  const { account, connectWallet, isConnecting, contract, provider } = useWeb3();

  const [metadataCID, setMetadataCID] = useState('Demo Track');
  const [royaltyPerListen, setRoyaltyPerListen] = useState('0.05');
  
  const [targetTrackId, setTargetTrackId] = useState(1);
  const [shareholders, setShareholders] = useState(['', '']);
  const [sharesBps, setSharesBps] = useState(['6000', '4000']);

  const [selectedTrackId, setSelectedTrackId] = useState(1);
  const [trackDetails, setTrackDetails] = useState(null);
  const [eventLogs, setEventLogs] = useState([]);
  const [demoListenCount, setDemoListenCount] = useState('1000');
  const [isSimulating, setIsSimulating] = useState(false);

  const handleRegisterTrack = async (e) => {
    e.preventDefault();
    if (!contract) return alert("Connect wallet first!");

    try {
      const rateInWei = ethers.parseUnits(royaltyPerListen, 6);
      const tx = await contract.registerTrack(metadataCID, rateInWei);
      await tx.wait();
      alert("Track successfully registered on-chain!");
      fetchTrackData();
    } catch (err) {
      console.error("Track registration failed:", err);
      alert("Failed to register track.");
    }
  };

  const handleSetSplits = async (e) => {
    e.preventDefault();
    if (!contract) return alert("Connect wallet first!");

    try {
      const parsedShares = sharesBps.map(s => parseInt(s, 10));
      const totalBps = parsedShares.reduce((a, b) => a + b, 0);

      if (totalBps !== 10000) {
        return alert(`Total shares must equal 10,000 BPS (100%). Current: ${totalBps}`);
      }

      const tx = await contract.setSplits(targetTrackId, shareholders, parsedShares);
      await tx.wait();
      alert("Splits successfully configured!");
      fetchTrackData();
    } catch (err) {
      console.error("Setting splits failed:", err);
      alert("Failed to set splits.");
    }
  };

  // Demo helper to instantly trigger bulk listens via backend server
  const handleSimulateListens = async () => {
    try {
      setIsSimulating(true);
      const response = await fetch("http://localhost:3001/api/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId: selectedTrackId, listenCount: parseInt(demoListenCount, 10) })
      });
      const data = await response.json();
      if (data.success) {
        alert(`Successfully simulated ${demoListenCount} streams! Payout distributed.`);
        fetchTrackData();
        fetchEventLogs();
      } else {
        alert(`Simulation failed: ${data.error}`);
      }
    } catch (err) {
      console.error("Network error triggering simulation:", err);
      alert("Failed to connect to settlement server.");
    } finally {
      setIsSimulating(false);
    }
  };

  const fetchTrackData = async () => {
    if (!contract) return;
    try {
      const data = await contract.getTrack(selectedTrackId);
      const splitData = await contract.getTrackSplits(selectedTrackId);

      setTrackDetails({
        artist: data.artist,
        metadataCID: data.metadataCID,
        royaltyPerListen: ethers.formatUnits(data.royaltyPerListen, 6),
        totalPayouts: ethers.formatUnits(data.totalPayouts, 6),
        shareholders: splitData.shareholders,
        shares: splitData.shares.map(s => Number(s))
      });
    } catch (err) {
      console.error("Error loading track data:", err);
    }
  };

  const fetchEventLogs = async () => {
    if (!provider) return;
    try {
      const distContract = new ethers.Contract(
        CONTRACT_ADDRESSES.RoyaltyDistributor,
        ROYALTY_DISTRIBUTOR_ABI,
        provider
      );

      const logs = await distContract.queryFilter(distContract.filters.RoyaltyPaid(), -1000);
      const parsed = logs.map(log => ({
        trackId: log.args.trackId.toString(),
        batchId: log.args.batchId.toString(),
        recipient: log.args.recipient,
        amount: ethers.formatUnits(log.args.amount, 6)
      })).reverse();

      setEventLogs(parsed);
    } catch (err) {
      console.error("Error loading logs:", err);
    }
  };

  useEffect(() => {
    fetchTrackData();
    fetchEventLogs();
  }, [contract, selectedTrackId]);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '1.5rem', fontFamily: 'sans-serif' }}>
      <h1>Royalty Dashboard & Management Portal</h1>

      <section style={{ marginBottom: '2rem' }}>
        {account ? (
          <p><strong>Wallet Connected:</strong> {account}</p>
        ) : (
          <button onClick={connectWallet} disabled={isConnecting}>
            {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
          </button>
        )}
      </section>

      {/* Demo Bulk Simulator Section */}
      <section style={{ marginBottom: '2rem', padding: '1rem', background: '#f0f8ff', border: '1px solid #007acc', borderRadius: '8px' }}>
        <h3>🚀 Demo Quick-Simulator (Bypass Real Listening)</h3>
        <p>Instantly trigger batch listens to test token distribution right into contributor wallets.</p>
        <label>Track ID: </label>
        <input type="number" value={selectedTrackId} onChange={e => setSelectedTrackId(e.target.value)} style={{ width: '60px', marginRight: '1rem' }} />
        <label>Simulated Listens Count: </label>
        <input type="number" value={demoListenCount} onChange={e => setDemoListenCount(e.target.value)} style={{ width: '100px', marginRight: '1rem' }} />
        <button onClick={handleSimulateListens} disabled={isSimulating} style={{ background: '#007acc', color: 'white', padding: '0.4rem 1rem', border: 'none', cursor: 'pointer' }}>
          {isSimulating ? 'Processing...' : 'Trigger Bulk Payout'}
        </button>
      </section>

      <section style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h3>1. Register New Track</h3>
        <form onSubmit={handleRegisterTrack}>
          <label>Title / CID: </label>
          <input value={metadataCID} onChange={e => setMetadataCID(e.target.value)} required />
          <label style={{ marginLeft: '1rem' }}>Royalty Per Listen (mUSDC): </label>
          <input value={royaltyPerListen} onChange={e => setRoyaltyPerListen(e.target.value)} required />
          <button type="submit" style={{ display: 'block', marginTop: '1rem' }}>Register Track</button>
        </form>
      </section>

      <section style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h3>2. Set Track Splits</h3>
        <form onSubmit={handleSetSplits}>
          <label>Track ID: </label>
          <input type="number" value={targetTrackId} onChange={e => setTargetTrackId(e.target.value)} />
          <p>Shareholder addresses & BPS shares (Must sum to 10000):</p>
          <input 
            placeholder="Addresses (comma separated)" 
            value={shareholders.join(',')} 
            onChange={e => setShareholders(e.target.value.split(',').map(s => s.trim()))} 
            style={{ width: '100%', marginBottom: '0.5rem' }}
          />
          <input 
            placeholder="Shares BPS (comma separated, e.g. 6000,4000)" 
            value={sharesBps.join(',')} 
            onChange={e => setSharesBps(e.target.value.split(',').map(s => s.trim()))} 
            style={{ width: '100%', marginBottom: '0.5rem' }}
          />
          <button type="submit">Update Splits On-Chain</button>
        </form>
      </section>

      <section style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h3>3. Track Inspector</h3>
        {trackDetails && (
          <div>
            <p><strong>Artist:</strong> {trackDetails.artist}</p>
            <p><strong>Royalty Per Listen:</strong> {trackDetails.royaltyPerListen} mUSDC</p>
            <p><strong>Total Payouts Distributed:</strong> {trackDetails.totalPayouts} mUSDC</p>
            <ul>
              {trackDetails.shareholders.map((addr, i) => (
                <li key={i}>{addr}: {trackDetails.shares[i] / 100}%</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section>
        <h3>Live Royalty Payout Logs</h3>
        <table border="1" cellPadding="6" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr><th>Track ID</th><th>Batch</th><th>Recipient</th><th>Amount Paid</th></tr>
          </thead>
          <tbody>
            {eventLogs.map((log, i) => (
              <tr key={i}>
                <td>{log.trackId}</td>
                <td>{log.batchId}</td>
                <td><code>{log.recipient}</code></td>
                <td>{log.amount} mUSDC</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}