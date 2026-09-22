import { useState } from "react";
import Player from "./components/Player";
import Dashboard from "./components/Dashboard";
import { tracks } from "./data/tracks";
import { Web3Provider } from "./context/Web3Context";
import "./App.css";

function App() {
  const [currentTrack, setCurrentTrack] = useState(tracks[0]);
  const [walletAddress, setWalletAddress] = useState("");
  const [isSettling, setIsSettling] = useState(false);
  const [activeTab, setActiveTab] = useState("player");

  async function connectWallet() {
    if (!window.ethereum) {
      alert("Please install MetaMask.");
      return;
    }

    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      setWalletAddress(accounts[0]);
    } catch (error) {
      console.error("Wallet connection failed:", error);
    }
  }

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
    <Web3Provider>
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

          <button onClick={connectWallet}>
            {walletAddress
              ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
              : "Connect Wallet"}
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
                walletAddress={walletAddress}
                payoutThreshold={10}
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
    </Web3Provider>
  );
}

export default App;