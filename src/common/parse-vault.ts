import { VaultJson, Vault } from "./constants";

export function parseVault(vaultJson: VaultJson): Vault {
  return {
    ...vaultJson,
    eastAmount: parseFloat(vaultJson.eastAmount),
    rwaAmount: parseFloat(vaultJson.rwaAmount),
    westAmount: parseFloat(vaultJson.westAmount),
    westRate: {
      timestamp: vaultJson.westRate.timestamp,
      value: vaultJson.westRate.value ? parseFloat(vaultJson.westRate.value) : 0,
    },
    rwaRate: {
      timestamp: vaultJson.rwaRate.timestamp,
      value: vaultJson.rwaRate.value ? parseFloat(vaultJson.rwaRate.value) : 0,
    },
    liquidatedWestAmount: vaultJson.liquidatedWestAmount !== undefined ? parseFloat(vaultJson.liquidatedWestAmount) : undefined
  }
}
