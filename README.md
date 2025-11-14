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
