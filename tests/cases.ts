import { RECORD_SEP, UNIT_SEP } from '../src/options/constants.js'

export const cases = [
  {
    description: 'One row',
    text: 'A,b,c',
    expected: {
      rows: [['A', 'b', 'c']],
      errors: [],
      meta: { delimiter: ',', renamedHeaders: null },
    },
  },
]

export const CORE_PARSER_TESTS = [
  {
    description: 'One row',
    text: 'A,b,c',
    expected: {
      data: [['A', 'b', 'c']],
      errors: [],
      meta: {
        byteOffset: 0,
        byteCount: 5,
        cursor: 5,
        delimiter: ',',
        newline: '\n',
      },
    },
  },
  {
    description: 'Two rows',
    text: 'A,b,c\nd,E,f',
    expected: {
      data: [['A', 'b', 'c'], ['d', 'E', 'f']],
      errors: [],
      meta: {
        byteOffset: 0,
        byteCount: 5,
        cursor: 22,
        delimiter: ',',
        newline: '\n',
      },
    },
  },
  {
    description: 'Three rows',
    text: 'A,b,c\nd,E,f\nG,h,i',
    expected: {
      data: [['A', 'b', 'c'], ['d', 'E', 'f'], ['G', 'h', 'i']],
      errors: [],
    },
  },
  {
    description: 'Whitespace at edges of unquoted field',
    // eslint-disable-next-line @stylistic/no-tabs
    text: 'a,	b ,c',
    notes: 'Extra whitespace should graciously be preserved',
    expected: {
      // eslint-disable-next-line @stylistic/no-tabs
      data: [['a', '	b ', 'c']],
      errors: [],
    },
  },
  {
    description: 'Quoted field',
    text: 'A,"B",C',
    expected: {
      data: [['A', 'B', 'C']],
      errors: [],
    },
  },
  {
    description: 'Quoted field with extra whitespace on edges',
    text: 'A," B  ",C',
    expected: {
      data: [['A', ' B  ', 'C']],
      errors: [],
    },
  },
  {
    description: 'Quoted field with delimiter',
    text: 'A,"B,B",C',
    expected: {
      data: [['A', 'B,B', 'C']],
      errors: [],
    },
  },
  {
    description: 'Quoted field with line break',
    text: 'A,"B\nB",C',
    expected: {
      data: [['A', 'B\nB', 'C']],
      errors: [],
    },
  },
  {
    description: 'Quoted fields with line breaks',
    text: 'A,"B\nB","C\nC\nC"',
    expected: {
      data: [['A', 'B\nB', 'C\nC\nC']],
      errors: [],
    },
  },
  {
    description: 'Quoted fields at end of row with delimiter and line break',
    text: 'a,b,"c,c\nc"\nd,e,f',
    expected: {
      data: [['a', 'b', 'c,c\nc'], ['d', 'e', 'f']],
      errors: [],
    },
  },
  {
    description: 'Quoted field with escaped quotes',
    text: 'A,"B""B""B",C',
    expected: {
      data: [['A', 'B"B"B', 'C']],
      errors: [],
    },
  },
  {
    description: 'Quoted field with escaped quotes at boundaries',
    text: 'A,"""B""",C',
    expected: {
      data: [['A', '"B"', 'C']],
      errors: [],
    },
  },
  {
    description: 'Unquoted field with quotes at end of field',
    notes: 'The quotes character is misplaced, but shouldn\'t generate an error or break the parser',
    text: 'A,B",C',
    expected: {
      data: [['A', 'B"', 'C']],
      errors: [],
    },
  },
  {
    description: 'Quoted field with quotes around delimiter',
    text: 'A,""",""",C',
    notes: 'For a boundary to exist immediately before the quotes, we must not already be in quotes',
    expected: {
      data: [['A', '","', 'C']],
      errors: [],
    },
  },
  {
    description: 'Quoted field with quotes on right side of delimiter',
    text: 'A,",""",C',
    notes: 'Similar to the test above but with quotes only after the comma',
    expected: {
      data: [['A', ',"', 'C']],
      errors: [],
    },
  },
  {
    description: 'Quoted field with quotes on left side of delimiter',
    text: 'A,""",",C',
    notes: 'Similar to the test above but with quotes only before the comma',
    expected: {
      data: [['A', '",', 'C']],
      errors: [],
    },
  },
  {
    description: 'Quoted field with 5 quotes in a row and a delimiter in there, too',
    text: '"1","cnonce="""",nc=""""","2"',
    notes: 'Actual text reported in issue #121',
    expected: {
      data: [['1', 'cnonce="",nc=""', '2']],
      errors: [],
    },
  },
  {
    description: 'Quoted field with whitespace around quotes',
    text: 'A, "B" ,C',
    notes: 'The quotes must be immediately adjacent to the delimiter to indicate a quoted field',
    expected: {
      data: [['A', ' "B" ', 'C']],
      errors: [],
    },
  },
  {
    description: 'Misplaced quotes in data, not as opening quotes',
    text: 'A,B "B",C',
    notes: 'The text is technically malformed, but this syntax should not cause an error',
    expected: {
      data: [['A', 'B "B"', 'C']],
      errors: [],
    },
  },
  {
    description: 'Quoted field has no closing quote',
    text: 'a,"b,c\nd,e,f',
    expected: {
      data: [['a', 'b,c\nd,e,f']],
      errors: [{
        type: 'Quotes',
        code: 'MissingQuotes',
        message: 'Quoted field unterminated',
        row: 0,
        index: 3,
      }],
    },
  },
  {
    description: 'Quoted field has invalid trailing quote after delimiter with a valid closer',
    text: '"a,"b,c"\nd,e,f',
    notes: 'The text is malformed, opening quotes identified, trailing quote is malformed. Trailing quote should be escaped or followed by valid new line or delimiter to be valid',
    expected: {
      data: [['a,"b,c'], ['d', 'e', 'f']],
      errors: [{
        type: 'Quotes',
        code: 'InvalidQuotes',
        message: 'Trailing quote on quoted field is malformed',
        row: 0,
        index: 1,
      }],
    },
  },
  {
    description: 'Quoted field has invalid trailing quote after delimiter',
    text: 'a,"b,"c\nd,e,f',
    notes: 'The text is malformed, opening quotes identified, trailing quote is malformed. Trailing quote should be escaped or followed by valid new line or delimiter to be valid',
    expected: {
      data: [['a', 'b,"c\nd,e,f']],
      errors: [{
        type: 'Quotes',
        code: 'InvalidQuotes',
        message: 'Trailing quote on quoted field is malformed',
        row: 0,
        index: 3,
      },
      {
        type: 'Quotes',
        code: 'MissingQuotes',
        message: 'Quoted field unterminated',
        row: 0,
        index: 3,
      }],
    },
  },
  {
    description: 'Quoted field has invalid trailing quote before delimiter',
    text: 'a,"b"c,d\ne,f,g',
    notes: 'The text is malformed, opening quotes identified, trailing quote is malformed. Trailing quote should be escaped or followed by valid new line or delimiter to be valid',
    expected: {
      data: [['a', 'b"c,d\ne,f,g']],
      errors: [{
        type: 'Quotes',
        code: 'InvalidQuotes',
        message: 'Trailing quote on quoted field is malformed',
        row: 0,
        index: 3,
      },
      {
        type: 'Quotes',
        code: 'MissingQuotes',
        message: 'Quoted field unterminated',
        row: 0,
        index: 3,
      }],
    },
  },
  {
    description: 'Quoted field has invalid trailing quote after new line',
    text: 'a,"b,c\nd"e,f,g',
    notes: 'The text is malformed, opening quotes identified, trailing quote is malformed. Trailing quote should be escaped or followed by valid new line or delimiter to be valid',
    expected: {
      data: [['a', 'b,c\nd"e,f,g']],
      errors: [{
        type: 'Quotes',
        code: 'InvalidQuotes',
        message: 'Trailing quote on quoted field is malformed',
        row: 0,
        index: 3,
      },
      {
        type: 'Quotes',
        code: 'MissingQuotes',
        message: 'Quoted field unterminated',
        row: 0,
        index: 3,
      }],
    },
  },
  {
    description: 'Quoted field has valid trailing quote via delimiter',
    text: 'a,"b",c\nd,e,f',
    notes: 'Trailing quote is valid due to trailing delimiter',
    expected: {
      data: [['a', 'b', 'c'], ['d', 'e', 'f']],
      errors: [],
    },
  },
  {
    description: 'Quoted field has valid trailing quote via \\n',
    text: 'a,b,"c"\nd,e,f',
    notes: 'Trailing quote is valid due to trailing new line delimiter',
    expected: {
      data: [['a', 'b', 'c'], ['d', 'e', 'f']],
      errors: [],
    },
  },
  {
    description: 'Quoted field has valid trailing quote via EOF',
    text: 'a,b,c\nd,e,"f"',
    notes: 'Trailing quote is valid due to EOF',
    expected: {
      data: [['a', 'b', 'c'], ['d', 'e', 'f']],
      errors: [],
    },
  },
  {
    description: 'Quoted field contains delimiters and \\n with valid trailing quote',
    text: 'a,"b,c\nd,e,f"',
    notes: 'Trailing quote is valid due to trailing delimiter',
    expected: {
      data: [['a', 'b,c\nd,e,f']],
      errors: [],
    },
  },
  {
    description: 'Line starts with quoted field',
    text: 'a,b,c\n"d",e,f',
    expected: {
      data: [['a', 'b', 'c'], ['d', 'e', 'f']],
      errors: [],
    },
  },
  {
    description: 'Line starts with unquoted empty field',
    text: ',b,c\n"d",e,f',
    expected: {
      data: [['', 'b', 'c'], ['d', 'e', 'f']],
      errors: [],
    },
  },
  {
    description: 'Line ends with quoted field',
    text: 'a,b,c\nd,e,f\n"g","h","i"\n"j","k","l"',
    expected: {
      data: [['a', 'b', 'c'], ['d', 'e', 'f'], ['g', 'h', 'i'], ['j', 'k', 'l']],
      errors: [],
    },
  },
  {
    description: 'Line ends with quoted field, first field of next line is empty, \\n',
    text: 'a,b,c\n,e,f\n,"h","i"\n,"k","l"',
    config: {
      newline: '\n',
    },
    expected: {
      data: [['a', 'b', 'c'], ['', 'e', 'f'], ['', 'h', 'i'], ['', 'k', 'l']],
      errors: [],
    },
  },
  {
    description: 'Quoted field at end of row (but not at EOF) has quotes',
    text: 'a,b,"c""c"""\nd,e,f',
    expected: {
      data: [['a', 'b', 'c"c"'], ['d', 'e', 'f']],
      errors: [],
    },
  },
  {
    description: 'Empty quoted field at EOF is empty',
    text: 'a,b,""\na,b,""',
    expected: {
      data: [['a', 'b', ''], ['a', 'b', '']],
      errors: [],
    },
  },
  {
    description: 'Multiple consecutive empty fields',
    text: 'a,b,,,c,d\n,,e,,,f',
    expected: {
      data: [['a', 'b', '', '', 'c', 'd'], ['', '', 'e', '', '', 'f']],
      errors: [],
    },
  },
  // Disabled, because it is contradictory with other tests (it should return one row with one empty field).
  // {
  //   description: 'Empty text string',
  //   text: '',
  //   expected: {
  //     data: [],
  //     errors: [],
  //   },
  // },
  {
    description: 'Input is just the delimiter (2 empty fields)',
    text: ',',
    expected: {
      data: [['', '']],
      errors: [],
    },
  },
  {
    description: 'Input is just empty fields',
    text: ',,\n,,,',
    expected: {
      data: [['', '', ''], ['', '', '', '']],
      errors: [],
    },
  },
  {
    description: 'Input is just a string (a single field)',
    text: 'Abc def',
    expected: {
      data: [['Abc def']],
      errors: [],
    },
  },
  {
    description: 'Commented line at beginning',
    text: '# Comment!\na,b,c',
    config: { comments: true },
    expected: {
      data: [['a', 'b', 'c']],
      errors: [],
    },
  },
  {
    description: 'Commented line in middle',
    text: 'a,b,c\n# Comment\nd,e,f',
    config: { comments: true },
    expected: {
      data: [['a', 'b', 'c'], ['d', 'e', 'f']],
      errors: [],
    },
  },
  {
    description: 'Commented line at end',
    text: 'a,true,false\n# Comment',
    config: { comments: true },
    expected: {
      data: [['a', 'true', 'false']],
      errors: [],
    },
  },
  {
    description: 'Two comment lines consecutively',
    text: 'a,b,c\n#comment1\n#comment2\nd,e,f',
    config: { comments: true },
    expected: {
      data: [['a', 'b', 'c'], ['d', 'e', 'f']],
      errors: [],
    },
  },
  {
    description: 'Two comment lines consecutively at end of file',
    text: 'a,b,c\n#comment1\n#comment2',
    config: { comments: true },
    expected: {
      data: [['a', 'b', 'c']],
      errors: [],
    },
  },
  {
    description: 'Three comment lines consecutively at beginning of file',
    text: '#comment1\n#comment2\n#comment3\na,b,c',
    config: { comments: true },
    expected: {
      data: [['a', 'b', 'c']],
      errors: [],
    },
  },
  {
    description: 'Entire file is comment lines',
    text: '#comment1\n#comment2\n#comment3',
    config: { comments: true },
    expected: {
      data: [],
      errors: [],
    },
  },
  {
    description: 'Comment with non-default character',
    text: 'a,b,c\n!Comment goes here\nd,e,f',
    config: { comments: '!' },
    expected: {
      data: [['a', 'b', 'c'], ['d', 'e', 'f']],
      errors: [],
    },
  },
  {
    description: 'Bad comments value specified',
    notes: 'Should silently disable comment parsing',
    text: 'a,b,c\n5comment\nd,e,f',
    config: { comments: 5 },
    expected: {
      data: [['a', 'b', 'c'], ['5comment'], ['d', 'e', 'f']],
      errors: [],
    },
  },
  {
    description: 'Multi-character comment string',
    text: 'a,b,c\n=N(Comment)\nd,e,f',
    config: { comments: '=N(' },
    expected: {
      data: [['a', 'b', 'c'], ['d', 'e', 'f']],
      errors: [],
    },
  },
  {
    description: 'Input with only a commented line',
    text: '#commented line',
    config: { comments: true, delimiter: ',' },
    expected: {
      data: [],
      errors: [],
    },
  },
  {
    description: 'Input with only a commented line and blank line after',
    text: '#commented line\n',
    config: { comments: true, delimiter: ',' },
    expected: {
      data: [['']],
      errors: [],
    },
  },
  {
    description: 'Input with only a commented line, without comments enabled',
    text: '#commented line',
    config: { delimiter: ',' },
    expected: {
      data: [['#commented line']],
      errors: [],
    },
  },
  {
    description: 'Input without comments with line starting with whitespace',
    text: 'a\n b\nc',
    config: { delimiter: ',' },
    notes: '" " == false, but " " !== false, so === comparison is required',
    expected: {
      data: [['a'], [' b'], ['c']],
      errors: [],
    },
  },
  {
    description: 'Multiple rows, one column (no delimiter found)',
    text: 'a\nb\nc\nd\ne',
    expected: {
      data: [['a'], ['b'], ['c'], ['d'], ['e']],
      errors: [],
    },
  },
  {
    description: 'One column text with empty fields',
    text: 'a\nb\n\n\nc\nd\ne\n',
    expected: {
      data: [['a'], ['b'], [''], [''], ['c'], ['d'], ['e'], ['']],
      errors: [],
    },
  },
  {
    description: 'Simple duplicated header names',
    text: 'A,A,A,A\n1,2,3,4',
    config: { header: true },
    expected: {
      // TODO(SL): implement header name deduplication?
      data: [['A', 'A', 'A', 'A'], ['1', '2', '3', '4']],
      // data: [['A', 'A_1', 'A_2', 'A_3'], ['1', '2', '3', '4']],
      errors: [],
      meta: {
        // renamedHeaders: { A_1: 'A', A_2: 'A', A_3: 'A' },
        cursor: 15,
      },
    },
  },
  {
    description: 'Duplicated header names existing column',
    text: 'c,c,c,c_1\n1,2,3,4',
    config: { header: true },
    expected: {
      // TODO(SL): implement header name deduplication?
      // data: [['c', 'c_2', 'c_3', 'c_1'], ['1', '2', '3', '4']],
      data: [['c', 'c', 'c', 'c_1'], ['1', '2', '3', '4']],
      errors: [],
      meta: {
        // renamedHeaders: { c_2: 'c', c_3: 'c' },
        cursor: 17,
      },
    },
  },
  {
    description: 'Duplicate header names with __proto__ field',
    text: '__proto__,__proto__,__proto__\n1,2,3',
    config: { header: true },
    expected: {
      // TODO(SL): implement header name deduplication?
      // data: [['__proto__', '__proto___1', '__proto___2'], ['1', '2', '3']],
      data: [['__proto__', '__proto__', '__proto__'], ['1', '2', '3']],
      errors: [],
      meta: {
        // renamedHeaders: { __proto___1: '__proto__', __proto___2: '__proto__' },
        cursor: 35,
      },
    },
  },

]

export const PARSE_TESTS = [
  {
    description: 'Two rows, just \\r',
    text: 'A,b,c\rd,E,f',
    expected: {
      data: [['A', 'b', 'c'], ['d', 'E', 'f']],
      errors: [],
    },
  },
  {
    description: 'Two rows, \\r\\n',
    text: 'A,b,c\r\nd,E,f',
    expected: {
      data: [['A', 'b', 'c'], ['d', 'E', 'f']],
      errors: [],
    },
  },
  {
    description: 'Quoted field with \\r\\n',
    text: 'A,"B\r\nB",C',
    expected: {
      data: [['A', 'B\r\nB', 'C']],
      errors: [],
    },
  },
  {
    description: 'Quoted field with \\r',
    text: 'A,"B\rB",C',
    expected: {
      data: [['A', 'B\rB', 'C']],
      errors: [],
    },
  },
  {
    description: 'Quoted field with \\n',
    text: 'A,"B\nB",C',
    expected: {
      data: [['A', 'B\nB', 'C']],
      errors: [],
    },
  },
  {
    description: 'Quoted fields with spaces between closing quote and next delimiter',
    text: 'A,"B" ,C,D\r\nE,F,"G"  ,H',
    expected: {
      data: [['A', 'B', 'C', 'D'], ['E', 'F', 'G', 'H']],
      errors: [],
    },
  },
  {
    description: 'Quoted fields with spaces between closing quote and next new line',
    text: 'A,B,C,"D" \r\nE,F,G,"H"  \r\nQ,W,E,R',
    expected: {
      data: [['A', 'B', 'C', 'D'], ['E', 'F', 'G', 'H'], ['Q', 'W', 'E', 'R']],
      errors: [],
    },
  },
  {
    description: 'Quoted fields with spaces after closing quote',
    text: 'A,"B" ,C,"D" \r\nE,F,"G"  ,"H"  \r\nQ,W,"E" ,R',
    expected: {
      data: [['A', 'B', 'C', 'D'], ['E', 'F', 'G', 'H'], ['Q', 'W', 'E', 'R']],
      errors: [],
    },
  },
  {
    description: 'Misplaced quotes in data twice, not as opening quotes',
    text: 'A,B",C\nD,E",F',
    expected: {
      data: [['A', 'B"', 'C'], ['D', 'E"', 'F']],
      errors: [],
    },
  },
  {
    description: 'Mixed slash n and slash r should choose first as precident',
    text: 'a,b,c\nd,e,f\rg,h,i\n',
    expected: {
      data: [['a', 'b', 'c'], ['d', 'e', 'f\rg', 'h', 'i'], ['']],
      errors: [],
    },
  },
  // TODO(SL): implement header: true?
  // {
  //   description: 'Header row with one row of data',
  //   text: 'A,B,C\r\na,b,c',
  //   config: { header: true },
  //   expected: {
  //     data: [{ A: 'a', B: 'b', C: 'c' }],
  //     errors: [],
  //   },
  // },
  // {
  //   description: 'Header row only',
  //   text: 'A,B,C',
  //   config: { header: true },
  //   expected: {
  //     data: [],
  //     errors: [],
  //   },
  // },
  // {
  //   description: 'Row with too few fields',
  //   text: 'A,B,C\r\na,b',
  //   config: { header: true },
  //   expected: {
  //     data: [{ A: 'a', B: 'b' }],
  //     errors: [{
  //       type: 'FieldMismatch',
  //       code: 'TooFewFields',
  //       message: 'Too few fields: expected 3 fields but parsed 2',
  //       row: 0,
  //     }],
  //   },
  // },
  // {
  //   description: 'Row with too many fields',
  //   text: 'A,B,C\r\na,b,c,d,e\r\nf,g,h',
  //   config: { header: true },
  //   expected: {
  //     data: [{ A: 'a', B: 'b', C: 'c', __parsed_extra: ['d', 'e'] }, { A: 'f', B: 'g', C: 'h' }],
  //     errors: [{
  //       type: 'FieldMismatch',
  //       code: 'TooManyFields',
  //       message: 'Too many fields: expected 3 fields but parsed 5',
  //       row: 0,
  //     }],
  //   },
  // },
  {
    description: 'Row with enough fields but blank field in the begining',
    text: 'A,B,C\r\n,b1,c1\r\na2,b2,c2',
    expected: {
      data: [['A', 'B', 'C'], ['', 'b1', 'c1'], ['a2', 'b2', 'c2']],
      errors: [],
    },
  },
  // TODO(SL): implement header: true?
  // {
  //   description: 'Row with enough fields but blank field in the begining using headers',
  //   text: 'A,B,C\r\n,b1,c1\r\n,b2,c2',
  //   config: { header: true },
  //   expected: {
  //     data: [{ A: '', B: 'b1', C: 'c1' }, { A: '', B: 'b2', C: 'c2' }],
  //     errors: [],
  //   },
  // },
  // {
  //   description: 'Row with enough fields but blank field at end',
  //   text: 'A,B,C\r\na,b,',
  //   config: { header: true },
  //   expected: {
  //     data: [{ A: 'a', B: 'b', C: '' }],
  //     errors: [],
  //   },
  // },
  // {
  //   description: 'Line ends with quoted field, first field of next line is empty using headers',
  //   text: 'a,b,"c"\r\nd,e,"f"\r\n,"h","i"\r\n,"k","l"',
  //   config: {
  //     header: true,
  //     newline: '\r\n',
  //   },
  //   expected: {
  //     data: [
  //       { a: 'd', b: 'e', c: 'f' },
  //       { a: '', b: 'h', c: 'i' },
  //       { a: '', b: 'k', c: 'l' },
  //     ],
  //     errors: [],
  //   },
  // },
  {
    description: 'Tab delimiter',
    text: 'a\tb\tc\r\nd\te\tf',
    config: { delimiter: '\t' },
    expected: {
      data: [['a', 'b', 'c'], ['d', 'e', 'f']],
      errors: [],
    },
  },
  {
    description: 'Pipe delimiter',
    text: 'a|b|c\r\nd|e|f',
    config: { delimiter: '|' },
    expected: {
      data: [['a', 'b', 'c'], ['d', 'e', 'f']],
      errors: [],
    },
  },
  {
    description: 'ASCII 30 delimiter',
    text: 'a' + RECORD_SEP + 'b' + RECORD_SEP + 'c\r\nd' + RECORD_SEP + 'e' + RECORD_SEP + 'f',
    config: { delimiter: RECORD_SEP },
    expected: {
      data: [['a', 'b', 'c'], ['d', 'e', 'f']],
      errors: [],
    },
  },
  {
    description: 'ASCII 31 delimiter',
    text: 'a' + UNIT_SEP + 'b' + UNIT_SEP + 'c\r\nd' + UNIT_SEP + 'e' + UNIT_SEP + 'f',
    config: { delimiter: UNIT_SEP },
    expected: {
      data: [['a', 'b', 'c'], ['d', 'e', 'f']],
      errors: [],
    },
  },
  // Papaparse silently defaults to comma, but we throw in this library.
  // {
  //   description: 'Bad delimiter (\\n)',
  //   text: 'a,b,c',
  //   config: { delimiter: '\n' },
  //   notes: 'Should silently default to comma',
  //   expected: {
  //     data: [['a', 'b', 'c']],
  //     errors: [],
  //   },
  // },
  {
    description: 'Multi-character delimiter',
    text: 'a, b, c',
    config: { delimiter: ', ' },
    expected: {
      data: [['a', 'b', 'c']],
      errors: [],
    },
  },
  {
    description: 'Multi-character delimiter (length 2) with quoted field',
    text: 'a, b, "c, e", d',
    config: { delimiter: ', ' },
    notes: 'The quotes must be immediately adjacent to the delimiter to indicate a quoted field',
    expected: {
      data: [['a', 'b', 'c, e', 'd']],
      errors: [],
    },
  },
  // {
  //   description: 'Callback delimiter',
  //   text: 'a$ b$ c',
  //   config: { delimiter: function (text) { return text[1] + ' ' } },
  //   expected: {
  //     data: [['a', 'b', 'c']],
  //     errors: [],
  //   },
  // },
  {
    description: 'Blank line at beginning',
    text: '\r\na,b,c\r\nd,e,f',
    config: { newline: '\r\n' as const },
    expected: {
      data: [[''], ['a', 'b', 'c'], ['d', 'e', 'f']],
      errors: [],
    },
  },
  {
    description: 'Blank line in middle',
    text: 'a,b,c\r\n\r\nd,e,f',
    config: { newline: '\r\n' as const },
    expected: {
      data: [['a', 'b', 'c'], [''], ['d', 'e', 'f']],
      errors: [],
    },
  },
  {
    description: 'Blank lines at end',
    text: 'a,b,c\nd,e,f\n\n',
    expected: {
      data: [['a', 'b', 'c'], ['d', 'e', 'f'], [''], ['']],
      errors: [],
    },
  },
  {
    description: 'Blank line in middle with whitespace',
    text: 'a,b,c\r\n \r\nd,e,f',
    expected: {
      data: [['a', 'b', 'c'], [' '], ['d', 'e', 'f']],
      errors: [],
    },
  },
  {
    description: 'First field of a line is empty',
    text: 'a,b,c\r\n,e,f',
    expected: {
      data: [['a', 'b', 'c'], ['', 'e', 'f']],
      errors: [],
    },
  },
  {
    description: 'Last field of a line is empty',
    text: 'a,b,\r\nd,e,f',
    expected: {
      data: [['a', 'b', ''], ['d', 'e', 'f']],
      errors: [],
    },
  },
  {
    description: 'Other fields are empty',
    text: 'a,,c\r\n,,',
    expected: {
      data: [['a', '', 'c'], ['', '', '']],
      errors: [],
    },
  },
  // Disabled, because it is contradictory with other tests (it should return one row with one empty field).
  // {
  //   description: 'Empty text string',
  //   text: '',
  //   expected: {
  //     data: [],
  //     errors: [],
  //   },
  // },
  {
    description: 'Input is just the delimiter (2 empty fields)',
    text: ',',
    expected: {
      data: [['', '']],
      errors: [],
    },
  },
  {
    description: 'Input is just a string (a single field)',
    text: 'Abc def',
    expected: {
      data: [['Abc def']],
      errors: [
        {
          type: 'Delimiter',
          code: 'UndetectableDelimiter',
          message: 'Unable to auto-detect delimiting character; defaulted to \',\'',
        },
      ],
    },
  },
  {
    description: 'Empty lines',
    text: '\na,b,c\n\nd,e,f\n\n',
    config: { delimiter: ',' },
    expected: {
      data: [[''], ['a', 'b', 'c'], [''], ['d', 'e', 'f'], [''], ['']],
      errors: [],
    },
  },
  {
    description: 'Lines with comments are not used when guessing the delimiter in an escaped file',
    notes: 'Guessing the delimiter should work even if there are many lines of comments at the start of the file',
    text: '#1\n#2\n#3\n#4\n#5\n#6\n#7\n#8\n#9\n#10\none,"t,w,o",three\nfour,five,six',
    config: { comments: '#' },
    expected: {
      data: [['one', 't,w,o', 'three'], ['four', 'five', 'six']],
      errors: [],
    },
  },
  {
    description: 'Lines with comments are not used when guessing the delimiter in a non-escaped file',
    notes: 'Guessing the delimiter should work even if there are many lines of comments at the start of the file',
    text: '#1\n#2\n#3\n#4\n#5\n#6\n#7\n#8\n#9\n#10\n#11\none,two,three\nfour,five,six',
    config: { comments: '#' },
    expected: {
      data: [['one', 'two', 'three'], ['four', 'five', 'six']],
      errors: [],
    },
  },
  {
    description: 'Pipe delimiter is guessed correctly when mixed with comas',
    notes: 'Guessing the delimiter should work even if there are many lines of comments at the start of the file',
    text: 'one|two,two|three\nfour|five,five|six',
    config: {},
    expected: {
      data: [['one', 'two,two', 'three'], ['four', 'five,five', 'six']],
      errors: [],
    },
  },
  {
    description: 'Pipe delimiter is guessed correctly choose avgFildCount max one',
    notes: 'Guessing the delimiter should work choose the min delta one and the max one',
    config: {},
    text: 'a,b,c\na,b,c|d|e|f',
    expected: {
      data: [['a', 'b', 'c'], ['a', 'b', 'c|d|e|f']],
      errors: [],
    },
  },
  {
    description: 'Pipe delimiter is guessed correctly when first field are enclosed in quotes and contain delimiter characters',
    notes: 'Guessing the delimiter should work if the first field is enclosed in quotes, but others are not',
    text: '"Field1,1,1";Field2;"Field3";Field4;Field5;Field6',
    config: {},
    expected: {
      data: [['Field1,1,1', 'Field2', 'Field3', 'Field4', 'Field5', 'Field6']],
      errors: [],
    },
  },
  {
    description: 'Pipe delimiter is guessed correctly when some fields are enclosed in quotes and contain delimiter characters and escaoped quotes',
    notes: 'Guessing the delimiter should work even if the first field is not enclosed in quotes, but others are',
    text: 'Field1;Field2;"Field,3,""3,3";Field4;Field5;"Field6,6"',
    config: {},
    expected: {
      data: [['Field1', 'Field2', 'Field,3,"3,3', 'Field4', 'Field5', 'Field6,6']],
      errors: [],
    },
  },
  {
    description: 'Single quote as quote character',
    notes: 'Must parse correctly when single quote is specified as a quote character',
    text: 'a,b,\'c,d\'',
    config: { quoteChar: '\'' },
    expected: {
      data: [['a', 'b', 'c,d']],
      errors: [],
    },
  },
  {
    description: 'Custom escape character in the middle',
    notes: 'Must parse correctly if the backslash sign (\\) is configured as a custom escape character',
    text: 'a,b,"c\\"d\\"f"',
    config: { escapeChar: '\\' },
    expected: {
      data: [['a', 'b', 'c"d"f']],
      errors: [],
    },
  },
  {
    description: 'Custom escape character at the end',
    notes: 'Must parse correctly if the backslash sign (\\) is configured as a custom escape character and the escaped quote character appears at the end of the column',
    text: 'a,b,"c\\"d\\""',
    config: { escapeChar: '\\' },
    expected: {
      data: [['a', 'b', 'c"d"']],
      errors: [],
    },
  },
  {
    description: 'Custom escape character not used for escaping',
    notes: 'Must parse correctly if the backslash sign (\\) is configured as a custom escape character and appears as regular character in the text',
    text: 'a,b,"c\\d"',
    config: { escapeChar: '\\' },
    expected: {
      data: [['a', 'b', 'c\\d']],
      errors: [],
    },
  },
  // TODO(SL): implement header: true?
  // {
  //   description: 'Header row with preceding comment',
  //   notes: 'Must parse correctly headers if they are preceded by comments',
  //   text: '#Comment\na,b\nc,d\n',
  //   config: { header: true, comments: '#', skipEmptyLines: true, delimiter: ',' },
  //   expected: {
  //     data: [{ a: 'c', b: 'd' }],
  //     errors: [],
  //   },
  // },
  {
    description: 'Carriage return in header inside quotes, with line feed endings',
    text: '"a\r\na","b"\n"c","d"\n"e","f"\n"g","h"\n"i","j"',
    config: {},
    expected: {
      data: [['a\r\na', 'b'], ['c', 'd'], ['e', 'f'], ['g', 'h'], ['i', 'j']],
      errors: [],
    },
  },
  {
    description: 'Line feed in header inside quotes, with carriage return + line feed endings',
    text: '"a\na","b"\r\n"c","d"\r\n"e","f"\r\n"g","h"\r\n"i","j"',
    config: {},
    expected: {
      data: [['a\na', 'b'], ['c', 'd'], ['e', 'f'], ['g', 'h'], ['i', 'j']],
      errors: [],
    },
  },
  {
    description: 'Using \\r\\n endings uses \\r\\n linebreak',
    text: 'a,b\r\nc,d\r\ne,f\r\ng,h\r\ni,j',
    config: {},
    expected: {
      data: [['a', 'b'], ['c', 'd'], ['e', 'f'], ['g', 'h'], ['i', 'j']],
      errors: [],
      meta: {
        linebreak: '\r\n',
        delimiter: ',',
        cursor: 23,
        aborted: false,
        renamedHeaders: null,
      },
    },
  },
  {
    description: 'Using \\n endings uses \\n linebreak',
    text: 'a,b\nc,d\ne,f\ng,h\ni,j',
    config: {},
    expected: {
      data: [['a', 'b'], ['c', 'd'], ['e', 'f'], ['g', 'h'], ['i', 'j']],
      errors: [],
      meta: {
        linebreak: '\n',
        delimiter: ',',
        cursor: 19,
        aborted: false,
        renamedHeaders: null,
      },
    },
  },
  {
    description: 'Using \\r\\n endings with \\r\\n in header field uses \\r\\n linebreak',
    text: '"a\r\na",b\r\nc,d\r\ne,f\r\ng,h\r\ni,j',
    config: {},
    expected: {
      data: [['a\r\na', 'b'], ['c', 'd'], ['e', 'f'], ['g', 'h'], ['i', 'j']],
      errors: [],
      meta: {
        linebreak: '\r\n',
        delimiter: ',',
        cursor: 28,
        aborted: false,
        renamedHeaders: null,
      },
    },
  },
  {
    description: 'Using \\r\\n endings with \\n in header field uses \\r\\n linebreak',
    text: '"a\na",b\r\nc,d\r\ne,f\r\ng,h\r\ni,j',
    config: {},
    expected: {
      data: [['a\na', 'b'], ['c', 'd'], ['e', 'f'], ['g', 'h'], ['i', 'j']],
      errors: [],
      meta: {
        linebreak: '\r\n',
        delimiter: ',',
        cursor: 27,
        aborted: false,
        renamedHeaders: null,
      },
    },
  },
  {
    description: 'Using \\n endings with \\r\\n in header field uses \\n linebreak',
    text: '"a\r\na",b\nc,d\ne,f\ng,h\ni,j',
    config: {},
    expected: {
      data: [['a\r\na', 'b'], ['c', 'd'], ['e', 'f'], ['g', 'h'], ['i', 'j']],
      errors: [],
      meta: {
        linebreak: '\n',
        delimiter: ',',
        cursor: 24,
        aborted: false,
        renamedHeaders: null,
      },
    },
  },
  {
    description: 'Using reserved regex character . as quote character',
    text: '.a\na.,b\r\nc,d\r\ne,f\r\ng,h\r\ni,j',
    config: { quoteChar: '.' },
    expected: {
      data: [['a\na', 'b'], ['c', 'd'], ['e', 'f'], ['g', 'h'], ['i', 'j']],
      errors: [],
      meta: {
        linebreak: '\r\n',
        delimiter: ',',
        cursor: 27,
        aborted: false,
        renamedHeaders: null,
      },
    },
  },
  {
    description: 'Using reserved regex character | as quote character',
    text: '|a\na|,b\r\nc,d\r\ne,f\r\ng,h\r\ni,j',
    config: { quoteChar: '|' },
    expected: {
      data: [['a\na', 'b'], ['c', 'd'], ['e', 'f'], ['g', 'h'], ['i', 'j']],
      errors: [],
      meta: {
        linebreak: '\r\n',
        delimiter: ',',
        cursor: 27,
        aborted: false,
        renamedHeaders: null,
      },
    },
  },
  {
    description: 'UTF-8 BOM encoded text is stripped from invisible BOM character',
    text: '\ufeffA,B\nX,Y',
    config: {},
    expected: {
      data: [['A', 'B'], ['X', 'Y']],
      errors: [],
    },
  },
  // TODO(SL): implement header: true?
  // {
  //   description: 'UTF-8 BOM encoded text with header produces column key stripped from invisible BOM character',
  //   text: '\ufeffA,B\nX,Y',
  //   config: { header: true },
  //   expected: {
  //     data: [{ A: 'X', B: 'Y' }],
  //     errors: [],
  //   },
  // },
  {
    description: 'Quoted fields with spaces between closing quote and next delimiter and contains delimiter',
    text: 'A,",B" ,C,D\nE,F,G,H',
    expected: {
      data: [['A', ',B', 'C', 'D'], ['E', 'F', 'G', 'H']],
      errors: [],
    },
  },
  {
    description: 'Quoted fields with spaces between closing quote and newline and contains newline',
    text: 'a,b,"c\n" \nd,e,f',
    expected: {
      data: [['a', 'b', 'c\n'], ['d', 'e', 'f']],
      errors: [],
    },
  },
]
