// src/components/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, ROYALTY_DISTRIBUTOR_ABI } from '../config/contracts';

export default function Dashboard() {
  const { account, connectWallet, isConnecting, contract, provider } = useWeb3();

  // Registration form state
  const [trackTitle, setTrackTitle] = useState('');
  const [audioUri, setAudioUri] = useState('/audio/track.mp3');
  const [shareholders, setShareholders] = useState(['', '']);
  const [sharesPercent, setSharesPercent] = useState(['', '']);

  // Viewer & ledger state
  const [selectedTrackId, setSelectedTrackId] = useState(1);
  const [trackDetails, setTrackDetails] = useState(null);
  const [pendingRoyalty, setPendingRoyalty] = useState('0');
  const [eventLogs, setEventLogs] = useState([]);

  const handleAddShareholder = () => {
    setShareholders([...shareholders, '']);
    setSharesPercent([...sharesPercent, '']);
  };

  const handleRegisterTrack = async (e) => {
    e.preventDefault();
    if (!contract) return alert("Connect wallet first!");

    try {
      // Convert percentages to basis points (e.g. 50% -> 5000 BPS)
      const sharesBps = sharesPercent.map(p => Math.round(parseFloat(p) * 100));
      const totalBps = sharesBps.reduce((a, b) => a + b, 0);

      if (totalBps !== 10000) {
        return alert(`Total share must equal 100% (10,000 BPS). Current: ${totalBps / 100}%`);
      }

      const tx = await contract.registerTrack(trackTitle, audioUri, shareholders, sharesBps);
      await tx.wait();
      alert("Track successfully registered!");
      fetchTrackData();
    } catch (err) {
      console.error("Track registration failed:", err);
      alert("Failed to register track.");
    }
  };

  const fetchTrackData = async () => {
    if (!contract || !account) return;
    try {
      const data = await contract.getTrack(selectedTrackId);
      setTrackDetails({
        title: data.title,
        audioUri: data.audioUri,
        totalPlays: data.totalPlays.toString(),
        totalRevenue: ethers.formatEther(data.totalRevenueDistributed),
        shareholders: data.shareholders,
        sharesBps: data.sharesBps.map(bps => Number(bps) / 100)
      });

      const pending = await contract.getPendingRoyalty(selectedTrackId, account);
      setPendingRoyalty(ethers.formatEther(pending));
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

      const [payoutLogs, claimLogs] = await Promise.all([
        distContract.queryFilter(distContract.filters.PayoutTriggered(), -1000),
        distContract.queryFilter(distContract.filters.RoyaltyClaimed(), -1000)
      ]);

      const parsed = [
        ...payoutLogs.map(log => ({
          type: 'PayoutTriggered',
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          trackId: log.args.trackId.toString(),
          streamCount: log.args.streamCount.toString(),
          amount: ethers.formatEther(log.args.totalAmountDistributed)
        })),
        ...claimLogs.map(log => ({
          type: 'RoyaltyClaimed',
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          trackId: log.args.trackId.toString(),
          contributor: log.args.contributor,
          amount: ethers.formatEther(log.args.amount)
        }))
      ].sort((a, b) => b.blockNumber - a.blockNumber);

      setEventLogs(parsed);
    } catch (err) {
      console.error("Error loading logs:", err);
    }
  };

  const handleClaim = async () => {
    if (!contract) return;
    try {
      const tx = await contract.claimRoyalty(selectedTrackId);
      await tx.wait();
      alert("Royalty successfully claimed!");
      fetchTrackData();
      fetchEventLogs();
    } catch (err) {
      console.error("Claim failed:", err);
    }
  };

  useEffect(() => {
    fetchTrackData();
    fetchEventLogs();
  }, [account, contract, selectedTrackId]);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '1.5rem' }}>
      <h1>Royalty Dashboard & Management Portal</h1>

      {/* Wallet Status */}
      <section style={{ marginBottom: '2rem' }}>
        {account ? (
          <p><strong>Wallet Connected:</strong> {account}</p>
        ) : (
          <button onClick={connectWallet} disabled={isConnecting}>
            {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
          </button>
        )}
      </section>

      {/* Artist/Label Registration Portal */}
      <section style={{ marginBottom: '2rem' }}>
        <h3>Artist Portal: Register Song & Assign Splits</h3>
        <form onSubmit={handleRegisterTrack}>
          <label>Song Title:</label>
          <input
            value={trackTitle}
            onChange={(e) => setTrackTitle(e.target.value)}
            required
            style={{ width: '100%', padding: '0.4rem' }}
          />

          <p><strong>Shareholders & Splits (must sum to 100%):</strong></p>
          {shareholders.map((addr, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input
                placeholder="Shareholder address"
                value={addr}
                onChange={(e) => {
                  const copy = [...shareholders];
                  copy[idx] = e.target.value;
                  setShareholders(copy);
                }}
                style={{ flex: 2, padding: '0.4rem' }}
                required
              />
              <input
                placeholder="% share"
                value={sharesPercent[idx]}
                onChange={(e) => {
                  const copy = [...sharesPercent];
                  copy[idx] = e.target.value;
                  setSharesPercent(copy);
                }}
                style={{ flex: 1, padding: '0.4rem' }}
                required
              />
            </div>
          ))}

          <button type="button" onClick={handleAddShareholder}>+ Add Contributor</button>
          <button type="submit" style={{ marginLeft: '1rem' }}>Register Track On-Chain</button>
        </form>
      </section>

      {/* Track Split Viewer & Claim Portal */}
      <section style={{ marginBottom: '2rem' }}>
        <h3>Track Royalty Inspector</h3>
        <label>Track ID: </label>
        <input
          type="number"
          value={selectedTrackId}
          onChange={(e) => setSelectedTrackId(e.target.value)}
          style={{ width: '60px', padding: '0.3rem', marginBottom: '1rem' }}
        />

        {trackDetails && (
          <div>
            <p><strong>Title:</strong> {trackDetails.title}</p>
            <p><strong>Total Streams:</strong> {trackDetails.totalPlays}</p>
            <p><strong>Total Distributed:</strong> {trackDetails.totalRevenue} Tokens</p>

            <table border="1" cellPadding="6" style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr><th>Contributor</th><th>Split %</th></tr>
              </thead>
              <tbody>
                {trackDetails.shareholders.map((addr, i) => (
                  <tr key={i}>
                    <td>{addr}</td>
                    <td>{trackDetails.sharesBps[i]}%</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p style={{ marginTop: '1rem' }}>
              <strong>Your Claimable Balance:</strong> {pendingRoyalty} Tokens
            </p>
            <button onClick={handleClaim}>Claim Royalty</button>
          </div>
        )}
      </section>

      {/* Live Event Ledger */}
      <section>
        <h3>On-Chain Event Ledger (getLogs)</h3>
        <table border="1" cellPadding="6" style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr><th>Event</th><th>Track</th><th>Details</th><th>Tx Hash</th></tr>
          </thead>
          <tbody>
            {eventLogs.map((log, i) => (
              <tr key={i}>
                <td><strong>{log.type}</strong></td>
                <td>{log.trackId}</td>
                <td>
                  {log.type === 'PayoutTriggered'
                    ? `Batch: ${log.streamCount} streams | Distributed: ${log.amount} tokens`
                    : `Claimed: ${log.amount} tokens by ${log.contributor.slice(0, 6)}...`}
                </td>
                <td><code>{log.txHash.slice(0, 10)}...</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}