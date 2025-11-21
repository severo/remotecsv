import { parse } from '../parser'
import type { Newline } from '../types'
import { isEmptyLine } from '../utils'
import { BAD_DELIMITERS, defaultPreviewLines, RECORD_SEP, UNIT_SEP } from './constants'

/**
 * Validates the delimiter
 * @param delimiter The delimiter string
 * @returns The delimiter string.
 */
export function validateDelimiter(delimiter?: string): undefined | string {
  if (delimiter === undefined) {
    return undefined
  }
  if (BAD_DELIMITERS.includes(delimiter)) {
    throw new Error(`Invalid delimiter: ${delimiter}`)
  }
  return delimiter
}

/**
 * Guess the delimiter
 * @param options The options for guessing the delimiter
 * @param options.text The string
 * @param options.newline The newline character
 * @param options.comments The comment character or boolean to indicate comments
 * @param options.delimitersToGuess The list of delimiters to guess from
 * @param options.previewLines The number of lines to preview for guessing. Defaults to 10.
 * @returns An object indicating whether guessing was successful and the best delimiter found
 */
export function guessDelimiter({ text, newline, comments, delimitersToGuess, previewLines }: {
  text: string
  newline?: Newline
  comments?: boolean | string
  delimitersToGuess?: string[]
  previewLines?: number
}) {
  previewLines = previewLines ?? defaultPreviewLines

  let bestDelimiter, bestDelta, maxFieldCount

  delimitersToGuess = delimitersToGuess || [',', '\t', '|', ';', RECORD_SEP, UNIT_SEP]

  for (let i = 0; i < delimitersToGuess.length; i++) {
    const delimiter = delimitersToGuess[i]
    let delta = 0
    let nonEmptyLinesCount = 0
    let avgFieldCount = 0
    let fieldCountPrevRow: number | undefined
    let j = 0

    for (const { row } of parse(text, {
      delimiter,
      newline,
      comments,
      ignoreLastRow: false,
    })) {
      if (j >= previewLines) {
        break
      }
      // always remove empty lines from consideration
      if (isEmptyLine(row)) {
        continue
      }
      nonEmptyLinesCount++

      const fieldCount = row.length
      avgFieldCount += fieldCount

      /* v8 ignore else -- @preserve */
      // (else clause should not happen because row always has at least one field)
      if (fieldCountPrevRow === undefined) {
        fieldCountPrevRow = fieldCount
        continue
      }
      else if (fieldCount > 0) {
        delta += Math.abs(fieldCount - fieldCountPrevRow)
        fieldCountPrevRow = fieldCount
      }
      j++
    }

    if (nonEmptyLinesCount > 0)
      avgFieldCount /= (nonEmptyLinesCount)

    if (
      (bestDelta === undefined || delta <= bestDelta)
      && (maxFieldCount === undefined || avgFieldCount > maxFieldCount)
      && avgFieldCount > 1.99
    ) {
      bestDelta = delta
      bestDelimiter = delimiter
      maxFieldCount = avgFieldCount
    }
  }

  return {
    successful: !!bestDelimiter,
    bestDelimiter: bestDelimiter,
  }
}
