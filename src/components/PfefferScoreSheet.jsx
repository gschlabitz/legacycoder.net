import { useState, useMemo, useEffect } from "react";

const WINNING_SCORE = 10000;
const ROUND_MINIMUM = 350;
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 6;
const STORAGE_KEY = "pfeffer.players";

// Button styling reuses Starlight's theme tokens so the buttons track the
// active light/dark palette without depending on Starlight's own components
// (which are Astro-only and can't render inside this React island).
const btnBase = {
  font: "inherit",
  fontWeight: 600,
  padding: "0.4em 0.9em",
  borderRadius: "0.35rem",
  border: "1px solid transparent",
  lineHeight: 1.2,
  cursor: "pointer",
};
const btnPrimary = { ...btnBase, background: "var(--sl-color-accent)", color: "var(--sl-color-text-invert)" };
const btnSecondary = {
  ...btnBase,
  background: "transparent",
  borderColor: "var(--sl-color-gray-5)",
  color: "var(--sl-color-text)",
};
const btnDisabled = { opacity: 0.5, cursor: "not-allowed" };

// A single fixed width for every name/score input so the columns line up.
const inputStyle = { width: "6rem", boxSizing: "border-box" };

function makeId() {
  // No Date.now()/Math.random() needed — a monotonic counter is enough for keys.
  makeId.n = (makeId.n || 0) + 1;
  return makeId.n;
}

function emptyPlayer(name, rounds = 0) {
  return { id: makeId(), name, scores: Array(rounds).fill("") };
}

function defaultPlayers() {
  return [emptyPlayer("Player 1"), emptyPlayer("Player 2")];
}

// Restore the saved sheet so scores survive a refresh. Falls back to a fresh
// two-player sheet if nothing valid is stored.
function loadPlayers() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const valid =
      Array.isArray(parsed) &&
      parsed.length >= MIN_PLAYERS &&
      parsed.every((p) => p && typeof p.name === "string" && Array.isArray(p.scores) && Number.isFinite(p.id));
    if (!valid) return defaultPlayers();
    // Keep the id counter ahead of any restored ids so new players stay unique.
    makeId.n = Math.max(makeId.n || 0, ...parsed.map((p) => p.id));
    return parsed;
  } catch {
    return defaultPlayers();
  }
}

export default function PfefferScoreSheet() {
  const [players, setPlayers] = useState(loadPlayers);

  // Persist the sheet on every change so it survives refreshes.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
    } catch {
      // ignore quota / unavailable storage
    }
  }, [players]);

  const totals = useMemo(() => players.map((p) => p.scores.reduce((sum, s) => sum + (Number(s) || 0), 0)), [players]);

  const rounds = players.reduce((max, p) => Math.max(max, p.scores.length), 0);

  const leaderTotal = Math.max(0, ...totals);
  const winnerReached = leaderTotal >= WINNING_SCORE;

  function renamePlayer(id, name) {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
  }

  function addPlayer() {
    setPlayers((prev) =>
      prev.length >= MAX_PLAYERS ? prev : [...prev, emptyPlayer(`Player ${prev.length + 1}`, rounds)],
    );
  }

  function removePlayer(id) {
    setPlayers((prev) => (prev.length > MIN_PLAYERS ? prev.filter((p) => p.id !== id) : prev));
  }

  function setScore(playerId, roundIndex, value) {
    // Allow an optional leading minus then digits (negative scores are valid,
    // e.g. a failed pfeffer bet). Keep "" / "-" as valid in-progress input.
    const clean = (value.match(/^-?\d*/) || [""])[0];
    setPlayers((prev) =>
      prev.map((p) => {
        // Extend every player to this round so the trailing empty row, once
        // typed into, becomes a committed round (and a fresh empty row appears).
        const scores = p.scores.slice();
        while (scores.length <= roundIndex) scores.push("");
        if (p.id === playerId) scores[roundIndex] = clean;
        return { ...p, scores };
      }),
    );
  }

  function resetGame() {
    setPlayers((prev) => prev.map((p) => ({ ...p, scores: [] })));
  }

  return (
    <section aria-labelledby="sheet-title">
      <div>
        <h2 id="sheet-title">Score sheet</h2>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            type="button"
            onClick={addPlayer}
            disabled={players.length >= MAX_PLAYERS}
            title={players.length >= MAX_PLAYERS ? `Maximum ${MAX_PLAYERS} players` : undefined}
            style={players.length >= MAX_PLAYERS ? { ...btnPrimary, ...btnDisabled } : btnPrimary}
          >
            + Player
          </button>
          <button type="button" onClick={resetGame} style={btnSecondary}>
            Reset
          </button>
        </div>
      </div>

      {winnerReached && (
        <div role="status">
          🎉 {players[totals.indexOf(leaderTotal)]?.name || "Someone"} has reached {WINNING_SCORE.toLocaleString()}!
        </div>
      )}

      <div>
        <table>
          <thead>
            <tr>
              <th scope="col">#</th>
              {players.map((p) => (
                <th scope="col" key={p.id}>
                  <div>
                    <input
                      value={p.name}
                      aria-label="Player name"
                      style={inputStyle}
                      onChange={(e) => renamePlayer(p.id, e.target.value)}
                    />
                    {players.length > MIN_PLAYERS && (
                      <button
                        type="button"
                        aria-label={`Remove ${p.name}`}
                        title="Remove player"
                        onClick={() => removePlayer(p.id)}
                      >
                        ×
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* One extra row beyond the committed rounds is always present and
                empty; typing into it commits the round and spawns a new one. */}
            {Array.from({ length: rounds + 1 }).map((_, r) => {
              return (
                <tr key={r}>
                  <th scope="row">{r + 1}</th>
                  {players.map((p) => (
                    <td key={p.id}>
                      <input
                        inputMode="numeric"
                        value={p.scores[r] ?? ""}
                        placeholder="0"
                        style={inputStyle}
                        onChange={(e) => setScore(p.id, r, e.target.value)}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Σ</th>
              {players.map((p, i) => (
                <td key={p.id}>{totals[i].toLocaleString()}</td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
