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
