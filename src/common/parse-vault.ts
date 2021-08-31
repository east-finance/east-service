import { VaultJson, Vault } from "./constants";

export function parseVault(vaultJson: VaultJson): Vault {
  return {
    ...vaultJson,
    eastAmount: vaultJson.eastAmount !== undefined ? parseFloat(vaultJson.eastAmount) : 0,
    rwaAmount: vaultJson.rwaAmount !== undefined ? parseFloat(vaultJson.rwaAmount) : 0,
    westAmount: parseFloat(vaultJson.westAmount),
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
