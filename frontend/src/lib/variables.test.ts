import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { derive } from './variables';

const fixtures = JSON.parse(
  readFileSync(join(__dirname, '../../../database/tests/variables-fixtures.json'), 'utf-8')
);

describe('derive (TS)', () => {
  for (const c of fixtures.cases) {
    test(c.name, () => {
      expect(derive(c.config)).toStrictEqual(c.expect);
    });
  }
});
