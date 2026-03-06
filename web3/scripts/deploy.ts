/// <reference types="@nomicfoundation/hardhat-ethers" />
// scripts/deploy.ts
// Run: npx hardhat run scripts/deploy.ts --network apexnetwork

import { writeFileSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// ✅ Hardhat 3 + hardhat-ethers v4: import langsung dari "hardhat"
import { network } from "hardhat";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main(): Promise<void> {
    const { ethers } = await network.connect();
    const [deployer] = await ethers.getSigners();
    const net = await ethers.provider.getNetwork();

    console.log("\n╔══════════════════════════════════════════╗");
    console.log("║       CipherVault Deployment Script      ║");
    console.log("╚══════════════════════════════════════════╝\n");
    console.log(`📡  Chain ID  : ${Number(net.chainId)}`);
    console.log(`Deployer  : ${deployer.address}`);

    const balance = await ethers.provider.getBalance(deployer.address);
    const balanceStr = ethers.formatEther(balance);
    console.log(`Balance   : ${balanceStr} VELD`);

    if (balance === 0n) {
        console.error("\nSaldo APEX kosong!");
        console.error(`Kirim APEX ke: ${deployer.address}`);
        process.exit(1);
    }

    console.log("\nDeploying CipherVault...\n");

    const CipherVault = await ethers.getContractFactory("CipherVault");
    const contract = await CipherVault.deploy();

    // Tampilkan tx hash segera setelah transaksi dikirim
    const deployTx = contract.deploymentTransaction();
    console.log(`📤  Tx terkirim  : ${deployTx?.hash}`);
    console.log(`⏳  Menunggu konfirmasi (max 120 detik)...\n`);

    // Timeout 120 detik agar tidak stuck selamanya
    const TIMEOUT_MS = 120_000;
    await Promise.race([
        contract.waitForDeployment(),
        new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(
                `Timeout: transaksi tidak dikonfirmasi dalam ${TIMEOUT_MS / 1000}s.\n` +
                `Cek tx di explorer: ${deployTx?.hash}`
            )), TIMEOUT_MS)
        ),
    ]);

    const contractAddress = await contract.getAddress();
    console.log(`✅  Deployed!`);
    console.log(`📋  Address   : ${contractAddress}`);
    console.log(`🔗  Tx Hash   : ${deployTx?.hash}`);

    // Update .env.local otomatis
    const envPath = join(__dirname, "../.env.local");
    let envContent = "";
    try { envContent = readFileSync(envPath, "utf8"); } catch { /* belum ada */ }

    const line = `NEXT_PUBLIC_CONTRACT_ADDRESS=${contractAddress}`;
    if (envContent.includes("NEXT_PUBLIC_CONTRACT_ADDRESS=")) {
        envContent = envContent.replace(/NEXT_PUBLIC_CONTRACT_ADDRESS=.*/, line);
    } else {
        envContent += `\n${line}\n`;
    }
    writeFileSync(envPath, envContent);

    console.log(`\n📝  .env.local diupdate!`);
    console.log(`\n   ✅ Done! Jalankan: npm run dev\n`);
}

main().catch((e: Error) => {
    console.error("\n❌  Deploy gagal:", e.message);
    if (e.message?.includes("ECONNREFUSED"))
        console.error("   → Node Avalanche tidak jalan. Cek port 9650.");
    if (e.message?.includes("insufficient funds"))
        console.error("   → Saldo APEX tidak cukup untuk gas.");
    process.exit(1);
});