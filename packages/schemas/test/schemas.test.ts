import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION } from '../src/index.js';

describe('schemas package', () => {
  it('exposes schema version 1', () => {
    expect(SCHEMA_VERSION).toBe(1);
  });
});
