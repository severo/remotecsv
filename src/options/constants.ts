export const defaultChunkSize = 1024 * 1024 // 1MB

export const RECORD_SEP = String.fromCharCode(30)
export const UNIT_SEP = String.fromCharCode(31)
export const BYTE_ORDER_MARK = '\ufeff'
export const BAD_DELIMITERS = ['\r', '\n', '"', BYTE_ORDER_MARK]

export const DefaultDelimiter = ',' // Used if not specified and detection fails
