import { network } from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const { ethers } = await network.create();

  // Local Hardhat accounts
  const [deployer, artist, producer, engineer] =
    await ethers.getSigners();

  // Read deployed contract addresses
  const addressesPath = path.resolve(
    __dirname,
    "../../frontend/src/contracts/addresses.json"
  );

  const addresses = JSON.parse(
    fs.readFileSync(addressesPath, "utf8")
  );

  // Connect to deployed contracts
  const mockUSDC = await ethers.getContractAt(
    "MockUSDC",
    addresses.mockUSDC
  );

  const distributor = await ethers.getContractAt(
    "RoyaltyDistributor",
    addresses.royaltyDistributor
  );

  const trackId = 1;
  const listenCount = 10;

  console.log("====================================================");
  console.log("          TESTING ROYALTY PAYOUT");
  console.log("====================================================");

  console.log(`Track ID: ${trackId}`);
  console.log(`Listen Count: ${listenCount}`);
  console.log("Royalty per Listen: 0.05 mUSDC");
  console.log("Expected Revenue: 0.50 mUSDC");
  console.log("");

  // --------------------------------------------------
  // BEFORE BALANCES
  // --------------------------------------------------

  const beforePlatform = await mockUSDC.balanceOf(
    deployer.address
  );

  const beforeArtist = await mockUSDC.balanceOf(
    artist.address
  );

  const beforeProducer = await mockUSDC.balanceOf(
    producer.address
  );

  const beforeEngineer = await mockUSDC.balanceOf(
    engineer.address
  );

  console.log("Balances BEFORE payout:");
  console.log(
    "Platform :",
    ethers.formatUnits(beforePlatform, 6),
    "mUSDC"
  );
  console.log(
    "Artist   :",
    ethers.formatUnits(beforeArtist, 6),
    "mUSDC"
  );
  console.log(
    "Producer :",
    ethers.formatUnits(beforeProducer, 6),
    "mUSDC"
  );
  console.log(
    "Engineer :",
    ethers.formatUnits(beforeEngineer, 6),
    "mUSDC"
  );

  console.log("");

  // --------------------------------------------------
  // TRIGGER PAYOUT
  // --------------------------------------------------

  console.log("Triggering payout...");

  const tx = await distributor.triggerPayout(
    trackId,
    listenCount
  );

  const receipt = await tx.wait();

  console.log("Payout transaction successful!");
  console.log("Transaction hash:", tx.hash);
  console.log("Block number:", receipt.blockNumber);

  console.log("");

  // --------------------------------------------------
  // AFTER BALANCES
  // --------------------------------------------------

  const afterPlatform = await mockUSDC.balanceOf(
    deployer.address
  );

  const afterArtist = await mockUSDC.balanceOf(
    artist.address
  );

  const afterProducer = await mockUSDC.balanceOf(
    producer.address
  );

  const afterEngineer = await mockUSDC.balanceOf(
    engineer.address
  );

  console.log("Balances AFTER payout:");
  console.log(
    "Platform :",
    ethers.formatUnits(afterPlatform, 6),
    "mUSDC"
  );
  console.log(
    "Artist   :",
    ethers.formatUnits(afterArtist, 6),
    "mUSDC"
  );
  console.log(
    "Producer :",
    ethers.formatUnits(afterProducer, 6),
    "mUSDC"
  );
  console.log(
    "Engineer :",
    ethers.formatUnits(afterEngineer, 6),
    "mUSDC"
  );

  console.log("");

  // --------------------------------------------------
  // CALCULATE CHANGES
  // --------------------------------------------------

  const platformChange =
    afterPlatform - beforePlatform;

  const artistChange =
    afterArtist - beforeArtist;

  const producerChange =
    afterProducer - beforeProducer;

  const engineerChange =
    afterEngineer - beforeEngineer;

  console.log("Balance changes:");
  console.log(
    "Platform :",
    ethers.formatUnits(platformChange, 6),
    "mUSDC"
  );
  console.log(
    "Artist   :",
    ethers.formatUnits(artistChange, 6),
    "mUSDC"
  );
  console.log(
    "Producer :",
    ethers.formatUnits(producerChange, 6),
    "mUSDC"
  );
  console.log(
    "Engineer :",
    ethers.formatUnits(engineerChange, 6),
    "mUSDC"
  );

  console.log("");

  // --------------------------------------------------
  // CONTRACT STATE
  // --------------------------------------------------

  const currentBatchId =
    await distributor.currentBatchId(trackId);

  const track = await distributor.getTrack(trackId);

  console.log("Contract state:");
  console.log(
    "Current Batch ID:",
    currentBatchId.toString()
  );
  console.log(
    "Total Payouts:",
    ethers.formatUnits(track[3], 6),
    "mUSDC"
  );

  console.log("====================================================");
  console.log("                 TEST COMPLETE");
  console.log("====================================================");
}

main().catch((error) => {
  console.error("❌ Test failed:");
  console.error(error);
  process.exitCode = 1;
});