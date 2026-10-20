export function assertCents(name: string, value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a whole, non-negative number of cents`);
  }
}

export function ceilDiv(numerator: number, denominator: number): number {
  return Math.ceil(numerator / denominator);
}

export function floorDiv(numerator: number, denominator: number): number {
  return Math.floor(numerator / denominator);
}
