import { setChunkSize } from './check'
import { fetchChunk } from './fetch'

/**
 * Parses a remote text file in chunks using HTTP range requests.
 *
 * @param url The URL of the remote text file.
 * @param options Options for parsing.
 * @param options.chunkSize The size of each chunk to fetch. Default is 1MB.
 * @param options.fileSize The total size of the file in bytes. If not provided, it will be determined from the first chunk.
 * @param options.requestInit Optional fetch request initialization parameters.
 * @returns An async generator that yields chunks of text.
 */
export async function* parse(
  url: string,
  options?: {
    chunkSize?: number
    fileSize?: number
    requestInit?: RequestInit
  },
): AsyncGenerator<{
  text: string
  offset: number
  byteCount: number
}> {
  const chunkSize = setChunkSize(options?.chunkSize)
  let fileSize = options?.fileSize
  const decoder = new TextDecoder('utf-8')

  let rangeStart = 0
  while (rangeStart < (fileSize ?? Number.POSITIVE_INFINITY)) {
    // Always request one extra byte, due to https://github.com/nodejs/node/issues/60382
    const extraByte = 1
    const rangeEnd = rangeStart + chunkSize - 1 + extraByte

    const result = await fetchChunk({ url, rangeStart, rangeEnd, requestInit: options?.requestInit })

    fileSize ??= result.fileSize
    const bytesToDecode = Math.min(chunkSize, fileSize - rangeStart)
    const text = decoder.decode(result.bytes.subarray(0, bytesToDecode))

    yield {
      text,
      offset: rangeStart,
      byteCount: bytesToDecode,
    }

    rangeStart += chunkSize
  }
}
