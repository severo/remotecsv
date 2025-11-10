import { describe, expect, it } from 'vitest'

import { BAD_DELIMITERS, RECORD_SEP, UNIT_SEP } from '../src/constants.js'
import { guessDelimiter, validateDelimiter } from '../src/delimiter.js'

describe('validateDelimiter', () => {
  it('should return undefined when no delimiter is provided', () => {
    expect(validateDelimiter()).toBeUndefined()
  })

  it('should return the provided valid delimiter', () => {
    expect(validateDelimiter('\t')).toBe('\t')
    expect(validateDelimiter('|')).toBe('|')
    expect(validateDelimiter(';')).toBe(';')
    expect(validateDelimiter(RECORD_SEP)).toBe(RECORD_SEP)
    expect(validateDelimiter(UNIT_SEP)).toBe(UNIT_SEP)
  })

  it.for(BAD_DELIMITERS)('should throw an error for invalid delimiter: %s', (badDelimiter) => {
    expect(() => validateDelimiter(badDelimiter)).toThrow(`Invalid delimiter: ${badDelimiter}`)
  })
})

describe('guessDelimiter', () => {
  it('should guess comma as the best delimiter', () => {
    const input = 'a,b,c\n1,2,3\n4,5,6\n'
    const result = guessDelimiter(input)
    expect(result.bestDelimiter).toBe(',')
  })

  it('should guess tab as the best delimiter', () => {
    const input = 'a\tb\tc\n1\t2\t3\n4\t5\t6\n'
    const result = guessDelimiter(input)
    expect(result.bestDelimiter).toBe('\t')
  })

  it('should guess pipe as the best delimiter', () => {
    const input = 'a|b|c\n1|2|3\n4|5|6\n'
    const result = guessDelimiter(input)
    expect(result.bestDelimiter).toBe('|')
  })

  it('should guess ASCII 30 as the best delimiter', () => {
    const input = `a${RECORD_SEP}b${RECORD_SEP}c\n1${RECORD_SEP}2${RECORD_SEP}3\n4${RECORD_SEP}5${RECORD_SEP}6\n`
    const result = guessDelimiter(input)
    expect(result.bestDelimiter).toBe(RECORD_SEP)
  })

  it('should guess ASCII 31 as the best delimiter', () => {
    const input = `a${UNIT_SEP}b${UNIT_SEP}c\n1${UNIT_SEP}2${UNIT_SEP}3\n4${UNIT_SEP}5${UNIT_SEP}6\n`
    const result = guessDelimiter(input)
    expect(result.bestDelimiter).toBe(UNIT_SEP)
  })

  it('should skip empty lines while detecting delimiter', () => {
    const input = 'a,b\n1,2\n3,4\n'
    const result = guessDelimiter(input, undefined, true)
    expect(result.bestDelimiter).toBe(',')
  })

  it('should ignore comment lines while detecting delimiter in an escaped file', () => {
    const input = '#1\n#2\n#3\n#4\n#5\n#6\n#7\n#8\n#9\n#10\none,"t,w,o",three\nfour,five,six'
    const result = guessDelimiter(input, undefined, false, '#')
    expect(result.bestDelimiter).toBe(',')
  })

  it('should ignore comment lines while detecting delimiter in an non-escaped file', () => {
    const input = '#1\n#2\n#3\n#4\n#5\n#6\n#7\n#8\n#9\n#10\n#11\none,two,three\nfour,five,six'
    const result = guessDelimiter(input, undefined, false, '#')
    expect(result.bestDelimiter).toBe(',')
  })

  it('should guess pipe delimiter correctly when mixed with commas', () => {
    const input = 'one|two,two|three\nfour|five,five|six'
    const result = guessDelimiter(input)
    expect(result.bestDelimiter).toBe('|')
  })

  it('should guess the delimiter correctly using the average', () => {
    const input = 'a,b,c\na,b,c|d|e|f'
    const result = guessDelimiter(input)
    expect(result.bestDelimiter).toBe(',')
  })

  it('should guess pipe delimiter correctly when first field are enclosed in quotes and contain delimiter characters', () => {
    const input = '"Field1,1,1";Field2;"Field3";Field4;Field5;Field6'
    const result = guessDelimiter(input)
    expect(result.bestDelimiter).toBe(';')
  })

  it('should guess pipe delimiter correctly when some fields are enclosed in quotes and contain delimiter characters and escaped quotes', () => {
    const input = 'Field1;Field2;"Field,3,""3,3";Field4;Field5;"Field6,6"'
    const result = guessDelimiter(input)
    expect(result.bestDelimiter).toBe(';')
  })

  it('should use custom delimiters to guess from', () => {
    const input = '"A"~"B"~"C"~"D"'
    const result = guessDelimiter(input, undefined, false, false, ['~', '@', '%'])
    expect(result.bestDelimiter).toBe('~')
  })

  it('should still correctly guess default delimiters when delimiters to guess are not given', () => {
    const input = '"A","B","C","D"'
    const result = guessDelimiter(input)
    expect(result.bestDelimiter).toBe(',')
  })
})
