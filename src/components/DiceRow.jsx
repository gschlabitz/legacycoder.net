import Die from "./Die.jsx";

// Renders a set of dice on a single line. `faces` is the list of die values;
// optional `groups` splits them into visual clusters (e.g. [2, 2, 2] shows
// three pairs with a gap between each pair) so combos read clearly.
export default function DiceRow({ faces, groups }) {
  const chunks = [];
  if (groups) {
    let i = 0;
    for (const n of groups) {
      chunks.push(faces.slice(i, i + n));
      i += n;
    }
  } else {
    chunks.push(faces);
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.75rem", whiteSpace: "nowrap" }}>
      {chunks.map((chunk, ci) => (
        <span key={ci} style={{ display: "inline-flex", gap: "0.15rem" }}>
          {chunk.map((f, i) => (
            <Die key={i} face={f} />
          ))}
        </span>
      ))}
    </span>
  );
}
