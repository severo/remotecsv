import { DefaultDelimiter } from './constants'
import { guessDelimiter, validateDelimiter } from './delimiter'
import { validateEscapeChar } from './escapeChar'
import { guessLineEndings, validateNewline } from './newline'
import { validateQuoteChar } from './quoteChar'

export interface ParseOptions {
  delimiter?: string
  newline?: string
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
 * @param params.input The input string to use for guessing.
 * @param params.skipEmptyLines Whether to skip empty lines.
 * @param params.delimitersToGuess The list of delimiters to guess from.
 * @returns The validated and guessed parsing options, and the delimiter error (if any).
 */
export function validateAndGuessParseOptions(parseOptions: ParseOptions, { input, skipEmptyLines, delimitersToGuess}: {
  input: string
  skipEmptyLines?: boolean | 'greedy'
  delimitersToGuess?: string[]
}): {
  parseOptions: ParseOptions
  error?: DelimiterError
} {
  const quoteChar = validateQuoteChar(parseOptions.quoteChar)
  const escapeChar = validateEscapeChar(parseOptions.escapeChar) ?? quoteChar
  const newline = validateNewline(parseOptions.newline) ?? guessLineEndings(input, quoteChar)
  const comments = parseOptions.comments

  let error: DelimiterError | undefined
  let delimiter = validateDelimiter(parseOptions.delimiter)
  if (!delimiter) {
    const delimGuess = guessDelimiter(input, newline, skipEmptyLines, comments, delimitersToGuess)
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
