/** Represents a Blob URL along with its file size and a revoke function. */
export interface BlobURL {
  /** The blob URL. */
  url: string
  /** The size of the file in bytes. */
  fileSize: number
  /** A function to revoke the blob URL. */
  revoke: () => void
}

/**
 * Creates a blob URL from the given text.
 * @param text The text to create a blob URL from.
 * @param options Options.
 * @param options.withNodeWorkaround Whether to add an extra space at the end of the text
 * to work around the Node.js bug (https://github.com/nodejs/node/issues/60382). Defaults to false.
 * @returns An object containing the blob URL, the size of the file in bytes (without the extra space,
 *  if `withNodeWorkaround` is true), and a function to revoke the URL.
 */
export function toBlobURL(text: string, { withNodeWorkaround }: { withNodeWorkaround?: boolean } = {}): BlobURL {
  withNodeWorkaround = withNodeWorkaround ?? false
  // add an extra space to fix https://github.com/nodejs/node/issues/60382
  const blob = new Blob([withNodeWorkaround ? text + ' ' : text])
  const url = URL.createObjectURL(blob)
  return {
    url,
    // remove the extra space from the file size
    fileSize: withNodeWorkaround ? blob.size - 1 : blob.size,
    revoke: () => {
      URL.revokeObjectURL(url)
    },
  }
}

/**
 * Checks if the given URL is an empty Blob URL.
 * @param url The URL to check.
 * @returns Whether the URL is an empty Blob URL.
 */
export async function isEmptyBlobURL(url: string): Promise<boolean> {
  if (!url.startsWith('blob:')) {
    return false
  }
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    return blob.size === 0
  }
  catch {
    return false
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
    // throw on decoding errors, see https://github.com/severo/cosovo/issues/16
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
