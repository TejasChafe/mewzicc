// scripts/benchmark.js
const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("Running Gas Benchmarking for Batch Payouts...");

  const [deployer, artist, contributor] = await ethers.getSigners();
  const RoyaltyDistributor = await ethers.getContractFactory("RoyaltyDistributor");
  const distributor = await RoyaltyDistributor.deploy();
  await distributor.waitForDeployment();

  await (await distributor.registerTrack(
    "Benchmark Song",
    "/audio/track.mp3",
    [artist.address, contributor.address],
    [7000, 3000]
  )).wait();

  const totalStreams = 1000;
  const batchSizes = [1, 10, 50, 100, 200];
  const output = [];

  for (const n of batchSizes) {
    let totalGas = BigInt(0);
    const batches = totalStreams / n;

    for (let i = 0; i < batches; i++) {
      const tx = await distributor.triggerPayout(1, n);
      const receipt = await tx.wait();
      totalGas += receipt.gasUsed;
    }

    const avgGasPerStream = Number(totalGas) / totalStreams;
    console.log(`Batch Size (n=${n}): Total Gas = ${totalGas.toString()} | Avg Gas/Stream = ${avgGasPerStream.toFixed(2)}`);

    output.push({ batchSize: n, totalGasUsed: totalGas.toString(), avgGasPerStream });
  }

  fs.writeFileSync("gas_benchmark_results.json", JSON.stringify(output, null, 2));
  console.log("Results saved to gas_benchmark_results.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});