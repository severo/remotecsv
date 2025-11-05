const defaultChunkSize = 1024 * 1024 // 1MB

export function toUrl(text: string): {
  url: string
  fileSize: number
  revoke: () => void
} {
  // add an extra space to fix https://github.com/nodejs/node/issues/60382
  const blob = new Blob([text + ' '])
  const url = URL.createObjectURL(blob)
  return {
    url,
    fileSize: blob.size - 1, // subtract the extra space
    revoke: () => {
      URL.revokeObjectURL(url)
    },
  }
}

export async function* parse(
  url: string,
  options: {
    chunkSize?: number
    fileSize?: number
  },
): AsyncGenerator<string> {
  const chunkSize = options.chunkSize ?? defaultChunkSize
  let fileSize = options.fileSize
  const decoder = new TextDecoder('utf-8')

  let rangeStart = 0
  while (rangeStart < (fileSize ?? Number.POSITIVE_INFINITY)) {
    // Always request one extra byte, due to https://github.com/nodejs/node/issues/60382
    const extraByte = 1
    const rangeEnd = rangeStart + chunkSize - 1 + extraByte

    const result = await fetchChunk({ url, rangeStart, rangeEnd })

    fileSize ??= result.fileSize
    const bytesToDecode = Math.min(chunkSize, fileSize - rangeStart)
    const chunk = decoder.decode(result.bytes.subarray(0, bytesToDecode))

    yield chunk

    rangeStart += chunkSize
  }
}

async function fetchChunk({ url, rangeStart, rangeEnd }: { url: string, rangeStart: number, rangeEnd: number }): Promise<{
  bytes: Uint8Array
  fileSize: number
}> {
  const response = await fetch(url, {
    headers: {
      Range: `bytes=${rangeStart}-${rangeEnd}`,
    },
  })
  if (response.status === 416) {
    // Requested Range Not Satisfiable
    throw new Error(
      `Requested range not satisfiable: ${rangeStart}-${rangeEnd}`,
    )
  }
  if (response.status === 200) {
    // Server ignored Range header
    throw new Error(`Server did not support range requests.`)
  }
  if (response.status !== 206) {
    throw new Error(
      `Failed to fetch chunk: ${response.status} ${response.statusText}`,
    )
  }
  // Check the content-range header
  const contentRange = response.headers.get('content-range')
  const contentLength = response.headers.get('content-length')
  if (!contentRange || !contentLength) {
    throw new Error(`Missing content-range or content-length header.`)
  }
  const last = contentRange.split('/')[1]
  if (last === undefined) {
    throw new Error(`Invalid content-range header: ${contentRange}`)
  }
  const fileSize = parseInt(last)
  if (isNaN(fileSize)) {
    throw new Error(`Invalid file size in content-range header: ${last}`)
  }

  // Decode exactly chunkSize bytes or less if it's the last chunk
  const bytes = await response.bytes()

  return { bytes, fileSize }
}
