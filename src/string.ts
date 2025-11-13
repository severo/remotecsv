import { type DelimiterError, type ParseOptions, validateAndGuessParseOptions } from './options/parseOptions'
import { parse } from './parser'
import type { ParseResult } from './types'
import { testEmptyLine } from './utils'

/**
 * Parses a string into CSV data.
 * @param input The input string to parse.
 * @param options Options for parsing the string.
 * @param options.delimiter The delimiter used in the CSV data. Defaults to ','.
 * @param options.newline The newline used in the CSV data. Defaults to '\n'.
 * @param options.quoteChar The quote character used in the CSV data. Defaults to '"'.
 * @param options.escapeChar The escape character used in the CSV data. Defaults to the quote character.
 * @param options.comments The comment character or boolean to indicate comments
 * @param options.delimitersToGuess The list of delimiters to guess from
 * @param options.skipEmptyLines Whether to skip empty lines, if so, whether 'greedy' or not. Defaults to false.
 * @param options.ignoreLastRow Whether to ignore the last row. Defaults to false.
 * @yields Parsed data and metadata.
 * @returns A generator yielding parsed data and metadata row by row.
 */
export function* parseString(input: string,
  options: ParseOptions & {
    delimitersToGuess?: string[]
    ignoreLastRow?: boolean
    skipEmptyLines?: boolean | 'greedy'
  } = {}): Generator<ParseResult, void, unknown> {
  const { delimitersToGuess, ignoreLastRow, skipEmptyLines } = options
  const { parseOptions, error } = validateAndGuessParseOptions(options, { input, skipEmptyLines, delimitersToGuess })

  let delimiterError: DelimiterError | undefined = error
  for (const result of parse(input, {
    ...parseOptions,
    ignoreLastRow,
  })) {
    // Add delimiter error to the first result only
    if (delimiterError) {
      result.errors.push(delimiterError)
      delimiterError = undefined
    }

    if (skipEmptyLines && testEmptyLine(result.row, skipEmptyLines)) {
      // TODO(SL) accumulate the byte count of removed lines
      continue
    }

    yield result
  }
}
