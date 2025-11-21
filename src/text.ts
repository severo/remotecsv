import { validateAndGuessParseOptions } from './options/parseOptions'
import { parse } from './parser'
import type { DelimiterError, ParseOptions, ParseResult } from './types'

/**
 * Parses a text into CSV data.
 * @param text The string to parse.
 * @param options Options for parsing the string.
 * @param options.delimiter The delimiter used in the CSV data. Defaults to guess the delimiter, else ','.
 * @param options.newline The newline used in the CSV data. Defaults to guess the newline, else '\n'.
 * @param options.quoteChar The quote character used in the CSV data. Defaults to '"'.
 * @param options.escapeChar The escape character used in the CSV data. Defaults to the quote character.
 * @param options.comments The comment character or boolean to indicate comments. Defaults to false (don't strip comments).
 * @param options.initialState Initial state for the parser. Use 'detect' to automatically detect the initial state. Defaults to 'default'.
 * @param options.delimitersToGuess The list of delimiters to guess from
 * @param options.ignoreLastRow Whether to ignore the last row. Defaults to false.
 * @param options.previewLines The number of lines to preview for guessing. Defaults to 10.
 * @param options.stripBOM Whether to strip the BOM character at the start of the text. Defaults to true.
 * @yields Parsed data and metadata.
 * @returns A generator yielding parsed data and metadata row by row.
 */
export function* parseText(text: string,
  options: ParseOptions & {
    delimitersToGuess?: string[]
    ignoreLastRow?: boolean
    previewLines?: number
    stripBOM?: boolean
  } = {}): Generator<ParseResult, void, unknown> {
  const { delimitersToGuess, ignoreLastRow, previewLines, stripBOM } = options
  const { parseOptions, error } = validateAndGuessParseOptions(options, { text, delimitersToGuess, previewLines })

  let delimiterError: DelimiterError | undefined = error
  for (const result of parse(text, {
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
