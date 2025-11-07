export interface ChunkResult {
  data: string[]
  metadata: {
    byteCount: number
    offset: number
  }
}

/**
 * Parses a chunk of bytes into CSV data.
 * @param options Options for parsing the chunk.
 * @param options.bytes The chunk of bytes to parse.
 * @yields Parsed data and metadata.
 * @returns A generator yielding parsed data and metadata.
 */
export function* parseChunk({
  bytes,
}: {
  bytes: Uint8Array
}): Generator<ChunkResult, void, unknown> {
  // TODO(SL): reuse decoder?
  const decoder = new TextDecoder('utf-8')

  const text = decoder.decode(bytes)

  yield {
    data: [text],
    metadata: {
      byteCount: bytes.length,
      offset: 0,
    },
  }
}
