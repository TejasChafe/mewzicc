import "dotenv/config";
import express from "express";
import cors from "cors";
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const addressesPath = path.resolve(
  __dirname,
  "../../frontend/src/contracts/addresses.json"
);

const artifactPath = path.resolve(
  __dirname,
  "../artifacts/contracts/RoyaltyDistributor.sol/RoyaltyDistributor.json"
);

const app = express();

app.use(cors());
app.use(express.json());

let distributor;

async function start() {
  if (!fs.existsSync(addressesPath)) {
    throw new Error(
      `addresses.json not found at ${addressesPath}. Please run deploy.js first.`
    );
  }

  if (!fs.existsSync(artifactPath)) {
    throw new Error(
      `RoyaltyDistributor artifact not found at ${artifactPath}. Please run hardhat compile first.`
    );
  }

  const addresses = JSON.parse(
    fs.readFileSync(addressesPath, "utf8")
  );

  const RoyaltyArtifact = JSON.parse(
    fs.readFileSync(artifactPath, "utf8")
  );

  // Connect to the actual Hardhat node running on Terminal 1
  const provider = new ethers.JsonRpcProvider(
    "http://127.0.0.1:8545"
  );

  // Hardhat local Account #0 = platform / settlement relayer
  const platformPrivateKey = process.env.PLATFORM_PRIVATE_KEY;
  if (!platformPrivateKey) {
  throw new Error(
    "PLATFORM_PRIVATE_KEY is not set in the .env file."
  );
}
  const platformSigner = new ethers.Wallet(
    platformPrivateKey,
    provider
  );

  console.log(
    "Settlement Relayer wallet:",
    platformSigner.address
  );

  distributor = new ethers.Contract(
    addresses.royaltyDistributor,
    RoyaltyArtifact.abi,
    platformSigner
  );

  console.log(
    "Connected to RoyaltyDistributor at:",
    addresses.royaltyDistributor
  );

  // --------------------------------------------------
  // SETTLEMENT ENDPOINT
  // --------------------------------------------------

  app.post("/api/settle", async (req, res) => {
    const { trackId, listenCount } = req.body;

    console.log(
      `[SETTLE REQUEST] Track ID: ${trackId}, Listen Count: ${listenCount}`
    );

    const parsedTrackId = parseInt(trackId, 10);
    const parsedListenCount = parseInt(listenCount, 10);

    if (isNaN(parsedTrackId) || parsedTrackId <= 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid trackId",
      });
    }

    if (isNaN(parsedListenCount) || parsedListenCount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid listenCount",
      });
    }

    try {
      const tx = await distributor.triggerPayout(
        parsedTrackId,
        parsedListenCount
      );

      console.log(
        `Transaction submitted: ${tx.hash}`
      );

      const receipt = await tx.wait();

      console.log(
        `Payout confirmed in block ${receipt.blockNumber}. Hash: ${receipt.hash}`
      );

      return res.json({
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      });
    } catch (err) {
      console.error(
        "Settlement failed:",
        err.shortMessage || err.message
      );

      return res.status(500).json({
        success: false,
        error: err.shortMessage || err.message,
      });
    }
  });

  app.listen(3001, () => {
    console.log(
      "Settlement Relayer listening on http://localhost:3001"
    );
  });
}

start().catch((error) => {
  console.error(
    "Failed to start relayer server:",
    error
  );

  process.exit(1);
});