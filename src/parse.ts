import { checkNonNegativeInteger, checkStrictlyPositiveInteger } from './check'
import { parseChunk } from './chunk'
import { defaultChunkSize, defaultFrom, defaultTo } from './constants'
import { fetchChunk } from './fetch'

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

  let fileOffset = from
  let bytes: Uint8Array<ArrayBufferLike> = new Uint8Array(0)

  let fetchStart = fileOffset + bytes.length
  while (true) {
    // Always request one extra byte, due to https://github.com/nodejs/node/issues/60382
    const extraByte = 1
    const fetchEnd = fetchStart + chunkSize - 1 + extraByte
    const { bytes: allBytes, fileSize } = await fetchChunk({ url, rangeStart: fetchStart, rangeEnd: fetchEnd, requestInit: options?.requestInit })
    // Set the end limit (to) to the last byte in the file
    // It will ensure the loop will finish, and if it was greater, the number of iterations is reduced.
    // Note that result.fileSize is ensured to be a non-negative integer.
    to = Math.min(to, fileSize - 1)
    // Only decode up to the chunkSize or the last requested byte (to remove the extra byte).
    const fetchedBytes = allBytes.subarray(0, Math.min(chunkSize, to - fetchStart + 1))

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
        offset: fileOffset + consumedBytes,
        byteCount,
      }
      consumedBytes += byteCount
      if (consumedBytes > bytes.length) {
        throw new Error('Invalid state: consumedBytes exceeds bytes length')
      }
    }

    // Prepare the next iteration

    // keep remaining bytes. We use slice, and not subarray, so that the bytes buffer can be garbage collected.
    bytes = bytes.slice(consumedBytes)
    fileOffset += consumedBytes
    fetchStart += chunkSize

    if (fetchStart > to) {
      break
    }
    if (fileOffset + bytes.length !== fetchStart) {
      throw new Error('Invalid state: non-contiguous offsets')
    }
  }

  // TODO(SL): What to do with remaining bytes? For now, ignore them.
}
