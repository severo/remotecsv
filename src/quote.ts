/**
 * Returns the quote character used in the CSV file.
 * @returns The quote character.
 */
export function getQuote() {
  // TODO(SL): make the quote character configurable
  // TODO(SL): guess the quote character from the first chunk
  return '"'
}
