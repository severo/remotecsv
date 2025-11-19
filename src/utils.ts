/**
 * Creates a blob URL from the given text.
 * @param text The text to create a blob URL from.
 * @returns An object containing the blob URL, the size of the text in bytes, and a function to revoke the URL.
 */
export function toURL(text: string): {
  url: string
  fileSize: number
  revoke: () => void
} {
  // add an extra space to fix https://github.com/nodejs/node/issues/60382
  const blob = new Blob([text + ' '])
  const url = URL.createObjectURL(blob)
  return {
    url,
    fileSize: blob.size - 1, // subtract the extra space
    revoke: () => {
      URL.revokeObjectURL(url)
    },
  }
}

/**
 * Decodes the given bytes using the provided decoder.
 * @param bytes The bytes to decode.
 * @param options The options for decoding.
 * @param options.stripInvalidBytesAtStart Whether to strip invalid bytes at the start of the byte array.
 * @returns The decoded text and the number of invalid bytes skipped at the start
 */
export function decode(bytes: Uint8Array<ArrayBufferLike>, { stripInvalidBytesAtStart }: { stripInvalidBytesAtStart?: boolean } = {}): {
  text: string
  invalidByteCount: number
} {
  const decoder = new TextDecoder('utf-8', {
    // don't strip the BOM, we handle it in the parse function
    ignoreBOM: true,
    // throw on decoding errors, see https://github.com/severo/csv-range/issues/16
    fatal: true,
  })

  if (!stripInvalidBytesAtStart) {
    // Let the decoder throw on errors, since they should not occur anymore
    return { text: decoder.decode(bytes), invalidByteCount: 0 }
  }

  for (let i = 0; i < bytes.length; i++) {
    try {
      const text = decoder.decode(bytes.subarray(i))
      // found the first valid byte
      return { text, invalidByteCount: i }
    }
    catch {
      // still invalid, try the next byte
      continue
    }
  }
  // the byte array is empty, or all bytes are invalid
  return {
    text: '',
    invalidByteCount: bytes.length,
  }
}

// From PapaParse (https://www.papaparse.com/)

/**
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
 * @param string The string to escape.
 * @returns The escaped string.
 */
export function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // $& means the whole matched string
}

/**
 * Check if the string array is an empty line
 * @param s The string array
 * @param options Options
 * @param options.greedy If true, trims all spaces to test for emptiness. Defaults to false.
 * @returns Whether the line is empty
 */
export function isEmptyLine(s: string[], options: { greedy?: boolean } = {}) {
  return options.greedy ? s.join('').trim() === '' : 0 in s && s.length === 1 && s[0].length === 0
}
