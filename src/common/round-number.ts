import BigNumber from 'bignumber.js';

export const roundNumber = (n: string | number, decimals = 8): string => {
  return new BigNumber(n)
    .decimalPlaces(decimals, BigNumber.ROUND_HALF_EVEN)
    .toString(10)
}
