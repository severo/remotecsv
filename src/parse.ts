import { checkNonNegativeInteger, checkStrictlyPositiveInteger } from './check'
import { parseChunk } from './chunk'
import { defaultChunkSize } from './constants'
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
 * @param options.fetchChunk Optional custom fetchChunk function for fetching chunks.
 * @param options.parseChunk Optional custom parseChunk function for parsing chunks.
 * @returns An async generator that yields parsed rows.
 */
export async function* parse(
  url: string,
  options?: {
    chunkSize?: number
    firstByte?: number
    lastByte?: number
    requestInit?: RequestInit
    fetchChunk?: typeof fetchChunk
    parseChunk?: typeof parseChunk
  },
): AsyncGenerator<{
  data: string[]
  errors: unknown[]
  metadata: {
    offset: number
    byteCount: number
  }
}> {
  const chunkSize = checkStrictlyPositiveInteger(options?.chunkSize) ?? defaultChunkSize
  // TODO(SL): should we accept negative values (from the end)?
  let firstByte = checkNonNegativeInteger(options?.firstByte) ?? 0
  let lastByte = checkNonNegativeInteger(options?.lastByte)
  if (lastByte !== undefined && lastByte < firstByte) {
    throw new Error('lastByte must be greater than firstByte')
  }

  let cursor = firstByte
  let bytes: Uint8Array<ArrayBufferLike> = new Uint8Array(0)
  while (true) {
    const { bytes: chunkBytes, fileSize } = await (options?.fetchChunk ?? fetchChunk)({
      url,
      chunkSize,
      firstByte,
      maxLastByte: lastByte,
      requestInit: options?.requestInit,
    })

    // Update lastByte in case it is undefined or greater than the file size
    // It will ensure the loop will finish, and if it was greater, the number of iterations is reduced.
    // Note that fileSize is ensured to be a non-negative integer.
    if (lastByte === undefined || fileSize <= lastByte) {
      lastByte = fileSize - 1
    }

    // Concatenate previous bytes with current bytes
    if (bytes.length === 0) {
      bytes = chunkBytes
    }
    else {
      // TODO(SL): are the following TODOs overkill?
      // TODO(SL): avoid copying?
      // TODO(SL): consider using a buffer pool: https://medium.com/@artemkhrenov/sharedarraybuffer-and-memory-management-in-javascript-06738cda8f51
      // TODO(SL): throw if the allocated memory is above some limit?
      // TODO(SL): avoid decoding the same bytes multiple times?
      const combinedBytes = new Uint8Array(bytes.length + chunkBytes.length)
      combinedBytes.set(bytes, 0)
      combinedBytes.set(chunkBytes, bytes.length)
      bytes = combinedBytes
    }

    let consumedBytes = 0
    for (const { data, metadata } of (options?.parseChunk ?? parseChunk)({ bytes })) {
      const offset = cursor + consumedBytes
      consumedBytes += metadata.byteCount
      if (consumedBytes > bytes.length) {
        throw new Error('Invalid state: consumedBytes exceeds bytes length')
      }
      yield {
        data,
        errors: [], // TODO(SL): proper errors
        metadata: {
          ...metadata,
          offset,
        },
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
    /* v8 ignore if -- @preserve */
    if (cursor + bytes.length !== firstByte) {
      // assertion: it should not happen.
      throw new Error('Invalid state: non-contiguous offsets')
    }
  }

  // TODO(SL): What to do with remaining bytes? For now, ignore them.
}
