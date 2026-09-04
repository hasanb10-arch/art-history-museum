// Local alternative to the /seed page: `DATABASE_URL=... npm run seed`
import { ALL_ARTISTS } from '../lib/catalog';
import { seedArtist, seedPeriods } from '../lib/seed';

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL first');
  console.log('Seeding periods');
  await seedPeriods();
  for (const a of ALL_ARTISTS) {
    const r = await seedArtist(a.period, a.title);
    console.log(`${r.status.padEnd(7)} ${a.title}: ${r.paintings ?? 0} paintings${r.note ? ' (' + r.note + ')' : ''}`);
  }
}
main().catch(e => { console.error(e.message); process.exit(1); });
