# CHANGELOG

## [0.1.0]

- export more types
- add example tests, docs and improve README

## [0.0.10]

- add previewLines option to delimiter and initial state detection

## [0.0.9]

- add initialState option to parse options ('inQuotes' | 'detect' | 'default')

## [0.0.8]

- return with no iteration if the URL is an empty Blob URL
- return with no iteration if the byte range is invalid

## [0.0.7]

- export toBlobURL utility function

## [0.0.6]

- rename testEmptyLine to isEmptyLine, change its signature to accept options object with greedy property

## [0.0.5]

- export Newline type

## [0.0.4]

- export parse result types

## [0.0.3]

- handle invalid bytes at the start of a range
- don't strip BOM if not at the start of the file
