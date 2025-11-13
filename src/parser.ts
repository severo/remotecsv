// Adapted from PapaParse (https://www.papaparse.com/)
import { type ParseOptions, validateAndSetDefaultParseOptions } from './options/parseOptions'
import type { ParseError, ParseResult } from './types'
import { escapeRegExp } from './utils'

/**
 * Parses the input string with the given options
 * @param input The input string to parse
 * @param options The options for parsing
 * @param options.delimiter The delimiter used in the CSV data. Defaults to ','.
 * @param options.newline The newline used in the CSV data. Defaults to '\n'.
 * @param options.quoteChar The quote character used in the CSV data. Defaults to '"'.
 * @param options.escapeChar The escape character used in the CSV data. Defaults to the quote character.
 * @param options.comments The comment character or boolean to indicate comments.
 * @param options.ignoreLastRow Whether to ignore the last row. Defaults to false.
 * @param options.stripBOM Whether to strip the BOM character at the start of the input. Defaults to true.
 * @yields The parse results, one row at a time
 * @returns A generator yielding parse results
 */
export function* parse(input: string, options: ParseOptions & {
  ignoreLastRow?: boolean
  stripBOM?: boolean
} = {}): Generator<ParseResult, void, unknown> {
  const {
    delimiter,
    newline,
    comments,
    quoteChar,
    escapeChar,
  } = validateAndSetDefaultParseOptions(options)
  const ignoreLastRow = options?.ignoreLastRow ?? false
  const stripBOM = options?.stripBOM ?? true

  // We don't need to compute some of these every time parse() is called,
  // but having them in a more local scope seems to perform better
  const inputLen = input.length,
    delimLen = delimiter.length,
    newlineLen = newline.length,
    commentsLen = comments === false ? 0 : comments.length

  // Establish starting state
  let errors: ParseError[] = []
  let row: string[] = []
  let cursor = 0
  let lastCursor = 0
  let offset = 0 // Byte offset

  if (stripBOM && input.charCodeAt(0) === 0xfeff) {
    cursor = 1
  }

  let nextDelim = input.indexOf(delimiter, cursor)
  let nextNewline = input.indexOf(newline, cursor)
  const quoteCharRegex = new RegExp(escapeRegExp(escapeChar) + escapeRegExp(quoteChar), 'g')
  let quoteSearch = input.indexOf(quoteChar, cursor)

  // Parser loop
  for (;;) {
    // Field has opening quote
    if (input[cursor] === quoteChar) {
      // Start our search for the closing quote where the cursor is
      quoteSearch = cursor

      // Skip the opening quote
      cursor++

      for (;;) {
        // Find closing quote
        quoteSearch = input.indexOf(quoteChar, quoteSearch + 1)

        // No other quotes are found - no other delimiters
        if (quoteSearch === -1) {
          // No closing quote... what a pity
          errors.push({
            type: 'Quotes',
            code: 'MissingQuotes',
            message: 'Quoted field unterminated',
            // row: data.length, // row has yet to be inserted
            index: cursor,
          })
          const last = finish()
          if (last) {
            yield last
          }
          return
        }

        // Closing quote at EOF
        if (quoteSearch === inputLen - 1) {
          const value = input.substring(cursor, quoteSearch).replace(quoteCharRegex, quoteChar)
          const last = finish(value)
          if (last) {
            yield last
          }
          return
        }

        // If this quote is escaped, it's part of the data; skip it
        // If the quote character is the escape character, then check if the next character is the escape character
        if (quoteChar === escapeChar && input[quoteSearch + 1] === escapeChar) {
          quoteSearch++
          continue
        }

        // If the quote character is not the escape character, then check if the previous character was the escape character
        if (quoteChar !== escapeChar && quoteSearch !== 0 && input[quoteSearch - 1] === escapeChar) {
          continue
        }

        if (nextDelim !== -1 && nextDelim < (quoteSearch + 1)) {
          nextDelim = input.indexOf(delimiter, (quoteSearch + 1))
        }
        if (nextNewline !== -1 && nextNewline < (quoteSearch + 1)) {
          nextNewline = input.indexOf(newline, (quoteSearch + 1))
        }
        // Check up to nextDelim or nextNewline, whichever is closest
        const checkUpTo = nextNewline === -1 ? nextDelim : Math.min(nextDelim, nextNewline)
        const spacesBetweenQuoteAndDelimiter = extraSpaces({ index: checkUpTo, input, quoteSearch })

        // Closing quote followed by delimiter or 'unnecessary spaces + delimiter'
        // TODO(SL): replace substr
        if (input.substr(quoteSearch + 1 + spacesBetweenQuoteAndDelimiter, delimLen) === delimiter) {
          row.push(input.substring(cursor, quoteSearch).replace(quoteCharRegex, quoteChar))
          cursor = quoteSearch + 1 + spacesBetweenQuoteAndDelimiter + delimLen

          // If char after following delimiter is not quoteChar, we find next quote char position
          if (input[quoteSearch + 1 + spacesBetweenQuoteAndDelimiter + delimLen] !== quoteChar) {
            quoteSearch = input.indexOf(quoteChar, cursor)
          }
          nextDelim = input.indexOf(delimiter, cursor)
          nextNewline = input.indexOf(newline, cursor)
          break
        }

        const spacesBetweenQuoteAndNewLine = extraSpaces({ index: nextNewline, input, quoteSearch })

        // Closing quote followed by newline or 'unnecessary spaces + newLine'
        if (input.substring(quoteSearch + 1 + spacesBetweenQuoteAndNewLine, quoteSearch + 1 + spacesBetweenQuoteAndNewLine + newlineLen) === newline) {
          row.push(input.substring(cursor, quoteSearch).replace(quoteCharRegex, quoteChar))
          cursor = quoteSearch + 1 + spacesBetweenQuoteAndNewLine + newlineLen
          nextNewline = input.indexOf(newline, cursor)
          nextDelim = input.indexOf(delimiter, cursor) // because we may have skipped the nextDelim in the quoted field
          quoteSearch = input.indexOf(quoteChar, cursor) // we search for first quote in next line

          /** Yields the row and resets row & errors. */
          yield getResult()
          row = []
          errors = []

          break
        }

        // Checks for valid closing quotes are complete (escaped quotes or quote followed by EOF/delimiter/newline) -- assume these quotes are part of an invalid text string
        errors.push({
          type: 'Quotes',
          code: 'InvalidQuotes',
          message: 'Trailing quote on quoted field is malformed',
          // row: data.length, // row has yet to be inserted
          index: cursor,
        })

        quoteSearch++
        continue
      }

      continue
    }

    // Comment found at start of new line
    if (comments && row.length === 0 && input.substring(cursor, cursor + commentsLen) === comments) {
      if (nextNewline === -1) {
        // Comment ends at EOF
        return
      }
      cursor = nextNewline + newlineLen
      nextNewline = input.indexOf(newline, cursor)
      nextDelim = input.indexOf(delimiter, cursor)
      continue
    }

    // Next delimiter comes before next newline, so we've reached end of field
    if (nextDelim !== -1 && (nextDelim < nextNewline || nextNewline === -1)) {
      row.push(input.substring(cursor, nextDelim))
      cursor = nextDelim + delimLen
      // we look for next delimiter char
      nextDelim = input.indexOf(delimiter, cursor)
      continue
    }

    // End of row
    if (nextNewline !== -1) {
      row.push(input.substring(cursor, nextNewline))
      cursor = nextNewline + newlineLen
      nextNewline = input.indexOf(newline, cursor)

      yield getResult()
      row = []
      errors = []

      continue
    }

    break
  }

  const last = finish()
  if (last) {
    yield last
  }
  return

  /**
   * Appends the remaining input from cursor to the end into
   * row, saves the row, calls step, and returns the results.
   * @param value The remaining input to append
   * @returns The results object
   */
  function finish(value?: string): ParseResult | undefined {
    if (ignoreLastRow)
      return
    value ??= input.substring(cursor)
    row.push(value)
    cursor = inputLen
    // lastCursor = cursor
    return getResult()
  }

  /**
   * Returns an object with the results, errors, and meta.
   * @returns The results object
   */
  function getResult(): ParseResult {
    // the row started at lastCursor, ended at cursor
    const string = input.substring(lastCursor, cursor)
    const byteCount = new TextEncoder().encode(string).length

    const result = {
      row,
      errors: errors,
      meta: {
        delimiter,
        newline,
        // cursor: lastCursor,
        cursor,
        offset,
        byteCount,
      },
    }
    lastCursor = cursor
    offset += byteCount

    return result
  }
}

/**
 * Checks if there are extra spaces after closing quote and given index without any text
 * if Yes, returns the number of spaces
 * @param options Arguments
 * @param options.input The input string
 * @param options.index The index to check up to
 * @param options.quoteSearch The position of the closing quote
 * @returns number of spaces
 */
function extraSpaces({ input, index, quoteSearch }: {
  input: string
  index: number
  quoteSearch: number
}) {
  let spaceLength = 0
  if (index !== -1) {
    const textBetweenClosingQuoteAndIndex = input.substring(quoteSearch + 1, index)
    if (textBetweenClosingQuoteAndIndex && textBetweenClosingQuoteAndIndex.trim() === '') {
      spaceLength = textBetweenClosingQuoteAndIndex.length
    }
  }
  return spaceLength
}
