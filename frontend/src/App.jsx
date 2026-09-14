import { useState } from "react";
import Player from "./components/Player";
import { tracks } from "./data/tracks";
import "./App.css";

function App() {
  const [currentTrack, setCurrentTrack] = useState(tracks[0]);
  const [walletAddress, setWalletAddress] = useState("");

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

  function handleTriggerPayout(data) {
    console.log("PAYOUT TRIGGER:", data);

    // Yash will later connect this
    // function to RoyaltyDistributor.sol
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Mewzicc</h1>

        <button onClick={connectWallet}>
          {walletAddress
            ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
            : "Connect Wallet"}
        </button>
      </header>

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

            <button>Select</button>
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
      </div>
    </div>
  );
}

export default App;
