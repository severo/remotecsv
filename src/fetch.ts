/** Represents a chunk of bytes fetched from a remote file. */
export interface ByteChunk {
  /** The bytes fetched from the remote file. */
  bytes: Uint8Array
  /** The total file size of the remote file. */
  fileSize: number
}

/**
 * Fetches a chunk of a remote file.
 *
 * The implementation includes a partial workaround for a Node.js bug
 * (https://github.com/nodejs/node/issues/60382) by always requesting
 * one extra byte. For the workaround to be complete, in the case of
 * bug (Node.js, object URL), the caller must create an object URL with
 * an extra byte at the end, and pass lastByte with the correct value.
 *
 * For example:
 * ```js
 * const blob = new Blob([text + ' '])
 * const url = URL.createObjectURL(blob)
 * const fileSize = blob.size - 1 // subtract the extra space
 * const result = fetchChunk({ url, chunkSize, firstByte, maxLastByte: fileSize - 1 })
 * ```
 *
 * See `toBlobURL` in `src/url.ts` for a helper function that creates such URLs.
 * @param options Options for fetching the chunk.
 * @param options.url The URL of the remote file.
 * @param options.chunkSize The size of the chunk to fetch.
 * @param options.firstByte The first byte of the chunk to fetch. It must be a non-negative integer.
 * @param options.maxLastByte An upper bound on the last chunk byte (inclusive). If the chunk exceeds this byte, it will be trimmed. It must be a non-negative integer.
 * @param options.requestInit Optional fetch request initialization parameters.
 * @returns An object containing the fetched bytes and the file size.
 */
export async function fetchChunk({
  url,
  chunkSize,
  firstByte,
  maxLastByte,
  requestInit,
}: {
  url: string
  chunkSize: number
  firstByte: number
  maxLastByte?: number
  requestInit?: RequestInit
}): Promise<ByteChunk> {
  const extraByte = 1
  const chunkLastByte = firstByte + chunkSize - 1 + extraByte
  const { bytes: allBytes, fileSize } = await fetchRange({ url, firstByte, lastByte: chunkLastByte, requestInit })
  const bytes = allBytes.subarray(0, Math.min(
    // no more than the chunk size (without the extra byte)
    chunkSize,
    // no more than the max last byte
    (maxLastByte ?? Infinity) - firstByte + 1,
  ))
  return { bytes, fileSize }
}

/**
 * Fetches a range of a remote file using HTTP range.
 * @param options Options for fetching the range.
 * @param options.url The URL of the remote file.
 * @param options.firstByte The first byte of the range to fetch.
 * @param options.lastByte The last byte of the range to fetch.
 * @param options.requestInit Optional fetch request initialization parameters.
 * @returns An object containing the fetched bytes and the total file size provided in the response headers.
 *   The file size is a non-negative integer.
 */
export async function fetchRange({
  url, firstByte, lastByte, requestInit,
}: {
  url: string
  firstByte: number
  lastByte: number
  requestInit?: RequestInit
}): Promise<ByteChunk> {
  const mergedRequestInit: RequestInit = {
    ...requestInit,
    headers: {
      ...(requestInit?.headers ?? {}),
      Range: `bytes=${firstByte}-${lastByte}`,
    },
  }
  const response = await fetch(url, mergedRequestInit)
  // Note that the range fetch might throw if the range is invalid, and the URL is a Blob URL.
  // With "normal" URLs (http, https), the server should return a 416 status code instead.
  // See the spec https://fetch.spec.whatwg.org/#scheme-fetch.

  if (response.status === 416) {
    // Requested Range Not Satisfiable
    throw new Error(
      `Requested range not satisfiable: ${firstByte}-${lastByte}`,
    )
  }
  if (response.status === 200) {
    // Server ignored Range header
    throw new Error(`Server did not support range requests.`)
  }
  if (response.status !== 206) {
    throw new Error(
      `Failed to fetch range: ${response.status} ${response.statusText}`,
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
  const bytes = await response.bytes()
  return { bytes, fileSize }
}
