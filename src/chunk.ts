export function* parseChunk({
  bytes,
  offset,
}: {
  bytes: Uint8Array
  offset: number
}) {
  // TODO(SL): reuse decoder?
  const decoder = new TextDecoder('utf-8')
  const text = decoder.decode(bytes)

  yield {
    text,
    offset,
    byteCount: bytes.length,
  }
}
