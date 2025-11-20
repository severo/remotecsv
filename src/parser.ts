// Adapted from PapaParse (https://www.papaparse.com/)
import { validateAndSetDefaultParseOptions } from './options/parseOptions'
import type { ParseError, ParseResult } from './types'
import type { ParseOptions } from './types'
import { escapeRegExp } from './utils'

/**
 * Parses the text with the given options
 * @param text The string to parse
 * @param options The options for parsing
 * @param options.delimiter The delimiter used in the CSV data. Defaults to ','.
 * @param options.newline The newline used in the CSV data. Defaults to '\n'.
 * @param options.quoteChar The quote character used in the CSV data. Defaults to '"'.
 * @param options.escapeChar The escape character used in the CSV data. Defaults to the quote character.
 * @param options.comments The comment character or boolean to indicate comments. Defaults to false (don't strip comments).
 * @param options.initialState Initial state for the parser. Use 'detect' to automatically detect the initial state. Defaults to 'default'.
 * @param options.ignoreLastRow Whether to ignore the last row. Defaults to false.
 * @param options.stripBOM Whether to strip the BOM character at the start of the text. Defaults to true.
 * @yields The parse results, one row at a time
 * @returns A generator yielding parse results
 */
export function* parse(text: string, options: ParseOptions & {
  ignoreLastRow?: boolean
  stripBOM?: boolean
} = {}): Generator<ParseResult, void, unknown> {
  const {
    delimiter,
    newline,
    comments,
    quoteChar,
    escapeChar,
    initialState,
  } = validateAndSetDefaultParseOptions(options)
  const ignoreLastRow = options?.ignoreLastRow ?? false
  const stripBOM = options?.stripBOM ?? true

  // If initialState is 'inQuotes', we need to prepend a quote to the text
  let prependedBytes = 0
  let prependedChars = 0
  if (initialState === 'inQuotes') {
    if (stripBOM && text.charCodeAt(0) === 0xfeff) {
      // If there's a BOM and we will strip it, we need to insert the quote after the BOM
      text = '\ufeff' + quoteChar + text.slice(1)
    }
    else {
      text = quoteChar + text
    }
    prependedBytes = new TextEncoder().encode(quoteChar).length
    prependedChars = quoteChar.length
  }

  // We don't need to compute some of these every time parse() is called,
  // but having them in a more local scope seems to perform better
  const textLen = text.length,
    delimLen = delimiter.length,
    newlineLen = newline.length,
    commentsLen = comments === false ? 0 : comments.length

  // Establish starting state
  let errors: ParseError[] = []
  let row: string[] = []
  let cursor = 0
  let lastCursor = 0
  let byteOffset = 0
  let isFirstRow = true

  if (stripBOM && text.charCodeAt(0) === 0xfeff) {
    cursor += 1
  }

  let nextDelim = text.indexOf(delimiter, cursor)
  let nextNewline = text.indexOf(newline, cursor)
  const quoteCharRegex = new RegExp(escapeRegExp(escapeChar) + escapeRegExp(quoteChar), 'g')
  let quoteSearch = text.indexOf(quoteChar, cursor)

  // Parser loop
  for (;;) {
    // Field has opening quote
    if (text[cursor] === quoteChar) {
      // Start our search for the closing quote where the cursor is
      quoteSearch = cursor

      // Skip the opening quote
      cursor++

      for (;;) {
        // Find closing quote
        quoteSearch = text.indexOf(quoteChar, quoteSearch + 1)

        // No other quotes are found - no other delimiters
        if (quoteSearch === -1) {
          // No closing quote... what a pity
          errors.push({
            type: 'Quotes',
            code: 'MissingQuotes',
            message: 'Quoted field unterminated',
          })
          const last = finish()
          if (last) {
            yield last
          }
          return
        }

        // Closing quote at EOF
        if (quoteSearch === textLen - 1) {
          const value = text.substring(cursor, quoteSearch).replace(quoteCharRegex, quoteChar)
          const last = finish(value)
          if (last) {
            yield last
          }
          return
        }

        // If this quote is escaped, it's part of the data; skip it
        // If the quote character is the escape character, then check if the next character is the escape character
        if (quoteChar === escapeChar && text[quoteSearch + 1] === escapeChar) {
          quoteSearch++
          continue
        }

        // If the quote character is not the escape character, then check if the previous character was the escape character
        if (quoteChar !== escapeChar && quoteSearch !== 0 && text[quoteSearch - 1] === escapeChar) {
          continue
        }

        if (nextDelim !== -1 && nextDelim < (quoteSearch + 1)) {
          nextDelim = text.indexOf(delimiter, (quoteSearch + 1))
        }
        if (nextNewline !== -1 && nextNewline < (quoteSearch + 1)) {
          nextNewline = text.indexOf(newline, (quoteSearch + 1))
        }
        // Check up to nextDelim or nextNewline, whichever is closest
        const checkUpTo = nextNewline === -1 ? nextDelim : Math.min(nextDelim, nextNewline)
        const spacesBetweenQuoteAndDelimiter = extraSpaces({ index: checkUpTo, text, quoteSearch })

        // Closing quote followed by delimiter or 'unnecessary spaces + delimiter'
        const startA = quoteSearch + 1 + spacesBetweenQuoteAndDelimiter
        const endA = startA + delimLen
        if (text.substring(startA, endA) === delimiter) {
          row.push(text.substring(cursor, quoteSearch).replace(quoteCharRegex, quoteChar))
          cursor = endA

          // If char after following delimiter is not quoteChar, we find next quote char position
          if (text[endA] !== quoteChar) {
            quoteSearch = text.indexOf(quoteChar, cursor)
          }
          nextDelim = text.indexOf(delimiter, cursor)
          nextNewline = text.indexOf(newline, cursor)
          break
        }

        const spacesBetweenQuoteAndNewLine = extraSpaces({ index: nextNewline, text, quoteSearch })

        // Closing quote followed by newline or 'unnecessary spaces + newLine'
        const startB = quoteSearch + 1 + spacesBetweenQuoteAndNewLine
        const endB = startB + newlineLen
        if (text.substring(startB, endB) === newline) {
          row.push(text.substring(cursor, quoteSearch).replace(quoteCharRegex, quoteChar))
          cursor = endB
          nextNewline = text.indexOf(newline, cursor)
          nextDelim = text.indexOf(delimiter, cursor) // because we may have skipped the nextDelim in the quoted field
          quoteSearch = text.indexOf(quoteChar, cursor) // we search for first quote in next line

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
        })

        quoteSearch++
        continue
      }

      continue
    }

    // Comment found at start of new line
    if (comments && row.length === 0 && text.substring(cursor, cursor + commentsLen) === comments) {
      if (nextNewline === -1) {
        // Comment ends at EOF
        return
      }
      cursor = nextNewline + newlineLen
      nextNewline = text.indexOf(newline, cursor)
      nextDelim = text.indexOf(delimiter, cursor)
      continue
    }

    // Next delimiter comes before next newline, so we've reached end of field
    if (nextDelim !== -1 && (nextDelim < nextNewline || nextNewline === -1)) {
      row.push(text.substring(cursor, nextDelim))
      cursor = nextDelim + delimLen
      // we look for next delimiter char
      nextDelim = text.indexOf(delimiter, cursor)
      continue
    }

    // End of row
    if (nextNewline !== -1) {
      row.push(text.substring(cursor, nextNewline))
      cursor = nextNewline + newlineLen
      nextNewline = text.indexOf(newline, cursor)

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
   * Appends the remaining text from cursor to the end into
   * row, saves the row, calls step, and returns the results.
   * @param value The remaining text to append
   * @returns The results object
   */
  function finish(value?: string): ParseResult | undefined {
    if (ignoreLastRow)
      return
    value ??= text.substring(cursor)
    row.push(value)
    cursor = textLen
    return getResult()
  }

  /**
   * Returns an object with the results, errors, and meta.
   * @returns The results object
   */
  function getResult(): ParseResult {
    // the row started at lastCursor, ended at cursor
    const string = text.substring(lastCursor, cursor)
    const byteCount = new TextEncoder().encode(string).length
    const charCount = string.length + (isFirstRow ? prependedChars : 0)
    isFirstRow = false

    const result = {
      row,
      errors: errors,
      meta: {
        delimiter,
        newline,
        byteOffset: byteOffset - prependedBytes,
        byteCount,
        charCount,
      },
    }
    lastCursor = cursor
    byteOffset += byteCount

    return result
  }
}

/**
 * Checks if there are extra spaces after closing quote and given index without any text
 * if Yes, returns the number of spaces
 * @param options Arguments
 * @param options.text The text string
 * @param options.index The index to check up to
 * @param options.quoteSearch The position of the closing quote
 * @returns number of spaces
 */
function extraSpaces({ text, index, quoteSearch }: {
  text: string
  index: number
  quoteSearch: number
}) {
  let spaceLength = 0
  if (index !== -1) {
    const textBetweenClosingQuoteAndIndex = text.substring(quoteSearch + 1, index)
    if (textBetweenClosingQuoteAndIndex && textBetweenClosingQuoteAndIndex.trim() === '') {
      spaceLength = textBetweenClosingQuoteAndIndex.length
    }
  }
  return spaceLength
}
