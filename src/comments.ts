import { BAD_DELIMITERS } from './constants'

/**
 * Validates the comment character
 * @param comments The comment character or boolean to indicate comments
 * @param delimiter The delimiter character
 * @returns The comment character.
 */
export function validateComments(comments?: string | boolean, delimiter?: string): undefined | string | false {
  if (comments === undefined || comments === false) {
    return comments
  }
  if (comments === true) {
    return '#'
  }
  if (delimiter !== undefined && comments === delimiter) {
    throw new Error('Comment character same as delimiter')
  }
  if (BAD_DELIMITERS.includes(comments)) {
    throw new Error(`Invalid comment character: ${comments}`)
  }
  return comments
}
