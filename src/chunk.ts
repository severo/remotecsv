/**
 * Parses a chunk of bytes into CSV data.
 *
 * @param bytes The chunk of bytes to parse.
 * @return A generator yielding parsed data and metadata.
 */
export function* parseChunk({
  bytes,
}: {
  bytes: Uint8Array
}): Generator<{
  data: string[]
  metadata: {
    byteCount: number
  }
}> {
  // TODO(SL): reuse decoder?
  const decoder = new TextDecoder('utf-8')

  const text = decoder.decode(bytes)

  yield {
    data: [text],
    metadata: {
      byteCount: bytes.length,
    },
  }
}
