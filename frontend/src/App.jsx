import { useState } from "react";
import Player from "./components/Player";
import { tracks } from "./data/tracks";
import "./App.css";

function App() {
  const [currentTrack, setCurrentTrack] = useState(tracks[0]);
  const [isSettling, setIsSettling] = useState(false);

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
      {/* ================= HEADER ================= */}
      <header className="app-header">
        <div className="brand">
          <div className="brand-icon">M</div>

          <div className="brand-text">
            <h1>Mewzicc</h1>
            <span>Decentralized Music</span>
          </div>
        </div>

        <div className="header-status">
          <span className="status-dot"></span>
          <span>Music Network</span>
        </div>
      </header>

      {/* ================= HERO ================= */}
      <section className="hero">
        <div className="hero-content">
          <span className="hero-label">WEB3 MUSIC PLAYER</span>

          <h2>
            Discover.
            <br />
            <span>Listen. Earn.</span>
          </h2>

          <p>
            Stream your favorite music with a decentralized listening experience
            powered by Web3 technology.
          </p>

          <div className="hero-stats">
            <div className="hero-stat">
              <strong>{tracks.length}</strong>
              <span>Tracks</span>
            </div>

            <div className="hero-divider"></div>

            <div className="hero-stat">
              <strong>24/7</strong>
              <span>Streaming</span>
            </div>

            <div className="hero-divider"></div>

            <div className="hero-stat">
              <strong>Web3</strong>
              <span>Powered</span>
            </div>
          </div>
        </div>

        <div className="hero-glow"></div>
        <div className="hero-circle hero-circle-one"></div>
        <div className="hero-circle hero-circle-two"></div>
      </section>

      {/* ================= MUSIC LIBRARY ================= */}
      <main className="track-list">
        <div className="section-heading">
          <div>
            <span className="section-label">YOUR COLLECTION</span>
            <h2>Music Library</h2>
          </div>

          <span className="track-count">
            {tracks.length} {tracks.length === 1 ? "track" : "tracks"}
          </span>
        </div>

        <div className="tracks-container">
          {tracks.map((track, index) => {
            const isActive = currentTrack.id === track.id;

            return (
              <div
                key={track.id}
                className={`track-card ${isActive ? "active" : ""}`}
                onClick={() => setCurrentTrack(track)}
              >
                {/* Track number */}
                <div className="track-number">
                  {isActive ? (
                    <div className="playing-bars">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  ) : (
                    String(index + 1).padStart(2, "0")
                  )}
                </div>

                {/* Album artwork */}
                <div className="track-art">
                  {track.coverUrl ? (
                    <img src={track.coverUrl} alt={track.title} />
                  ) : (
                    <div className="default-art">
                      <span>♪</span>
                    </div>
                  )}
                </div>

                {/* Track information */}
                <div className="track-details">
                  <h3>{track.title}</h3>
                  <p>{track.artist}</p>
                </div>

                {/* Play button */}
                <div className="track-action">
                  <button
                    type="button"
                    className={isActive ? "selected" : ""}
                    onClick={(event) => {
                      event.stopPropagation();
                      setCurrentTrack(track);
                    }}
                  >
                    {isActive ? "Playing" : "Play"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* ================= PERSISTENT PLAYER ================= */}
      <div className="persistent-player">
        <Player
          track={currentTrack}
          walletAddress=""
          payoutThreshold={10}
          onTriggerPayout={handleTriggerPayout}
        />

        {isSettling && (
          <div className="settling-indicator">
            <span className="settling-spinner"></span>

            <div>
              <strong>Processing settlement</strong>
              <span>Recording batch payout on-chain...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
