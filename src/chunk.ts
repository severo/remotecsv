import { DefaultDelimiter } from './constants'
import { guessDelimiter, validateDelimiter } from './delimiter'
import { guessLineEndings, validateNewline } from './newline'
import { parse } from './parser'
import { validateQuoteChar } from './quoteChar'
import type { ParseResult } from './types'
import { testEmptyLine } from './utils'

/**
 * Parses a chunk of bytes into CSV data.
 * @param options Options for parsing the chunk.
 * @param options.bytes The chunk of bytes to parse.
 * @param options.delimiter The delimiter used in the CSV data. Defaults to ','.
 * @param options.newline The newline used in the CSV data. Defaults to '\n'.
 * @param options.quoteChar The quote character used in the CSV data. Defaults to '"'.
 * @param options.comments The comment character or boolean to indicate comments
 * @param options.delimitersToGuess The list of delimiters to guess from
 * @param options.skipEmptyLines Whether to skip empty lines, if so, whether 'greedy' or not. Defaults to false.
 * @param options.ignoreLastRow Whether to ignore the last row. Defaults to false.
 * @yields Parsed data and metadata.
 * @returns A generator yielding parsed data and metadata.
 */
export function* parseChunk({
  bytes,
  delimiter,
  newline,
  quoteChar,
  comments,
  delimitersToGuess,
  skipEmptyLines,
  ignoreLastRow,
}: {
  bytes: Uint8Array
  delimiter?: string
  newline?: string
  quoteChar?: string
  comments?: boolean | string
  delimitersToGuess?: string[]
  skipEmptyLines?: boolean | 'greedy'
  ignoreLastRow?: boolean
}): Generator<ParseResult, void, unknown> {
  const decoder = new TextDecoder('utf-8')
  const input = decoder.decode(bytes)

  skipEmptyLines ??= false
  quoteChar = validateQuoteChar(quoteChar)
  newline = validateNewline(newline) ?? guessLineEndings(input, quoteChar)

  let delimiterError = false
  delimiter = validateDelimiter(delimiter)
  if (!delimiter) {
    const delimGuess = guessDelimiter(input, newline, skipEmptyLines, comments, delimitersToGuess)
    if (delimGuess.successful)
      delimiter = delimGuess.bestDelimiter
    else {
      delimiterError = true // add error after first row parsing
      delimiter = DefaultDelimiter
    }
  }

  for (const result of parse(input, {
    delimiter,
    newline,
    quoteChar,
    ignoreLastRow,
    comments,
    // TODO(SL): add escapeChar?
  })) {
    if (delimiterError) {
      result.errors.push({
        type: 'Delimiter',
        code: 'UndetectableDelimiter',
        message: 'Unable to auto-detect delimiting character; defaulted to \'' + DefaultDelimiter + '\'',
      })
      delimiterError = false
    }

    if (skipEmptyLines && testEmptyLine(result.row, skipEmptyLines)) {
      // TODO(SL) accumulate the byte count of removed lines
      continue
    }

    yield result
  }
}
