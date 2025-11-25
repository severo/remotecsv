# csv-range

[![npm](https://img.shields.io/npm/v/csv-range)](https://www.npmjs.com/package/csv-range)
[![minzipped](https://img.shields.io/bundlephobia/minzip/csv-range)](https://www.npmjs.com/package/csv-range)
[![workflow status](https://github.com/severo/csv-range/actions/workflows/ci.yml/badge.svg)](https://github.com/severo/csv-range/actions)
[![mit license](https://img.shields.io/badge/License-MIT-orange.svg)](https://opensource.org/licenses/MIT)
![coverage](https://img.shields.io/badge/Coverage-100-darkred)
[![dependencies](https://img.shields.io/badge/Dependencies-0-blueviolet)](https://www.npmjs.com/package/csv-range?activeTab=dependencies)

Fetch and parse ranges of CSV file.

## Install

```bash
npm install csv-range
```

## Usage

Parse a remote CSV file from a URL:

```typescript
import { parseURL } from 'csv-range'
const url = 'https://data.source.coop/severo/csv-papaparse-test-files/sample.csv'
const rows = []
for await (const { row } of parseURL(url)) {
    rows.push(row)
}
console.log(rows)
// Output: [ [ 'A', 'B', 'C' ], [ 'X', 'Y', 'Z' ] ]
```

### Output format

The `parseURL` function yields an object for each row with the following properties:
- `row`: array of strings with the values of the row.
- `errors`: array of parsing errors found in the row.
- `meta`: object with metadata about the parsing process.

The format is described on the doc pages: https://severo.github.io/csv-range/interfaces/ParseResult.html.

The `row` field might contain fewer or more columns than expected, depending on the CSV content. It can be an empty array for empty rows. It's up to the user to handle these cases. The library does not trim whitespace from values, and it does not convert types.

The `errors` field contains any parsing errors found in the row. It's an array of error messages, which can be useful for debugging.

The `meta` field provides the `delimiter` and `newline` strings, detected automatically, or specified by the user. It also gives the number of characters of the line (as counted by JavaScript) and the corresponding number of bytes in the original CSV file (which may differ due to multi-byte characters) and byte offset in the file. These counts include the newline characters.

### Options

The `parseURL` function accepts an optional second argument with options.

It can contain options for [fetching](https://severo.github.io/csv-range/interfaces/FetchOptions.html) the CSV file, for [guessing](https://severo.github.io/csv-range/interfaces/GuessOptions.html) the delimiter and newline characters, and for [parsing](https://severo.github.io/csv-range/interfaces/ParseOptions.html) the CSV content.


## Examples

Find some examples of usage below. You can also find them in the [examples](https://github.com/severo/csv-range/tree/main/examples/) directory, and run them with `npm run examples`.

### Only the first 10 rows

As the library uses async iterators, it's easy to stop parsing after a certain number of rows:

```typescript
import { parseURL } from 'csv-range'
const url = 'https://data.source.coop/severo/csv-papaparse-test-files/verylong-sample.csv'
const rows = []
let count = 0
for await (const { row } of parseURL(url)) {
    rows.push(row)
    count++
    if (count >= 10) {
        break
    }
}
console.log(rows)
```

### Fetch a specific byte range

You can fetch only a specific byte range of the CSV file, to parse only a part of it. This is useful for large files.

```typescript
import { parseURL } from 'csv-range'
const url = 'https://data.source.coop/severo/csv-papaparse-test-files/verylong-sample.csv'
const fetchOptions = {
    firstByte: 30_000,
    lastByte: 30_200
}
const rows = []
for await (const { row } of parseURL(url, { fetch: fetchOptions })) {
    rows.push(row)
}
console.log(rows)
```

Use the `result.meta.byteOffset` and `result.meta.byteCount` fields to know the exact byte range of each parsed row, and adjust your fetching strategy accordingly. See the [examples](https://github.com/severo/csv-range/tree/main/examples/) for an in-depth look.

### Parse a string

You can also parse a CSV string directly with the `parseString` function:

```typescript
import { parseText } from 'csv-range'
const csvString = 'A,B,C\nX,Y,Z'
const rows = []
for await (const { row } of parseText(csvString)) {
    rows.push(row)
}
console.log(rows)
```

Note that `parseText` provide a synchronous iterator, so you don't need to use `await` in the `for` loop.

## Early version

This is an early version:

- until 1.0.0, breaking changes will be introduced only in minor versions.
- from version 1.0.0, breaking changes will be introduced only in major versions.

## Used by

This library is used by [source.coop](https://source.coop/severo/csv-papaparse-test-files/verylong-sample.csv) to preview the CSV files. More info in [csv-table](https://github.com/source-cooperative/csv-table/), which fetches ranges of the remote CSV to display the rows that are visible in the table. It also caches the fetched ranges to avoid re-fetching them when scrolling.

## Thanks

The code is heavily inspired by [Papaparse](https://www.papaparse.com/).

It has partly been funded by [source.coop](https://source.coop/).
