import assert from 'node:assert/strict';
import { generateCalendar, isDue, parseArgs } from '../scripts/care-calendar.mjs';

const basil = {
  slug: 'test-basil',
  care: {
    watering: { every: 2, unit: 'days' },
    fertilizing: { every: 4, unit: 'weeks', months: [4, 5, 6, 7, 8, 9] },
    repotting: { every: 1, unit: 'years', months: [4, 5] },
  },
};
const tomato = {
  slug: 'test-tomato',
  care: {
    watering: { every: 2, unit: 'days', months: [5, 6, 7, 8, 9, 10] },
    fertilizing: { every: 2, unit: 'weeks', months: [5, 6, 7, 8, 9] },
    repotting: { every: 1, unit: 'years', months: [5] },
  },
};

const year = generateCalendar({ plants: [basil, tomato], start: { year: 2026, month: 1 }, months: 12 });

// Deterministic: a second run over a subset reproduces the same dates.
assert.deepEqual(
  generateCalendar({ plants: [basil], start: { year: 2026, month: 1 }, months: 12 }).map((d) => d.id),
  year.filter((d) => Object.values(d).flat().includes('test-basil')).map((d) => d.id),
);

// Month windows hold: a seasonal waterer never shows outside its window.
const monthOf = (day) => Number(day.id.slice(5, 7));
for (const day of year) {
  if (day.watering?.includes('test-tomato'))
    assert.ok(monthOf(day) >= 5 && monthOf(day) <= 10, `tomato watered in month ${monthOf(day)}`);
  if (day.fertilizing?.includes('test-basil'))
    assert.ok(monthOf(day) >= 4 && monthOf(day) <= 9, `basil fed in month ${monthOf(day)}`);
}

// Liquid feeding absorbs watering: never both tasks for one plant on one day.
for (const day of year) {
  for (const slug of day.fertilizing ?? []) {
    assert.ok(!day.watering?.includes(slug), `${slug} watered and fed on ${day.id}`);
  }
}

// Year-round watering keeps its cadence: consecutive due days sit `every` apart
// (feed days replace, and so preserve, the 2-day grid).
const basilDays = year
  .filter((d) => d.watering?.includes('test-basil') || d.fertilizing?.includes('test-basil'))
  .map((d) => Date.parse(d.id) / 86_400_000);
const basilWater = year
  .filter((d) => d.watering?.includes('test-basil'))
  .map((d) => Date.parse(d.id) / 86_400_000);
for (let i = 1; i < basilWater.length; i += 1) {
  const gap = basilWater[i] - basilWater[i - 1];
  assert.ok(gap % 2 === 0, `off-grid watering gap of ${gap} days`);
  if (gap > 2) {
    // Skipped grid days must be feed days, not silent holes.
    for (let d = basilWater[i - 1] + 2; d < basilWater[i]; d += 2) {
      assert.ok(basilDays.includes(d), `missing care day at ${new Date(d * 86_400_000).toISOString().slice(0, 10)}`);
    }
  }
}

// Repotting resolves to exactly one day per year, inside its window.
const basilRepots = year.filter((d) => d.repotting?.includes('test-basil'));
assert.equal(basilRepots.length, 1);
assert.ok([4, 5].includes(monthOf(basilRepots[0])));

// isDue is pure UTC: the same date string always answers the same.
const date = new Date('2026-06-04T00:00:00Z');
assert.equal(
  isDue(basil.care.watering, date, 'test-basil:watering'),
  isDue(basil.care.watering, new Date(date), 'test-basil:watering'),
);

// CLI argument parsing.
assert.deepEqual(parseArgs([]), { months: 12 });
assert.deepEqual(parseArgs(['--start', '2027-01', '--months', '18']), {
  start: { year: 2027, month: 1 },
  months: 18,
});
assert.throws(() => parseArgs(['--start', 'January']));

console.log('care-calendar tests passed');
