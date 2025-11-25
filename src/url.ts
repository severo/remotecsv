import { fetchChunk } from './fetch'
import { checkIntegerGreaterOrEqualThan } from './options/check'
import { defaultChunkSize } from './options/constants'
import { validateAndGuessParseOptions } from './options/parseOptions'
import { parse } from './parser'
import type { DelimiterError, FetchOptions, GuessOptions, ParseOptions, ParseResult } from './types'
import { decode, isEmptyBlobURL } from './utils'

/**
 * Parses a remote text file in chunks using HTTP range requests.
 * @param url The URL of the remote text file.
 * @param options Options for fetching and parsing the remote text file.
 * @yields {ParseResult} Parsed rows along with metadata.
 * @returns An async generator that yields parsed rows.
 */
export async function* parseURL(
  url: string,
  options: ParseOptions & FetchOptions & GuessOptions = {},
): AsyncGenerator<ParseResult, void, unknown> {
  const chunkSize = checkIntegerGreaterOrEqualThan(options.chunkSize, 1) ?? defaultChunkSize
  let firstByte = checkIntegerGreaterOrEqualThan(options.firstByte, 0) ?? 0
  // Note: lastByte can be -1 to indicate no data to fetch.
  // It's related to the bug in Node.js (https://github.com/nodejs/node/issues/60382) and the
  // workaround we propose with toBlobURL util (add ' ' at the end of the file, and set lastByte
  // to the original file size - 1). If the file is empty, lastByte will be -1.
  let lastByte = checkIntegerGreaterOrEqualThan(options.lastByte, -1)
  if (lastByte !== undefined && lastByte < firstByte) {
    // No data to fetch
    return
  }
  // Return if the URL is an empty Blob URL
  if (await isEmptyBlobURL(url)) {
    return
  }

  const { delimitersToGuess, previewLines, stripBOM } = options
  let parseOptions: ParseOptions | undefined = undefined
  let delimiterError: DelimiterError | undefined = undefined

  /*
   * Number of bytes skipped due to decoding errors
   * They are only accepted at the start of the range, otherwise an exception is thrown.
   * Note that, in the extreme case where chunkSize = 1, and multiple bytes are invalid at the start,
   * multiple chunk iterations may be needed until a valid byte is found.
   * If there are decoding errors, the first valid character will be considered the start of the text,
   * and the byte offsets will be adjusted accordingly. An error will be reported in the first parsed row.
   * It also means that the first row's byteOffset may be greater than options.firstByte.
   */
  const invalidData = {
    byteCount: 0,
    status: 'pending' as 'pending' | 'done',
  }
  let chunkByteOffset = firstByte
  let bytes: Uint8Array<ArrayBufferLike> = new Uint8Array(0)
  while (true) {
    const { bytes: chunkBytes, fileSize } = await (options.fetchChunk ?? fetchChunk)({
      url,
      chunkSize,
      firstByte,
      maxLastByte: lastByte,
      requestInit: options.requestInit,
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
      const combinedBytes = new Uint8Array(bytes.length + chunkBytes.length)
      combinedBytes.set(bytes, 0)
      combinedBytes.set(chunkBytes, bytes.length)
      bytes = combinedBytes
    }

    const { text, invalidByteCount } = decode(bytes, { stripInvalidBytesAtStart: invalidData.status === 'pending' })
    // Skip the invalid bytes at the start (should only happen if pending, else invalidByteCount should be 0)
    invalidData.byteCount += invalidByteCount
    bytes = bytes.slice(invalidByteCount)
    chunkByteOffset += invalidByteCount

    if (!parseOptions) {
      const result = validateAndGuessParseOptions(options, { text, delimitersToGuess, previewLines })
      parseOptions = result.parseOptions
      delimiterError = result.error
    }

    let consumedBytes = 0
    for (const result of (options.parse ?? parse)(text, {
      ...parseOptions,
      // the remaining bytes may not contain a full last row
      ignoreLastRow: true,
      // don't strip BOM if not the start of the file
      stripBOM: chunkByteOffset > 0 ? false : stripBOM,
    })) {
      consumedBytes += result.meta.byteCount
      if (consumedBytes > bytes.length) {
        throw new Error('Invalid state: consumedBytes exceeds bytes length')
      }
      // Add delimiter error to the first result only
      if (delimiterError) {
        result.errors.push(delimiterError)
        delimiterError = undefined
      }
      // Add invalid byte count to the first reported row only
      if (invalidData.status === 'pending') {
        invalidData.status = 'done'
        if (invalidData.byteCount > 0) {
          result.errors.push({
            type: 'Decoding',
            code: 'InvalidData',
            message: `Skipped ${invalidData.byteCount} invalid byte(s) at the start of the range`,
          })
        }
      }
      // Yield the result with updated byte offset
      yield {
        ...result,
        meta: {
          ...result.meta,
          byteOffset: result.meta.byteOffset + chunkByteOffset,
        },
      }
    }

    // Use the remaining bytes for the next iteration, if any.
    // We use .slice, and not .subarray, so that the bytes buffer can be garbage collected.
    bytes = bytes.slice(consumedBytes)
    chunkByteOffset += consumedBytes
    firstByte += chunkSize

    if (firstByte <= lastByte) {
      /* v8 ignore if -- @preserve */
      if (chunkByteOffset + bytes.length !== firstByte) {
      // assertion: it should not happen.
        throw new Error('Invalid state: non-contiguous offsets')
      }
      continue
    }

    break
  }

  // Parse the last row (even if the remaining bytes are empty)
  const { text, invalidByteCount } = decode(bytes, { stripInvalidBytesAtStart: invalidData.status === 'pending' })
  // Skip the invalid bytes at the start (should only happen if pending, else invalidByteCount should be 0)
  invalidData.byteCount += invalidByteCount
  bytes = bytes.slice(invalidByteCount)
  chunkByteOffset += invalidByteCount

  for (const result of (options.parse ?? parse)(text, {
    ...parseOptions,
    // parse until the last byte
    ignoreLastRow: false,
    // don't strip BOM if not the start of the file
    stripBOM: chunkByteOffset > 0 ? false : stripBOM,
  })) {
    // Add delimiter error to the first result only
    if (delimiterError) {
      result.errors.push(delimiterError)
      delimiterError = undefined
    }
    // Add invalid byte count to the first reported row only
    if (invalidData.status === 'pending') {
      invalidData.status = 'done'
      if (invalidData.byteCount > 0) {
        result.errors.push({
          type: 'Decoding',
          code: 'InvalidData',
          message: `Skipped ${invalidData.byteCount} invalid byte(s) at the start of the range`,
        })
      }
    }
    yield {
      ...result,
      meta: {
        ...result.meta,
        byteOffset: result.meta.byteOffset + chunkByteOffset,
      },
    }
  }
}
