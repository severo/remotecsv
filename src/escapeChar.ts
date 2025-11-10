/**
 * Validates the escape character option.
 * @param escapeChar The escape character to validate.
 * @returns The validated escape character or undefined if not provided.
 */
export function validateEscapeChar(escapeChar?: string): string | undefined {
  if (escapeChar === undefined) {
    return undefined
  }
  if (typeof escapeChar !== 'string' || escapeChar.length !== 1) {
    throw new Error('Escape character must be a single character string.')
  }
  return escapeChar
}
