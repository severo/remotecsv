import { type DelimiterError, type ParseOptions, validateAndGuessParseOptions } from './options/parseOptions'
import { parse } from './parser'
import type { ParseResult } from './types'

/**
 * Parses a string into CSV data.
 * @param input The input string to parse.
 * @param options Options for parsing the string.
 * @param options.delimiter The delimiter used in the CSV data. Defaults to ','.
 * @param options.newline The newline used in the CSV data. Defaults to '\n'.
 * @param options.quoteChar The quote character used in the CSV data. Defaults to '"'.
 * @param options.escapeChar The escape character used in the CSV data. Defaults to the quote character.
 * @param options.comments The comment character or boolean to indicate comments. Defaults to false (don't strip comments).
 * @param options.delimitersToGuess The list of delimiters to guess from
 * @param options.ignoreLastRow Whether to ignore the last row. Defaults to false.
 * @param options.stripBOM Whether to strip the BOM character at the start of the input. Defaults to true.
 * @yields Parsed data and metadata.
 * @returns A generator yielding parsed data and metadata row by row.
 */
export function* parseString(input: string,
  options: ParseOptions & {
    delimitersToGuess?: string[]
    ignoreLastRow?: boolean
    stripBOM?: boolean
  } = {}): Generator<ParseResult, void, unknown> {
  const { delimitersToGuess, ignoreLastRow, stripBOM } = options
  const { parseOptions, error } = validateAndGuessParseOptions(options, { input, delimitersToGuess })

  let delimiterError: DelimiterError | undefined = error
  for (const result of parse(input, {
    ...parseOptions,
    ignoreLastRow,
    stripBOM,
  })) {
    // Add delimiter error to the first result only
    if (delimiterError) {
      result.errors.push(delimiterError)
      delimiterError = undefined
    }
    yield result
  }
}
