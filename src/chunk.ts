import { getDelimiter } from './delimiter'
import { getNewline } from './newline'
import { getQuote } from './quote'

export interface ChunkResult {
  data: string[]
  metadata: {
    byteCount: number
    offset: number
    delimiter: string
    newline: string
    quote: string
  }
}

/**
 * Parses a chunk of bytes into CSV data.
 * @param options Options for parsing the chunk.
 * @param options.bytes The chunk of bytes to parse.
 * @param options.delimiter The delimiter used in the CSV data. Defaults to ','.
 * @param options.newline The newline used in the CSV data. Defaults to '\n'.
 * @param options.quote The quote character used in the CSV data. Defaults to '"'.
 * @yields Parsed data and metadata.
 * @returns A generator yielding parsed data and metadata.
 */
export function* parseChunk({
  bytes,
  delimiter,
  newline,
  quote,
}: {
  bytes: Uint8Array
  delimiter?: string
  newline?: string
  quote?: string
}): Generator<ChunkResult, void, unknown> {
  delimiter ??= getDelimiter()
  newline ??= getNewline()
  quote ??= getQuote()

  // TODO(SL): reuse decoder?
  const decoder = new TextDecoder('utf-8')

  const text = decoder.decode(bytes)

  yield {
    data: [text],
    metadata: {
      byteCount: bytes.length,
      offset: 0,
      delimiter,
      newline,
      quote,
    },
  }
}
