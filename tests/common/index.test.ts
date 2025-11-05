import { parse } from '../../src'

export const tests = [
  {
    name: 'parse',
    prepare: async () => {
      const text = 'hello, csvremote!!!'
      let result = ''
      for await (const chunk of parse(text, { chunkSize: 5, isUrl: false })) {
        result += chunk
      }
      return result
    },
    expected: 'hello, csvremote!!!',
  },
]
