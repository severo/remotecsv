/**
 * Throws if the provided value is not a strictly positive integer. Undefined is allowed.
 *
 * @param value The desired value.
 * @returns The validated value: a strictly positive integer.
 */
export function checkStrictlyPositiveInteger(value?: number): number | undefined {
  if (
    value === undefined
    || (
      Number.isInteger(value)
      && value > 0
    )
  ) {
    return value
  }
  throw new Error(`Invalid value: ${value}`)
}

/**
 * Throws if the provided value is not a non-negative integer. Undefined is allowed.
 *
 * @param value The desired value.
 * @returns The validated value: a non-negative integer.
 */
export function checkNonNegativeInteger(value?: number): number | undefined {
  if (
    value === undefined
    || (
      Number.isInteger(value)
      && value >= 0
    )
  ) {
    return value
  }
  throw new Error(`Invalid value: ${value}`)
}
