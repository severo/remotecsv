import { fetchChunk } from './fetch'
import { checkIntegerGreaterOrEqualThan } from './options/check'
import { defaultChunkSize } from './options/constants'
import { type DelimiterError, type ParseOptions, validateAndGuessParseOptions } from './options/parseOptions'
import { parse } from './parser'
import type { ParseResult } from './types'
import { decode } from './utils'

interface FetchOptions {
  chunkSize?: number
  firstByte?: number
  lastByte?: number
  requestInit?: RequestInit
  fetchChunk?: typeof fetchChunk
  parse?: typeof parse
}
interface parseURLOptions extends ParseOptions, FetchOptions {
  delimitersToGuess?: string[]
  stripBOM?: boolean
}

/**
 * Parses a remote text file in chunks using HTTP range requests.
 * @param url The URL of the remote text file.
 * @param options Options for parsing.
 * @param options.chunkSize The size of each chunk to fetch. It must be a strictly positive integer. Default is 1MB.
 * @param options.firstByte The byte where parsing starts. It must be a non-negative integer. Default is 0.
 * @param options.lastByte The last byte parsed (inclusive). It must be a non-negative integer. Default is the end of the file.
 * @param options.requestInit Optional fetch request initialization parameters.
 * @param options.fetchChunk Optional custom fetchChunk function for fetching chunks.
 * @param options.parse Optional custom parse function for parsing a string.
 * @param options.delimiter The delimiter used in the CSV data. Defaults to guess the delimiter, else ','.
 * @param options.newline The newline used in the CSV data. Defaults to guess the newline, else '\n'.
 * @param options.quoteChar The quote character used in the CSV data. Defaults to '"'.
 * @param options.escapeChar The escape character used in the CSV data. Defaults to the quote character.
 * @param options.comments The comment character or boolean to indicate comments. Defaults to false (don't strip comments).
 * @param options.delimitersToGuess The list of delimiters to guess from
 * @param options.stripBOM Whether to strip the BOM character at the start of the text. Defaults to true.
 * @yields Parsed rows along with metadata.
 * @returns An async generator that yields parsed rows.
 */
export async function* parseURL(
  url: string,
  options: parseURLOptions = {},
): AsyncGenerator<ParseResult, void, unknown> {
  const chunkSize = checkIntegerGreaterOrEqualThan(options.chunkSize, 1) ?? defaultChunkSize
  let firstByte = checkIntegerGreaterOrEqualThan(options.firstByte, 0) ?? 0
  let lastByte = checkIntegerGreaterOrEqualThan(options.lastByte, -1)

  const { delimitersToGuess, stripBOM } = options
  let isFirstChunk = true
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
      const result = validateAndGuessParseOptions(options, { text, delimitersToGuess })
      parseOptions = result.parseOptions
      delimiterError = result.error
    }

    let consumedBytes = 0
    for (const result of (options.parse ?? parse)(text, {
      ...parseOptions,
      // the remaining bytes may not contain a full last row
      ignoreLastRow: true,
      stripBOM: isFirstChunk ? stripBOM : false, // TODO(SL): only if firstByte + invalidByteCount === 0 ?
    })) {
      isFirstChunk = false
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
    stripBOM: isFirstChunk ? stripBOM : false,
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
