# removecsv

Fetch and parse a remote CSV file.

## Install

```bash
npm install csv-range
```

## Usage

To parse a remote CSV file from a URL:

```typescript
import { parseURL } from 'csv-range'
const rows = []
for await (const { row } of parseURL('https://data.source.coop/severo/csv-papaparse-test-files/sample.csv')) {
    rows.push(row)
}
console.log(rows)
// Output: [ [ 'A', 'B', 'C' ], [ 'X', 'Y', 'Z' ] ]
```

## Thanks

The code is heavily inspired by [Papaparse](https://www.papaparse.com/).

It has partly been funded by [source.coop](https://source.coop/).
