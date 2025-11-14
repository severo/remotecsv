/** Error structure */
export interface ParseError {
  /** A generalization of the error */
  type: 'Quotes' | 'Delimiter' | 'FieldMismatch'
  /** Standardized error code */
  code:
    | 'MissingQuotes'
    | 'UndetectableDelimiter'
    | 'TooFewFields'
    | 'TooManyFields'
    | 'InvalidQuotes'
  /** Human-readable details */
  message: string
  /** Row index of parsed data where error is */
  row?: number | undefined
  /** Index within the row where error is */
  index?: number | undefined
}

export interface ParseMeta {
  /** Delimiter used */
  delimiter: string
  /** Line break sequence used */
  newline: string
  /** Character position after the parsed row */
  cursor: number
  /** Byte position where parsing started */
  //   firstByte: number
  /** Number of bytes parsed, including line breaks, BOM, spaces, etc. */
  //   numBytes: number

  /** Byte offset */
  byteOffset: number
  /** Number of bytes consumed in this row */
  byteCount: number
}

/**
 * A parse result always contains three objects: data, errors, and meta.
 * Data and errors are arrays, and meta is an object. In the step callback, the data array will only contain one element.
 */
export interface ParseResult {
  /**
   * the cells of the parsed row.
   */
  row: string[]
  /** an array of errors. */
  errors: ParseError[]
  /**
   * contains extra information about the parse, such as delimiter used,
   * the newline sequence, whether the process was aborted, etc.
   * Properties in this object are not guaranteed to exist in all situations.
   */
  meta: ParseMeta
}
