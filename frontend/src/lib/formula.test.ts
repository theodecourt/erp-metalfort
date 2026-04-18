import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { evaluate } from './formula';

const fixtures = JSON.parse(
  readFileSync(
    join(__dirname, '../../../database/tests/formula-fixtures.json'),
    'utf-8'
  )
);

describe('formula engine (TS)', () => {
  for (const c of fixtures.cases) {
    test(c.name, () => {
      const actual = evaluate(c.formula, c.vars);
      if (typeof c.expect === 'number' && !Number.isInteger(c.expect)) {
        expect(actual).toBeCloseTo(c.expect as number, 9);
      } else {
        expect(actual).toStrictEqual(c.expect);
      }
    });
  }
});
