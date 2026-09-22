// src/App.jsx
import { useState } from "react";
import Player from "./components/Player";
import Dashboard from "./components/Dashboard";
import { tracks } from "./data/tracks";
import { Web3Provider, useWeb3 } from "./context/Web3Context";
import "./App.css";

function MainContent() {
  const [currentTrack, setCurrentTrack] = useState(tracks[0]);
  const [isSettling, setIsSettling] = useState(false);
  const [activeTab, setActiveTab] = useState("player");

  const { account, connectWallet, isConnecting } = useWeb3();

  async function handleTriggerPayout(data) {
    console.log("PAYOUT TRIGGER RECEIVED:", data);
    setIsSettling(true);

    try {
      const response = await fetch("http://localhost:3001/api/settle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          trackId: data.trackId,
          listenCount: data.listenCount,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Settlement failed");
      }

      console.log("Settlement transaction mined:", result.txHash);
    } catch (error) {
      console.error("Platform settlement relay failed:", error);
    } finally {
      setIsSettling(false);
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Mewzicc</h1>

        <nav className="tab-nav">
          <button
            onClick={() => setActiveTab("player")}
            disabled={activeTab === "player"}
          >
            Player
          </button>
          <button
            onClick={() => setActiveTab("dashboard")}
            disabled={activeTab === "dashboard"}
          >
            Dashboard
          </button>
        </nav>

        <button onClick={connectWallet} disabled={isConnecting}>
          {account
            ? `${account.slice(0, 6)}...${account.slice(-4)}`
            : isConnecting ? "Connecting..." : "Connect Wallet"}
        </button>
      </header>

      {activeTab === "player" && (
        <>
          <main className="track-list">
            <h2>Music Library</h2>

            {tracks.map((track) => (
              <div
                key={track.id}
                className="track-card"
                onClick={() => setCurrentTrack(track)}
              >
                <div>
                  <h3>{track.title}</h3>
                  <p>{track.artist}</p>
                </div>

                <button type="button">Select</button>
              </div>
            ))}
          </main>

          <div className="persistent-player">
            <Player
              track={currentTrack}
              walletAddress={account}
              payoutThreshold={5}
              onTriggerPayout={handleTriggerPayout}
            />
            {isSettling && (
              <p className="settling-indicator">
                Batch settlement processing on-chain...
              </p>
            )}
          </div>
        </>
      )}

      {activeTab === "dashboard" && <Dashboard />}
    </div>
  );
}

export default function App() {
  return (
    <Web3Provider>
      <MainContent />
    </Web3Provider>
  );
}