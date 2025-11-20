export type Newline = '\n' | '\r' | '\r\n'

export type State = 'default' | 'inQuotes'

export interface ParseOptions {
  delimiter?: string
  newline?: Newline
  quoteChar?: string
  escapeChar?: string
  comments?: boolean | string
  initialState?: State | 'detect'
}

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
