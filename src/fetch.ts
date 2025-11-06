// TODO(SL): return a stream reader?
// TODO(SL): let pass a custom fetch function?

/**
 * Fetches a chunk of a remote file using HTTP range requests.
 *
 * @param options Options for fetching the chunk.
 * @param options.url The URL of the remote file.
 * @param options.rangeStart The start byte of the range to fetch.
 * @param options.rangeEnd The end byte of the range to fetch.
 * @param options.requestInit Optional fetch request initialization parameters.
 * @returns An object containing the fetched bytes and the total file size provided in the response headers.
 *   The file size is a non-negative integer.
 */
export async function fetchChunk({
  url, rangeStart, rangeEnd, requestInit,
}: {
  url: string
  rangeStart: number
  rangeEnd: number
  requestInit?: RequestInit
}): Promise<{
  bytes: Uint8Array
  fileSize: number
}> {
  const mergedRequestInit: RequestInit = {
    ...requestInit,
    headers: {
      ...(requestInit?.headers ?? {}),
      Range: `bytes=${rangeStart}-${rangeEnd}`,
    },
  }
  // TODO(SL): let pass a custom fetch function?
  const response = await fetch(url, mergedRequestInit)
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
  if (!Number.isSafeInteger(fileSize) || fileSize < 0) {
    throw new Error(`Invalid file size in content-range header: ${last}`)
  }

  // Decode exactly chunkSize bytes or less if it's the last chunk
  const bytes = await response.bytes()

  return { bytes, fileSize }
}
