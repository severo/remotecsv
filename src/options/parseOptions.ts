import { validateComments } from './comments'
import { DefaultDelimiter } from './constants'
import { guessDelimiter, validateDelimiter } from './delimiter'
import { validateEscapeChar } from './escapeChar'
import { guessLineEndings, type Newline, validateNewline } from './newline'
import { validateQuoteChar } from './quoteChar'

export interface ParseOptions {
  delimiter?: string
  newline?: Newline
  quoteChar?: string
  escapeChar?: string
  comments?: boolean | string
}
export interface DelimiterError {
  type: 'Delimiter'
  code: 'UndetectableDelimiter'
  message: string
}

/**
 * Validates and guesses parsing options.
 * @param parseOptions The parsing options to validate and guess.
 * @param parseOptions.delimiter The delimiter used in the CSV data. Defaults to ','.
 * @param parseOptions.newline The newline used in the CSV data. Defaults to '\n'.
 * @param parseOptions.quoteChar The quote character used in the CSV data. Defaults to '"'.
 * @param parseOptions.escapeChar The escape character used in the CSV data. Defaults to the quote character.
 * @param parseOptions.comments The comment character or boolean to indicate comments.
 * @param params The parameters for validation and guessing.
 * @param params.text The string to use for guessing.
 * @param params.delimitersToGuess The list of delimiters to guess from.
 * @returns The validated and guessed parsing options, and the delimiter error (if any).
 */
export function validateAndGuessParseOptions(parseOptions: ParseOptions, { text, delimitersToGuess}: {
  text: string
  delimitersToGuess?: string[]
}): {
  parseOptions: ParseOptions
  error?: DelimiterError
} {
  const quoteChar = validateQuoteChar(parseOptions.quoteChar)
  const escapeChar = validateEscapeChar(parseOptions.escapeChar) ?? quoteChar
  const newline = validateNewline(parseOptions.newline) ?? guessLineEndings(text, quoteChar)
  const comments = parseOptions.comments

  let error: DelimiterError | undefined
  let delimiter = validateDelimiter(parseOptions.delimiter)
  if (!delimiter) {
    const delimGuess = guessDelimiter(text, newline, comments, delimitersToGuess)
    if (delimGuess.successful)
      delimiter = delimGuess.bestDelimiter
    else {
      error = {
        type: 'Delimiter',
        code: 'UndetectableDelimiter',
        message: 'Unable to auto-detect delimiting character; defaulted to \'' + DefaultDelimiter + '\'',
      }
      delimiter = DefaultDelimiter
    }
  }
  return {
    parseOptions: { delimiter, newline, quoteChar, escapeChar, comments },
    error,
  }
}

export interface ValidParseOptions {
  delimiter: string
  newline: '\n' | '\r' | '\r\n'
  comments: string | false
  quoteChar: string
  escapeChar: string
}

/**
 * Validates and fills in default options
 * @param parseOptions The parsing options to validate and guess.
 * @param parseOptions.delimiter The delimiter used in the CSV data. Defaults to ','.
 * @param parseOptions.newline The newline used in the CSV data. Defaults to '\n'.
 * @param parseOptions.quoteChar The quote character used in the CSV data. Defaults to '"'.
 * @param parseOptions.escapeChar The escape character used in the CSV data. Defaults to the quote character.
 * @param parseOptions.comments The comment character or boolean to indicate comments.
 * @returns The validated options
 */
export function validateAndSetDefaultParseOptions(parseOptions?: ParseOptions): ValidParseOptions {
  const quoteChar = validateQuoteChar(parseOptions?.quoteChar)
  const escapeChar = validateEscapeChar(parseOptions?.escapeChar) ?? quoteChar

  // Delimiter must be valid
  // Throws if delimiter is invalid (PapaParse defaults to ",")
  const delimiter = validateDelimiter(parseOptions?.delimiter) ?? ','

  // Comment character must be valid
  // Throws if comment character is invalid (defaults to false)
  const comments = validateComments(parseOptions?.comments, delimiter) ?? false

  // Newline must be: \r, \n, or \r\n (enforced by type system). Defaults to \n.
  const newline = validateNewline(parseOptions?.newline) ?? '\n'

  return {
    delimiter,
    newline,
    comments,
    quoteChar,
    escapeChar,
  }
}
