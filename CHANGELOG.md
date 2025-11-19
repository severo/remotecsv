# CHANGELOG

## [0.0.8]

- return with no iteration if the URL is an empty Blob URL
- return with no iteration if the byte range is invalid

## [0.0.7]

- export toURL utility function

## [0.0.6]

- rename testEmptyLine to isEmptyLine, change its signature to accept options object with greedy property

## [0.0.5]

- export Newline type

## [0.0.4]

- export parse result types

## [0.0.3]

- handle invalid bytes at the start of a range
- don't strip BOM if not at the start of the file
