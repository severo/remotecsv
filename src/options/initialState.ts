import { parse } from '../parser'
import type { ParseOptions } from '../types'
import { isEmptyLine } from '../utils'

export interface EvaluationScore {
  columns: number // the most frequent number of columns
  count: number // the number of rows with the most frequent column count
}

/**
 * Calculates the evaluation score for the given text and parse options.
 * @param params Parameters object.
 * @param params.parseOptions The parse options to evaluate.
 * @param params.text The sample text.
 * @returns The evaluation score.
 */
export function getScore(params: {
  parseOptions: ParseOptions
  text: string
}): EvaluationScore {
  const { parseOptions, text } = params

  const previewLines = 30

  const frequencies = new Map<number, number>()
  let j = 0
  for (const { row } of parse(text, {
    ...parseOptions, ignoreLastRow: false,
  })) {
    if (j >= previewLines) {
      break
    }
    j++
    // always remove empty lines from consideration
    if (isEmptyLine(row)) {
      continue
    }
    const fieldCount = row.length
    frequencies.set(fieldCount, (frequencies.get(fieldCount) || 0) + 1)
  }
  const mostFrequent = Array.from(frequencies.entries()).sort((a, b) => b[1] - a[1]).slice(0, 1).map(([columns, count]) => ({ columns, count }))[0]
  return mostFrequent ?? {
    columns: 0,
    count: 0,
  }
}

/**
 * Determines if the candidate score is better than the best score.
 * @param params Parameters object.
 * @param params.best The best score.
 * @param params.candidate The candidate score.
 * @returns True if the candidate score is better, false otherwise.
 */
export function isBetterScore(params: {
  best: EvaluationScore
  candidate: EvaluationScore
}): boolean {
  const { best, candidate } = params
  // Select the one with the highest most frequent column count
  if (candidate.columns > best.columns) {
    return true
  }
  // If tied, select the one with the highest count for that column count
  if (candidate.columns === best.columns && candidate.count > best.count) {
    return true
  }
  return false
}
