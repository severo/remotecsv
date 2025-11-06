export function* parseChunk({
  bytes,
}: {
  bytes: Uint8Array
}): Generator<{
  text: string
  byteCount: number
}> {
  // TODO(SL): reuse decoder?
  const decoder = new TextDecoder('utf-8')

  const text = decoder.decode(bytes)

  yield {
    text,
    byteCount: bytes.length,
  }
}
