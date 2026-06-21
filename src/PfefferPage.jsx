import { useState, useMemo } from "react";
import { useTheme } from "./hooks/useTheme";

const WINNING_SCORE = 10000;
const OPENING_SCORE = 500;

// Pip positions on a 100×100 die, by face value.
const PIPS = {
  1: [[50, 50]],
  2: [[30, 30], [70, 70]],
  3: [[30, 30], [50, 50], [70, 70]],
  4: [[30, 30], [70, 30], [30, 70], [70, 70]],
  5: [[30, 30], [70, 30], [50, 50], [30, 70], [70, 70]],
  6: [[30, 30], [70, 30], [30, 50], [70, 50], [30, 70], [70, 70]],
};

function Die({ face }) {
  return (
    <svg className="pf-die" viewBox="0 0 100 100" aria-hidden="true">
      <rect className="pf-die__body" x="6" y="6" width="88" height="88" rx="18" ry="18" />
      {PIPS[face].map(([cx, cy], i) => (
        <circle key={i} className="pf-die__pip" cx={cx} cy={cy} r="9" />
      ))}
    </svg>
  );
}

// Each scoring combo, described as the dice faces to show.
// `groups` splits the faces into visual clusters (pairs / triplets).
const SCORING = [
  { label: "Single 1", points: "100", faces: [1] },
  { label: "Single 5", points: "50", faces: [5] },
  { label: "Three 1s", points: "1,000", faces: [1, 1, 1] },
  { label: "Three 2s", points: "200", faces: [2, 2, 2] },
  { label: "Three 3s", points: "300", faces: [3, 3, 3] },
  { label: "Three 4s", points: "400", faces: [4, 4, 4] },
  { label: "Three 5s", points: "500", faces: [5, 5, 5] },
  { label: "Three 6s", points: "600", faces: [6, 6, 6] },
  { label: "Four of a kind", points: "1,000", faces: [4, 4, 4, 4] },
  { label: "Five of a kind", points: "2,000", faces: [4, 4, 4, 4, 4] },
  { label: "Six of a kind", points: "3,000", faces: [4, 4, 4, 4, 4, 4] },
  { label: "Straight (1–6)", points: "1,500", faces: [1, 2, 3, 4, 5, 6] },
  { label: "Three pairs", points: "1,500", faces: [2, 2, 4, 4, 6, 6], groups: [2, 2, 2] },
  { label: "Two triplets", points: "2,500", faces: [3, 3, 3, 5, 5, 5], groups: [3, 3] },
];

function DiceRow({ faces, groups }) {
  // Split faces into clusters so pairs/triplets read as separate groups.
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
    <span className="pf-dice">
      {chunks.map((chunk, ci) => (
        <span className="pf-dice__group" key={ci}>
          {chunk.map((f, i) => (
            <Die key={i} face={f} />
          ))}
        </span>
      ))}
    </span>
  );
}

function makeId() {
  // No Date.now()/Math.random() needed — a monotonic counter is enough for keys.
  makeId.n = (makeId.n || 0) + 1;
  return makeId.n;
}

function emptyPlayer(name, rounds = 0) {
  return { id: makeId(), name, scores: Array(rounds).fill("") };
}

export default function Pfeffer() {
  const { theme, toggleTheme, icon: themeIcon, label: themeLabel } = useTheme();

  const [players, setPlayers] = useState(() => [
    emptyPlayer("Player 1"),
    emptyPlayer("Player 2"),
  ]);

  const totals = useMemo(
    () => players.map((p) => p.scores.reduce((sum, s) => sum + (Number(s) || 0), 0)),
    [players],
  );

  const rounds = players.reduce((max, p) => Math.max(max, p.scores.length), 0);

  const leaderTotal = Math.max(0, ...totals);
  const winnerReached = leaderTotal >= WINNING_SCORE;

  function renamePlayer(id, name) {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
  }

  function addPlayer() {
    setPlayers((prev) => [...prev, emptyPlayer(`Player ${prev.length + 1}`, rounds)]);
  }

  function removePlayer(id) {
    setPlayers((prev) => (prev.length > 1 ? prev.filter((p) => p.id !== id) : prev));
  }

  function addRound() {
    setPlayers((prev) => prev.map((p) => ({ ...p, scores: [...p.scores, ""] })));
  }

  function removeRound(roundIndex) {
    setPlayers((prev) =>
      prev.map((p) => ({
        ...p,
        scores: p.scores.filter((_, i) => i !== roundIndex),
      })),
    );
  }

  function setScore(playerId, roundIndex, value) {
    // Allow only digits; keep "" so the cell can be cleared.
    const clean = value.replace(/[^\d]/g, "");
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === playerId
          ? { ...p, scores: p.scores.map((s, i) => (i === roundIndex ? clean : s)) }
          : p,
      ),
    );
  }

  function resetGame() {
    setPlayers((prev) => prev.map((p) => ({ ...p, scores: [] })));
  }

  return (
    <main className="pf-page">
      <header className="pf-topbar">
        <div className="pf-brand">
          <a className="pf-back" href="/">&larr; Legacy Coder</a>
          <h1 className="pf-title">Pfeffer</h1>
          <p className="pf-subtitle">An interactive Farkle score sheet</p>
        </div>
        <button
          id="theme-toggle"
          className="theme-toggle"
          type="button"
          aria-pressed={theme === "dark" ? "true" : "false"}
          aria-label={themeLabel}
          onClick={toggleTheme}
        >
          <span
            id="theme-icon"
            className="theme-toggle__icon"
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: themeIcon }}
          />
        </button>
      </header>

      <div className="pf-layout">
        {/* ── Left column: the score sheet ───────────────────────────── */}
        <section className="pf-sheet" aria-labelledby="sheet-title">
          <div className="pf-sheet__head">
            <h2 id="sheet-title" className="pf-section-title">Score sheet</h2>
            <button type="button" className="pf-btn pf-btn--ghost" onClick={resetGame}>
              Reset scores
            </button>
          </div>

          {winnerReached && (
            <div className="pf-winner" role="status">
              🎉 {players[totals.indexOf(leaderTotal)]?.name || "Someone"} has reached{" "}
              {WINNING_SCORE.toLocaleString()}!
            </div>
          )}

          <div className="pf-table-wrap">
            <table className="pf-table">
              <thead>
                <tr>
                  <th scope="col" className="pf-th-round">#</th>
                  {players.map((p) => (
                    <th scope="col" key={p.id} className="pf-th-player">
                      <div className="pf-playerhead">
                        <input
                          className="pf-name"
                          value={p.name}
                          aria-label="Player name"
                          onChange={(e) => renamePlayer(p.id, e.target.value)}
                        />
                        {players.length > 1 && (
                          <button
                            type="button"
                            className="pf-remove"
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
                {rounds === 0 && (
                  <tr>
                    <td className="pf-empty" colSpan={players.length + 1}>
                      No rounds yet — add one to start scoring.
                    </td>
                  </tr>
                )}
                {Array.from({ length: rounds }).map((_, r) => (
                  <tr key={r}>
                    <th scope="row" className="pf-td-round">
                      <span>{r + 1}</span>
                      <button
                        type="button"
                        className="pf-remove pf-remove--row"
                        aria-label={`Remove round ${r + 1}`}
                        title="Remove round"
                        onClick={() => removeRound(r)}
                      >
                        ×
                      </button>
                    </th>
                    {players.map((p) => (
                      <td key={p.id}>
                        <input
                          className="pf-score"
                          inputMode="numeric"
                          value={p.scores[r] ?? ""}
                          placeholder="0"
                          onChange={(e) => setScore(p.id, r, e.target.value)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="pf-totals">
                  <th scope="row" className="pf-td-round">Σ</th>
                  {players.map((p, i) => (
                    <td
                      key={p.id}
                      className={
                        "pf-total" +
                        (totals[i] === leaderTotal && leaderTotal > 0 ? " pf-total--lead" : "")
                      }
                    >
                      {totals[i].toLocaleString()}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="pf-controls">
            <button type="button" className="pf-btn" onClick={addRound}>
              + Add round
            </button>
            <button type="button" className="pf-btn pf-btn--ghost" onClick={addPlayer}>
              + Add player
            </button>
          </div>

          <p className="pf-hint">
            First to {WINNING_SCORE.toLocaleString()} wins. You must bank at least{" "}
            {OPENING_SCORE} in a single turn to get on the board.
          </p>
        </section>

        {/* ── Right column: the rules ────────────────────────────────── */}
        <aside className="pf-rules" aria-labelledby="rules-title">
          <h2 id="rules-title" className="pf-section-title">How to play Farkle</h2>

          <p className="pf-rules__intro">
            Farkle is a dice game for two or more players using six dice. On your
            turn you roll all six, set aside at least one scoring die, and choose
            whether to bank your points or roll the remaining dice to push your luck.
          </p>

          <h3 className="pf-rules__h3">Turn sequence</h3>
          <ol className="pf-rules__list">
            <li>Roll all six dice.</li>
            <li>Set aside at least one scoring die (a single 1 or 5, or a combo below).</li>
            <li>
              Either <strong>bank</strong> the points rolled so far, or{" "}
              <strong>roll again</strong> with the dice that remain.
            </li>
            <li>
              If a roll produces <strong>no scoring dice</strong>, you{" "}
              <strong>Farkle</strong> — your turn ends and you score nothing that turn.
            </li>
            <li>
              <strong>Hot dice:</strong> if all six dice score, set them all aside and
              roll all six again, adding to the same turn total.
            </li>
          </ol>

          <h3 className="pf-rules__h3">Scoring</h3>
          <table className="pf-scoring">
            <tbody>
              {SCORING.map((s) => (
                <tr key={s.label} title={s.label}>
                  <td className="pf-scoring__dice" aria-label={s.label}>
                    <DiceRow faces={s.faces} groups={s.groups} />
                  </td>
                  <td>{s.points}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="pf-rules__h3">Winning</h3>
          <ul className="pf-rules__list">
            <li>
              <strong>Get on the board:</strong> your first banked turn must total at
              least {OPENING_SCORE} points.
            </li>
            <li>
              <strong>Reach {WINNING_SCORE.toLocaleString()}:</strong> the first player
              to hit the target triggers the final round.
            </li>
            <li>
              <strong>Final round:</strong> every other player gets one last turn to
              beat the leader. Highest total then wins.
            </li>
          </ul>

          <p className="pf-rules__note">
            House rules vary — four-of-a-kind values, three pairs, and the opening
            threshold are common things to agree on before you start.
          </p>
        </aside>
      </div>
    </main>
  );
}
