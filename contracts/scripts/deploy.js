import {network} from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const { ethers } = await network.create();
  const [deployer, artist, producer, engineer, listener] = await ethers.getSigners();
  console.log("====================================================");
  console.log("🚀 Starting Local Deployment");
  console.log("Deployer / Platform Signer:", deployer.address);
  console.log("====================================================");

  // 1. Deploy MockUSDC
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();
  await mockUSDC.waitForDeployment();
  const mockUSDCAddress = await mockUSDC.getAddress();
  console.log(`✅ MockUSDC deployed to: ${mockUSDCAddress}`);

  // 2. Deploy RoyaltyDistributor
  const RoyaltyDistributor = await ethers.getContractFactory("RoyaltyDistributor");
  const royaltyDistributor = await RoyaltyDistributor.deploy(mockUSDCAddress);
  await royaltyDistributor.waitForDeployment();
  const royaltyDistributorAddress = await royaltyDistributor.getAddress();
  console.log(`✅ RoyaltyDistributor deployed to: ${royaltyDistributorAddress}`);

  // 3. Fund Deployer & Listener with 50,000 mUSDC (6 decimals)
  const fundAmount = ethers.parseUnits("50000", 6);
  await (await mockUSDC.mint(deployer.address, fundAmount)).wait();
  await (await mockUSDC.mint(listener.address, fundAmount)).wait();
  console.log("💰 Minted 50,000 mUSDC to Deployer and Listener");

  // 4. Pre-approve RoyaltyDistributor from Deployer account
  await (await mockUSDC.connect(deployer).approve(royaltyDistributorAddress, ethers.MaxUint256)).wait();
  console.log("🔓 Deployer platform pool approved RoyaltyDistributor for payouts");

  // 5. Register Track #1
  const royaltyPerListen = ethers.parseUnits("0.05", 6);
  const metadataCID = "QmMidnightGrooveDemo";
  const registerTx = await royaltyDistributor.connect(artist).registerTrack(metadataCID, royaltyPerListen);
  await registerTx.wait();
  const trackId = 1;
  console.log(`🎵 Track #${trackId} registered by Artist (${artist.address})`);

  // 6. Configure Splits: 60% Artist, 30% Producer, 10% Engineer
  const splitsTx = await royaltyDistributor.connect(artist).setSplits(
    trackId,
    [artist.address, producer.address, engineer.address],
    [6000, 3000, 1000]
  );
  await splitsTx.wait();
  console.log(`⚖️ Splits configured: 60% Artist, 30% Producer, 10% Engineer`);

  // 7. Write addresses to frontend/src/contracts/addresses.json
  const addressesDir = path.resolve(__dirname, "../../frontend/src/contracts");
  if (!fs.existsSync(addressesDir)) {
    fs.mkdirSync(addressesDir, { recursive: true });
  }

  const exportData = {
    network: "localhost",
    chainId: 31337,
    mockUSDC: mockUSDCAddress,
    royaltyDistributor: royaltyDistributorAddress,
    platformWallet: deployer.address,
    seedTrack: {
      id: trackId,
      artist: artist.address,
      producer: producer.address,
      engineer: engineer.address,
      royaltyPerListen: "0.05 mUSDC",
    },
  };

  fs.writeFileSync(
    path.join(addressesDir, "addresses.json"),
    JSON.stringify(exportData, null, 2)
  );
  console.log(`📋 Saved deployment addresses to: ${path.join(addressesDir, "addresses.json")}`);
  console.log("====================================================\n");
}

main().catch((err) => {
  console.error("❌ Deployment failed:", err);
  process.exit(1);
});