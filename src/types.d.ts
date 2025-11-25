/**
 * Allowed newlines
 */
export type Newline = '\n' | '\r' | '\r\n'

/**
 * Parser state
 * 'default' - outside quotes
 * 'inQuotes' - inside quotes
 */
export type State = 'default' | 'inQuotes'

/**
 * Options for parsing CSV data
 */
export interface ParseOptions {
  /** The delimiter used in the CSV data. If not provided, the parser will attempt to guess it. */
  delimiter?: string
  /** The newline character(s) used in the CSV data. Defaults to '\n'. */
  newline?: Newline
  /** The quote character used in the CSV data. Defaults to '"'. */
  quoteChar?: string
  /** The escape character used in the CSV data. Defaults to the quote character. */
  escapeChar?: string
  /** The comment character or boolean to indicate comments. Defaults to false (don't strip comments). */
  comments?: boolean | string
  /** The initial state for the parser. Use 'detect' to automatically detect the initial state. Defaults to 'default'. */
  initialState?: State | 'detect'
}

/** Error structure for delimiter detection */
export interface DelimiterError {
  type: 'Delimiter'
  code: 'UndetectableDelimiter'
  message: string
}

/** Error structure */
export interface ParseError {
  /** A generalization of the error */
  type: 'Quotes' | 'Delimiter' | 'FieldMismatch' | 'Decoding'
  /** Standardized error code */
  code:
    | 'MissingQuotes'
    | 'UndetectableDelimiter'
    | 'TooFewFields'
    | 'TooManyFields'
    | 'InvalidQuotes'
    | 'InvalidData'
  /** Human-readable details */
  message: string
}

/**
 * Metadata about the parsed row
 */
export interface ParseMeta {
  /** Delimiter used */
  delimiter: string
  /** Line break sequence used */
  newline: Newline
  /** Byte offset at the start of the row */
  byteOffset: number
  /** Number of bytes consumed in this row */
  byteCount: number
  /** Number of characters consumed in this row */
  charCount: number
}

/**
 * A parse result always contains three objects: row, errors, and meta.
 * row and errors are arrays, and meta is an object.
 */
export interface ParseResult {
  /**
   * the cells of the parsed row.
   */
  row: string[]
  /**
   * an array of errors.
   */
  errors: ParseError[]
  /**
   * contains extra information about the parse, such as delimiter used,
   * the newline sequence, etc.
   */
  meta: ParseMeta
}
