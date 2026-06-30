import { describe, it, expect } from 'vitest';
import { createDb } from './db';
import { LocalPlayerRepository } from './local-repositories';
import { importTrackManBaselines } from './trackman-import';
import fixture from './fixtures/trackman.sample.json';

describe('TrackMan baseline import', () => {
  it('imports the fixture into club baselines', async () => {
    const { db, close } = await createDb({ kind: 'memory' });
    const players = new LocalPlayerRepository(db);

    await importTrackManBaselines(players, fixture, 1000);
    const rows = await players.listClubBaselines();
    close();

    expect(rows).toHaveLength(3);
    const seven = rows.find((r) => r.club === '7i');
    expect(seven?.distanceYards).toBe(165);
    expect(seven?.dispersion).toEqual({ lateralYards: 8, longYards: 6 });
    expect(seven?.tendency).toBe('slight pull under pressure');
  });

  it('is idempotent on re-import (no duplicates, values updated)', async () => {
    const { db, close } = await createDb({ kind: 'memory' });
    const players = new LocalPlayerRepository(db);

    await importTrackManBaselines(players, fixture, 1000);
    // Re-import with a tweaked distance for Driver and a later clock.
    const tweaked = {
      clubs: fixture.clubs.map((c) =>
        c.club === 'Driver' ? { ...c, distanceYards: 272 } : c,
      ),
    };
    await importTrackManBaselines(players, tweaked, 2000);
    const rows = await players.listClubBaselines();
    close();

    expect(rows).toHaveLength(3); // no duplicates
    const driver = rows.find((r) => r.club === 'Driver');
    expect(driver?.distanceYards).toBe(272);
    expect(driver?.updatedAt).toBe(2000);
  });

  it('rejects malformed input', async () => {
    const { db, close } = await createDb({ kind: 'memory' });
    const players = new LocalPlayerRepository(db);
    await expect(
      importTrackManBaselines(players, { clubs: [{ club: '7i' }] }, 1000),
    ).rejects.toThrow();
    close();
  });
});
