// Authoring convenience for timeline events: resolve a free-form place or
// address string to the structured `location` block the content schema
// requires (see src/content.config.ts) and print it paste-ready.
//
//   npm run geocode -- "213 North Granger Street, Harrisburg, Illinois"
//
// Uses Nominatim, OpenStreetMap's public geocoder — no API key, free for
// light interactive use. Its usage policy asks only for an identifying
// User-Agent and no more than one request per second; a one-off authoring
// lookup satisfies both. Several candidates are printed on purpose — as the
// raw prettified JSON, every field included: place names are ambiguous
// (Harrisburg, PA dwarfs Harrisburg, IL) and picking the right one is the
// author's call. Each result's `type` field says what precision the match
// has — `house` is an exact address point, street types mean a point
// somewhere along the road, `administrative` fell back to the whole town.
//
// The frontmatter block follows the site's display convention (label is
// derived as "city, state ?? country"): US matches get `state` and no
// `country`, matches abroad get `country` and no state. Coordinates are
// rounded to 4 decimals (~11 m), matching the existing timeline events.

const query = process.argv.slice(2).join(" ").trim();
if (!query) {
  console.error('Usage: npm run geocode -- "Harrisburg, Illinois"');
  process.exit(1);
}

const url = new URL("https://nominatim.openstreetmap.org/search");
url.searchParams.set("q", query);
url.searchParams.set("format", "jsonv2");
url.searchParams.set("addressdetails", "1");
url.searchParams.set("limit", "5");
// English place names — Nominatim defaults to local ones ("Deutschland"),
// while the site's labels are English ("Germany").
url.searchParams.set("accept-language", "en");

const res = await fetch(url, {
  headers: {
    // Nominatim's usage policy requires an identifying User-Agent.
    "User-Agent": "legacycoder.net timeline authoring (guido@govrecover.org)",
  },
});
if (!res.ok) {
  console.error(`Nominatim answered ${res.status} ${res.statusText}`);
  process.exit(1);
}
const results = await res.json();
if (!results.length) {
  console.error(`No match for "${query}" — try adding a state or country.`);
  process.exit(1);
}

const round = (n) => Number(Number(n).toFixed(4));

// Nominatim's address object → the schema's fields. The "city" slot varies
// by place size; take the most specific populated one.
function toLocation(r) {
  const a = r.address ?? {};
  const street = [a.house_number, a.road].filter(Boolean).join(" ");
  const city = a.city ?? a.town ?? a.village ?? a.hamlet ?? a.municipality;
  const abroad = a.country_code !== "us";
  return {
    address: street || undefined,
    city,
    state: abroad ? undefined : a.state,
    country: abroad ? a.country : undefined,
    postalCode: a.postcode ? `"${a.postcode}"` : undefined,
    lat: round(r.lat),
    lng: round(r.lon),
  };
}

// The full responses, so every field Nominatim knows is on the table —
// county, neighbourhood, OSM ids, bounding box, match type — not just the
// slice the frontmatter keeps.
console.log(JSON.stringify(results, null, 2));
console.log();

const top = toLocation(results[0]);
if (!top.city) {
  console.error(
    "The top match has no city — pick another candidate or add one by hand."
  );
}
console.log("Frontmatter for the top match:\n");
console.log("location:");
for (const [key, value] of Object.entries(top)) {
  if (value !== undefined) console.log(`  ${key}: ${value}`);
}
