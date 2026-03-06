import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CipherVaultModule = buildModule("CipherVaultModule", (m) => {
  const cipherVault = m.contract("CipherVault");

  return { cipherVault };
});

export default CipherVaultModule;