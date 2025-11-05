import { defaultChunkSize } from './constants'

export function setChunkSize(chunkSize?: number): number {
  if (chunkSize === undefined) {
    return defaultChunkSize
  }
  if (chunkSize <= 0 || !Number.isInteger(chunkSize)) {
    throw new Error(`Invalid chunk size: ${chunkSize}`)
  }
  return chunkSize
}
