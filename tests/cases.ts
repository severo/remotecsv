export const cases = [
  {
    description: 'One row',
    input: 'A,b,c',
    expected: {
      rows: [['A', 'b', 'c']],
      errors: [],
      meta: { delimiter: ',', renamedHeaders: null },
    },
  },
]
