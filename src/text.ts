import { validateAndGuessParseOptions } from './options/parseOptions'
import { parse } from './parser'
import type { DelimiterError, GuessOptions, ParseOptions, ParseResult } from './types'

/**
 * Parses a text into CSV data.
 * @param text The string to parse.
 * @param options Options for parsing the string.
 * @yields {ParseResult} Parsed data and metadata.
 * @returns A generator yielding parsed data and metadata row by row.
 */
export function* parseText(text: string, options: ParseOptions & GuessOptions = {}): Generator<ParseResult, void, unknown> {
  const { delimitersToGuess, previewLines } = options
  const { parseOptions, error } = validateAndGuessParseOptions(options, { text, delimitersToGuess, previewLines })

  let delimiterError: DelimiterError | undefined = error
  for (const result of parse(text, parseOptions)) {
    // Add delimiter error to the first result only
    if (delimiterError) {
      result.errors.push(delimiterError)
      delimiterError = undefined
    }
    yield result
  }
}
