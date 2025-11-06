import { checkStrictlyPositiveInteger, checkNonNegativeInteger } from './check'
import { fetchChunk } from './fetch'
import { defaultChunkSize, defaultFrom, defaultTo } from './constants'

/**
 * Parses a remote text file in chunks using HTTP range requests.
 *
 * @param url The URL of the remote text file.
 * @param options Options for parsing.
 * @param options.chunkSize The size of each chunk to fetch. It must be a strictly positive integer. Default is 1MB.
 * @param options.from The start byte to begin parsing from. It must be a non-negative integer. Default is 0.
 * @param options.to The end byte to stop parsing at (inclusive). It must be a non-negative integer. Default is the end of the file.
 * @param options.requestInit Optional fetch request initialization parameters.
 * @returns An async generator that yields chunks of text.
 */
export async function* parse(
  url: string,
  options?: {
    chunkSize?: number
    from?: number
    to?: number
    requestInit?: RequestInit
  },
): AsyncGenerator<{
  text: string
  offset: number
  byteCount: number
}> {
  const chunkSize = checkStrictlyPositiveInteger(options?.chunkSize) ?? defaultChunkSize
  const from = checkNonNegativeInteger(options?.from) ?? defaultFrom
  let to = checkNonNegativeInteger(options?.to) ?? defaultTo
  if (to !== undefined && to < from) {
    // TODO(SL): should we accept negative values (from the end)?
    throw new Error(`Invalid options.to: ${to}`)
  }
  const decoder = new TextDecoder('utf-8')

  let rangeStart = from
  while (rangeStart <= to) {
    // Always request one extra byte, due to https://github.com/nodejs/node/issues/60382
    const extraByte = 1
    const rangeEnd = rangeStart + chunkSize - 1 + extraByte

    const result = await fetchChunk({ url, rangeStart, rangeEnd, requestInit: options?.requestInit })
    // Set the end limit (to) to the last byte in the file
    // It will ensure the loop will finish, and if it was greater, the number of iterations is reduced.
    // Note that result.fileSize is ensured to be a non-negative integer.
    to = Math.min(to, result.fileSize - 1)

    // Only decode up to the chunkSize or the last requested byte (to remove the extra byte).
    const bytesToDecode = result.bytes.subarray(0, Math.min(chunkSize, to - rangeStart + 1))
    const text = decoder.decode(bytesToDecode)

    yield {
      text,
      offset: rangeStart,
      byteCount: bytesToDecode.length,
    }

    rangeStart += chunkSize
  }
}
