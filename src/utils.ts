/**
 * Creates a blob URL from the given text.
 * @param text The text to create a blob URL from.
 * @returns An object containing the blob URL, the size of the text in bytes, and a function to revoke the URL.
 */
export function toUrl(text: string): {
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
 * Test if the string array is an empty line
 * @param s The string array
 * @param skipEmptyLines If 'greedy', trims all spaces to test for emptiness
 * @returns Whether the line is empty
 */
export function testEmptyLine(s: string[], skipEmptyLines?: 'greedy' | boolean) {
  return skipEmptyLines === 'greedy' ? s.join('').trim() === '' : 0 in s && s.length === 1 && s[0].length === 0
}
