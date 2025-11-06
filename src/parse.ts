import { checkNonNegativeInteger, checkStrictlyPositiveInteger } from './check'
import { parseChunk } from './chunk'
import { defaultChunkSize, defaultFirstByte, defaultLastByte } from './constants'
import { fetchChunk } from './fetch'

/**
 * Parses a remote text file in chunks using HTTP range requests.
 *
 * @param url The URL of the remote text file.
 * @param options Options for parsing.
 * @param options.chunkSize The size of each chunk to fetch. It must be a strictly positive integer. Default is 1MB.
 * @param options.firstByte The byte where parsing starts. It must be a non-negative integer. Default is 0.
 * @param options.lastByte The last byte parsed (inclusive). It must be a non-negative integer. Default is the end of the file.
 * @param options.requestInit Optional fetch request initialization parameters.
 * @returns An async generator that yields chunks of text.
 */
export async function* parse(
  url: string,
  options?: {
    chunkSize?: number
    firstByte?: number
    lastByte?: number
    requestInit?: RequestInit
  },
): AsyncGenerator<{
  text: string
  offset: number
  byteCount: number
}> {
  const chunkSize = checkStrictlyPositiveInteger(options?.chunkSize) ?? defaultChunkSize
  // TODO(SL): should we accept negative values (from the end)?
  let firstByte = checkNonNegativeInteger(options?.firstByte) ?? defaultFirstByte
  let lastByte = checkNonNegativeInteger(options?.lastByte) ?? defaultLastByte
  if (lastByte !== undefined && lastByte < firstByte) {
    throw new Error('lastByte must be greater than firstByte')
  }

  let cursor = firstByte
  let bytes: Uint8Array<ArrayBufferLike> = new Uint8Array(0)
  while (true) {
    // Always request one extra byte, due to https://github.com/nodejs/node/issues/60382
    const extraByte = 1
    const chunkLastByte = firstByte + chunkSize - 1 + extraByte
    const { bytes: allBytes, fileSize } = await fetchChunk({ url, firstByte, lastByte: chunkLastByte, requestInit: options?.requestInit })
    // Set the end limit (to) to the last byte in the file
    // It will ensure the loop will finish, and if it was greater, the number of iterations is reduced.
    // Note that result.fileSize is ensured to be a non-negative integer.
    lastByte = Math.min(lastByte, fileSize - 1)
    // Only decode up to the chunkSize or the last requested byte (to remove the extra byte).
    const fetchedBytes = allBytes.subarray(0, Math.min(chunkSize, lastByte - firstByte + 1))

    // Concatenate previous bytes with current bytes
    if (bytes.length === 0) {
      bytes = fetchedBytes
    }
    else {
      // TODO(SL): are the following TODOs overkill?
      // TODO(SL): avoid copying?
      // TODO(SL): consider using a buffer pool: https://medium.com/@artemkhrenov/sharedarraybuffer-and-memory-management-in-javascript-06738cda8f51
      // TODO(SL): throw if the allocated memory is above some limit?
      // TODO(SL): avoid decoding the same bytes multiple times?
      const combinedBytes = new Uint8Array(bytes.length + fetchedBytes.length)
      combinedBytes.set(fetchedBytes, 0)
      combinedBytes.set(bytes, bytes.length)
      bytes = combinedBytes
    }

    let consumedBytes = 0
    for (const { text, byteCount } of parseChunk({ bytes })) {
      yield {
        text,
        offset: cursor + consumedBytes,
        byteCount,
      }
      consumedBytes += byteCount
      if (consumedBytes > bytes.length) {
        throw new Error('Invalid state: consumedBytes exceeds bytes length')
      }
    }

    // Use the remaining bytes for the next iteration, if any.
    // We use .slice, and not .subarray, so that the bytes buffer can be garbage collected.
    bytes = bytes.slice(consumedBytes)
    cursor += consumedBytes
    firstByte += chunkSize

    if (firstByte > lastByte) {
      break
    }
    if (cursor + bytes.length !== firstByte) {
      throw new Error('Invalid state: non-contiguous offsets')
    }
  }

  // TODO(SL): What to do with remaining bytes? For now, ignore them.
}
