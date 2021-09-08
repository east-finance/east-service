import { VaultJson, Vault } from "./constants";

const DECIMALS = 8;

const MULTIPLIER = Math.pow(10, DECIMALS);

export function parseVault(vaultJson: VaultJson): Vault {
  return {
    ...vaultJson,
    eastAmount: vaultJson.eastAmount !== undefined ? parseFloat(vaultJson.eastAmount) / MULTIPLIER : 0,
    rwaAmount: vaultJson.rwaAmount !== undefined ? parseFloat(vaultJson.rwaAmount) / MULTIPLIER : 0,
    westAmount: vaultJson.westAmount !== undefined ? parseFloat(vaultJson.westAmount) / MULTIPLIER : 0,
    westRate: vaultJson.westRate !== undefined ? {
      timestamp: vaultJson.westRate.timestamp,
      value: vaultJson.westRate.value ? parseFloat(vaultJson.westRate.value) : 0,
    } : undefined,
    rwaRate: vaultJson.rwaRate !== undefined ? {
      timestamp: vaultJson.rwaRate.timestamp,
      value: vaultJson.rwaRate.value ? parseFloat(vaultJson.rwaRate.value) : 0,
    } : undefined,
    liquidatedWestAmount: vaultJson.liquidatedWestAmount !== undefined ? parseFloat(vaultJson.liquidatedWestAmount) : undefined
  }
}

export function transfromVaultToIntegerView(vault: Vault) {
  return {
    ...vault,
    eastAmount: vault.eastAmount !== undefined ? vault.eastAmount * MULTIPLIER : 0,
    rwaAmount: vault.rwaAmount !== undefined ? vault.rwaAmount * MULTIPLIER : 0,
    westAmount: vault.westAmount !== undefined ? vault.westAmount * MULTIPLIER : 0,
  }
}
