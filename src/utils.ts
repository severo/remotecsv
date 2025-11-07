/**
 * Creates a blob URL from the given text.
 *
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
