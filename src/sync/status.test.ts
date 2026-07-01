import { describe, it, expect } from 'vitest';
import { deriveStatus } from './index';

describe('deriveStatus', () => {
  it('reports offline when the last sync attempt failed, regardless of pending', () => {
    expect(deriveStatus({ lastError: true, pendingCount: 0 })).toBe('offline');
    expect(deriveStatus({ lastError: true, pendingCount: 3 })).toBe('offline');
  });

  it('reports pending when local edits await push', () => {
    expect(deriveStatus({ lastError: false, pendingCount: 2 })).toBe('pending');
  });

  it('reports synced when online and nothing is queued', () => {
    expect(deriveStatus({ lastError: false, pendingCount: 0 })).toBe('synced');
  });
});
