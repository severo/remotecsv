import { escapeRegExp } from '../utils'

type Newline = '\n' | '\r' | '\r\n'

/**
 * Returns the newline string to be used in parsing.
 * @param newline The newline string to validate.
 * @returns The newline string.
 */
export function validateNewline(newline?: string): Newline | undefined {
  if (newline === undefined) {
    return undefined
  }
  if (newline !== '\n' && newline !== '\r' && newline !== '\r\n') {
    throw new Error(`Invalid newline: ${newline}`)
  }
  return newline
}

/**
 * Guess the line endings
 * @param input The input string
 * @param quoteChar The quote character
 * @returns The line ending character
 */
export function guessLineEndings(input: string, quoteChar: string): Newline {
  input = input.substring(0, 1024 * 1024) // max length 1 MB
  // Replace all the text inside quotes
  const re = new RegExp(escapeRegExp(quoteChar) + '([^]*?)' + escapeRegExp(quoteChar), 'gm')
  input = input.replace(re, '')

  const r = input.split('\r')

  const n = input.split('\n')

  /* v8 ignore if -- @preserve */
  if (!(0 in r && 0 in n)) {
    // assertion: it should not happen.
    throw new Error('r or n should have at least one element')
  }
  const nAppearsFirst = (n.length > 1 && n[0].length < r[0].length)

  if (r.length === 1 || nAppearsFirst)
    return '\n'

  let numWithN = 0
  for (const match of r) {
    if (match[0] === '\n')
      numWithN++
  }

  return numWithN >= r.length / 2 ? '\r\n' : '\r'
}
