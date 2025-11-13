import { fetchChunk } from './fetch'
import { checkIntegerGreaterOrEqualThan } from './options/check'
import { defaultChunkSize } from './options/constants'
import { type DelimiterError, type ParseOptions, validateAndGuessParseOptions } from './options/parseOptions'
import { parse } from './parser'
import type { ParseResult } from './types'
import { testEmptyLine } from './utils'

interface FetchOptions {
  chunkSize?: number
  firstByte?: number
  lastByte?: number
  requestInit?: RequestInit
  fetchChunk?: typeof fetchChunk
  parse?: typeof parse
}
interface ParseUrlOptions extends ParseOptions, FetchOptions {
  delimitersToGuess?: string[]
  skipEmptyLines?: boolean | 'greedy'
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
 * @param options.delimiter The delimiter used in the CSV data. Defaults to ','.
 * @param options.newline The newline used in the CSV data. Defaults to '\n'.
 * @param options.quoteChar The quote character used in the CSV data. Defaults to '"'.
 * @param options.escapeChar The escape character used in the CSV data. Defaults to the quote character.
 * @param options.comments The comment character or boolean to indicate comments
 * @param options.delimitersToGuess The list of delimiters to guess from
 * @param options.skipEmptyLines Whether to skip empty lines, if so, whether 'greedy' or not. Defaults to false.
 * @param options.stripBOM Whether to strip the BOM character at the start of the input. Defaults to true.
 * @yields Parsed rows along with metadata.
 * @returns An async generator that yields parsed rows.
 */
export async function* parseUrl(
  url: string,
  options: ParseUrlOptions = {},
): AsyncGenerator<ParseResult, void, unknown> {
  const chunkSize = checkIntegerGreaterOrEqualThan(options.chunkSize, 1) ?? defaultChunkSize
  // TODO(SL): should we accept negative values (from the end)?
  let firstByte = checkIntegerGreaterOrEqualThan(options.firstByte, 0) ?? 0
  let lastByte = checkIntegerGreaterOrEqualThan(options.lastByte, -1)

  const { delimitersToGuess, skipEmptyLines, stripBOM } = options
  let isFirstChunk = true
  let parseOptions: ParseOptions | undefined = undefined
  let delimiterError: DelimiterError | undefined = undefined

  const decoder = new TextDecoder('utf-8', {
    // don't strip the BOM, we handle it in the parse function
    ignoreBOM: true,
  })
  let cursor = firstByte
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
    const input = decoder.decode(bytes)

    if (!parseOptions) {
      const result = validateAndGuessParseOptions(options, { input, skipEmptyLines, delimitersToGuess })
      parseOptions = result.parseOptions
      delimiterError = result.error
    }

    for (const result of (options.parse ?? parse)(input, {
      // the remaining bytes may not contain a full last row
      ignoreLastRow: true,
      stripBOM: isFirstChunk ? stripBOM : false,
      // pass other options
      ...parseOptions,
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
      if (skipEmptyLines && testEmptyLine(result.row, skipEmptyLines)) {
        // TODO(SL) how to report the skipped lines in the metadata?
        continue
      }
      // Yield the result with updated offset
      yield {
        ...result,
        meta: {
          ...result.meta,
          offset: result.meta.offset + cursor,
        },
      }
    }

    // Use the remaining bytes for the next iteration, if any.
    // We use .slice, and not .subarray, so that the bytes buffer can be garbage collected.
    bytes = bytes.slice(consumedBytes)
    cursor += consumedBytes
    firstByte += chunkSize
    isFirstChunk = false

    if (firstByte <= lastByte) {
      /* v8 ignore if -- @preserve */
      if (cursor + bytes.length !== firstByte) {
      // assertion: it should not happen.
        throw new Error('Invalid state: non-contiguous offsets')
      }
      continue
    }

    break
  }

  // Parse remaining bytes, if any
  if (bytes.length > 0) {
    const input = decoder.decode(bytes)
    for (const result of (options.parse ?? parse)(input, {
      // parse until the last byte
      ignoreLastRow: false,
      stripBOM: isFirstChunk ? stripBOM : false,
      // pass other options
      ...parseOptions,
    })) {
      // Add delimiter error to the first result only
      if (delimiterError) {
        result.errors.push(delimiterError)
        delimiterError = undefined
      }
      if (skipEmptyLines && testEmptyLine(result.row, skipEmptyLines)) {
        // TODO(SL) how to report the skipped lines in the metadata?
        continue
      }
      yield {
        ...result,
        meta: {
          ...result.meta,
          offset: result.meta.offset + cursor,
        },
      }
    }
  }
}
