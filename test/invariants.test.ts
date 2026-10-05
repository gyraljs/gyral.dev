import { describe, expect, it } from 'vitest';
import { checkWorkflow, relativeLinks } from '../scripts/lib/invariants.mjs';

describe('invariants', () => {
  it('rejects workflow triggers other than workflow_dispatch', () => {
    expect(checkWorkflow('ci.yml', 'on:\n  workflow_dispatch:\n')).toEqual([]);
    expect(checkWorkflow('ci.yml', 'on: [push, workflow_dispatch]\n')).toHaveLength(1);
  });

  it('finds relative markdown links', () => {
    expect(relativeLinks('[a](docs/x.md#y) [b](https://x.dev)')).toEqual(['docs/x.md']);
  });
});
