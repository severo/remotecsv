import type { DelimiterError, ParseOptions, State } from '../types'
import { validateComments } from './comments'
import { DefaultDelimiter } from './constants'
import { guessDelimiter, validateDelimiter } from './delimiter'
import { validateEscapeChar } from './escapeChar'
import { type EvaluationScore, getScore, isBetterScore } from './initialState'
import { guessLineEndings, validateNewline } from './newline'
import { validateQuoteChar } from './quoteChar'

interface OptionsResult {
  parseOptions: ParseOptions
  error?: DelimiterError
}

/**
 * Validates and guesses parsing options.
 * @param parseOptions The parsing options to validate and guess.
 * @param parseOptions.delimiter The delimiter used in the CSV data. Defaults to ','.
 * @param parseOptions.newline The newline used in the CSV data. Defaults to '\n'.
 * @param parseOptions.quoteChar The quote character used in the CSV data. Defaults to '"'.
 * @param parseOptions.escapeChar The escape character used in the CSV data. Defaults to the quote character.
 * @param parseOptions.comments The comment character or boolean to indicate comments.
 * @param parseOptions.initialState The initial state for the parser. Use 'detect' to automatically detect the initial state. Defaults to 'default'.
 * @param params The parameters for validation and guessing.
 * @param params.text The string to use for guessing.
 * @param params.delimitersToGuess The list of delimiters to guess from.
 * @returns The validated and guessed parsing options, and the delimiter error (if any).
 */
export function validateAndGuessParseOptions(parseOptions: ParseOptions, { text, delimitersToGuess}: {
  text: string
  delimitersToGuess?: string[]
}): OptionsResult {
  // Guess initial state if needed
  const initialState = parseOptions.initialState ?? 'default'
  if (initialState === 'detect') {
    const result = validateAndGuessParseOptions(
      { ...parseOptions, initialState: 'default' },
      { text, delimitersToGuess },
    )
    let best: { state: State, score: EvaluationScore, result: OptionsResult } = {
      state: 'default' as const,
      score: getScore({ text, parseOptions: result.parseOptions }),
      result,
    }
    for (const candidateState of ['inQuotes' as const]) {
      const result = validateAndGuessParseOptions(
        { ...parseOptions, initialState: candidateState },
        { text, delimitersToGuess },
      )
      const score = getScore({ text, parseOptions: result.parseOptions })
      if (!best || isBetterScore({ best: best.score, candidate: score })) {
        best = { state: candidateState, score, result }
      }
    }
    return best.result
  }

  // Validate and guess other options
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
    parseOptions: { delimiter, newline, quoteChar, escapeChar, comments, initialState },
    error,
  }
}

export interface ValidParseOptions {
  delimiter: string
  newline: '\n' | '\r' | '\r\n'
  comments: string | false
  quoteChar: string
  escapeChar: string
  initialState: State
}

/**
 * Validates and fills in default options
 * @param parseOptions The parsing options to validate and guess.
 * @param parseOptions.delimiter The delimiter used in the CSV data. Defaults to ','.
 * @param parseOptions.newline The newline used in the CSV data. Defaults to '\n'.
 * @param parseOptions.quoteChar The quote character used in the CSV data. Defaults to '"'.
 * @param parseOptions.escapeChar The escape character used in the CSV data. Defaults to the quote character.
 * @param parseOptions.comments The comment character or boolean to indicate comments.
 * @param parseOptions.initialState The initial state for the parser. 'detect' is not accepted here. Defaults to 'default'.
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

  // initialState must not be 'detect' here
  const initialState = parseOptions?.initialState ?? 'default'
  if (initialState === 'detect') {
    throw new Error('Initial state \'detect\' is not allowed.')
  }

  return {
    delimiter,
    newline,
    comments,
    quoteChar,
    escapeChar,
    initialState,
  }
}
