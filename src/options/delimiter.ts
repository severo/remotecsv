import { parse } from '../parser'
import { testEmptyLine } from '../utils'
import { BAD_DELIMITERS, RECORD_SEP, UNIT_SEP } from './constants'

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
 * @param input The input string
 * @param newline The newline character
 * @param skipEmptyLines Whether to skip empty lines, if so, whether 'greedy' or not
 * @param comments The comment character or boolean to indicate comments
 * @param delimitersToGuess The list of delimiters to guess from
 * @returns An object indicating whether guessing was successful and the best delimiter found
 */
export function guessDelimiter(input: string, newline?: string, skipEmptyLines?: boolean | 'greedy', comments?: boolean | string, delimitersToGuess?: string[]) {
  let bestDelimiter, bestDelta, maxFieldCount

  delimitersToGuess = delimitersToGuess || [',', '\t', '|', ';', RECORD_SEP, UNIT_SEP]

  for (let i = 0; i < delimitersToGuess.length; i++) {
    const delimiter = delimitersToGuess[i]
    let delta = 0
    let nonEmptyLinesCount = 0
    let avgFieldCount = 0
    let fieldCountPrevRow: number | undefined
    let j = 0
    const previewLines = 10

    for (const { row } of parse(input, {
      delimiter,
      newline,
      comments,
      ignoreLastRow: false,
    })) {
      if (j >= previewLines) {
        break
      }
      if (skipEmptyLines && testEmptyLine(row, skipEmptyLines)) {
        continue
      }
      nonEmptyLinesCount++

      const fieldCount = row.length
      avgFieldCount += fieldCount

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
