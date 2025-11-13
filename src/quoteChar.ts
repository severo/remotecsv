/**
 * Returns the quote character used in the CSV file.
 * @param quoteChar The quote character to validate.
 * @returns The quote character.
 */
export function validateQuoteChar(quoteChar?: string): string {
  // TODO(SL): guess the quote character?
  return quoteChar ?? '"'
}
