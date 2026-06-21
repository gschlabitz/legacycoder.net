import { useState, useMemo } from "react";
import { useTheme } from "./hooks/useTheme";

const WINNING_SCORE = 10000;
const ROUND_MINIMUM = 350;
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 8;

// Pip positions on a 100×100 die, by face value.
const PIPS = {
  1: [[50, 50]],
  2: [
    [30, 30],
    [70, 70],
  ],
  3: [
    [30, 30],
    [50, 50],
    [70, 70],
  ],
  4: [
    [30, 30],
    [70, 30],
    [30, 70],
    [70, 70],
  ],
  5: [
    [30, 30],
    [70, 30],
    [50, 50],
    [30, 70],
    [70, 70],
  ],
  6: [
    [30, 30],
    [70, 30],
    [30, 50],
    [70, 50],
    [30, 70],
    [70, 70],
  ],
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
  { label: "Any extra die doubles the score", points: "800", faces: [4, 4, 4, 4] },
  { label: "Two extra", points: "1600", faces: [4, 4, 4, 4, 4] },
  { label: "Three extra!", points: "3200", faces: [4, 4, 4, 4, 4, 4] },
  { label: "Straight (1–6)", points: "1,500", faces: [1, 2, 3, 4, 5, 6] },
  { label: "Three pairs", points: "1,500", faces: [2, 2, 4, 4, 6, 6], groups: [2, 2, 2] },
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

  const [players, setPlayers] = useState(() => [emptyPlayer("Player 1"), emptyPlayer("Player 2")]);

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

  function removeRound(roundIndex) {
    setPlayers((prev) =>
      prev.map((p) => ({
        ...p,
        scores: p.scores.filter((_, i) => i !== roundIndex),
      })),
    );
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
    <main className="pf-page">
      <header className="pf-topbar">
        <div className="pf-brand">
          <a className="pf-back" href="/">
            &larr; Legacy Coder
          </a>
          <h1 className="pf-title">Pfeffer</h1>
          <p className="pf-subtitle">A Farkle variant played by my family.</p>
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

      <div className={"pf-layout" + (players.length > 4 ? " pf-layout--stacked" : "")}>
        {/* ── Left column: the score sheet ───────────────────────────── */}
        <section className="pf-sheet" aria-labelledby="sheet-title">
          <div className="pf-sheet__head">
            <h2 id="sheet-title" className="pf-section-title">
              Score sheet
            </h2>
            <div className="pf-sheet__actions">
              <button
                type="button"
                className="pf-btn pf-btn--ghost"
                onClick={addPlayer}
                disabled={players.length >= MAX_PLAYERS}
                title={players.length >= MAX_PLAYERS ? `Maximum ${MAX_PLAYERS} players` : undefined}
              >
                + Player
              </button>
              <button type="button" className="pf-btn pf-btn--ghost" onClick={resetGame}>
                Reset
              </button>
            </div>
          </div>

          {winnerReached && (
            <div className="pf-winner" role="status">
              🎉 {players[totals.indexOf(leaderTotal)]?.name || "Someone"} has reached {WINNING_SCORE.toLocaleString()}!
            </div>
          )}

          <div className="pf-table-wrap">
            <table className="pf-table">
              <thead>
                <tr>
                  <th scope="col" className="pf-th-round">
                    #
                  </th>
                  {players.map((p) => (
                    <th scope="col" key={p.id} className="pf-th-player">
                      <div className="pf-playerhead">
                        <input
                          className="pf-name"
                          value={p.name}
                          aria-label="Player name"
                          onChange={(e) => renamePlayer(p.id, e.target.value)}
                        />
                        {players.length > MIN_PLAYERS && (
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
                {/* One extra row beyond the committed rounds is always present and
                    empty; typing into it commits the round and spawns a new one. */}
                {Array.from({ length: rounds + 1 }).map((_, r) => {
                  const isNew = r === rounds;
                  return (
                    <tr key={r} className={isNew ? "pf-row--new" : undefined}>
                      <th scope="row" className="pf-td-round">
                        <span>{r + 1}</span>
                        {!isNew && (
                          <button
                            type="button"
                            className="pf-remove pf-remove--row"
                            aria-label={`Remove round ${r + 1}`}
                            title="Remove round"
                            onClick={() => removeRound(r)}
                          >
                            ×
                          </button>
                        )}
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
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="pf-totals">
                  <th scope="row" className="pf-td-round">
                    Σ
                  </th>
                  {players.map((p, i) => (
                    <td
                      key={p.id}
                      className={"pf-total" + (totals[i] === leaderTotal && leaderTotal > 0 ? " pf-total--lead" : "")}
                    >
                      {totals[i].toLocaleString()}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>

          <p className="pf-hint">
            First to {WINNING_SCORE.toLocaleString()} wins. You must bank at least {ROUND_MINIMUM} every turn.
          </p>
        </section>

        {/* ── Right column: the rules ────────────────────────────────── */}
        <aside className="pf-rules" aria-labelledby="rules-title">
          <h2 id="rules-title" className="pf-section-title">
            How to play Pfeffer
          </h2>

          <p className="pf-rules__intro">
            Pfeffer is a dice game for two or more players using six dice. On your turn you roll all six, set aside at
            least one scoring die, and choose whether to bank your points or roll the remaining dice to push your luck.
            You must bank at least {ROUND_MINIMUM} each turn.
          </p>
          <p className="pf-rules__intro">
            <strong>Pfeffer:</strong> At the start of your turn, you can call "pfeffer!", if you wish to bet that you
            can score at least 50 points higher than your predecessor's round (e.g. 400 to a previous 350). If you bust,
            your bet is doubled and subtracted from your score (e.g. -800).
          </p>
          <p className="pf-rules__intro">
            <strong>Auto-Pfeffer:</strong> If your predecessor didn't score anything, pfeffer is automatic for your
            turn. If you also score nothing, subtract 1000 points from your score.
          </p>

          <h3 className="pf-rules__h3">Turn sequence</h3>
          <ol className="pf-rules__list">
            <li>Roll all six dice.</li>
            <li>Set aside at least one scoring die (a single 1 or 5, or a combo below).</li>
            <li>
              Either <strong>bank</strong> the points rolled so far, or <strong>roll again</strong> with the dice that
              remain.
            </li>
            <li>
              If a roll produces <strong>no scoring dice</strong>, you <strong>bust</strong> — your turn ends and you
              score nothing that turn.
            </li>
            <li>
              <strong>Prove it:</strong> if all six dice have scored, you must roll all six again, adding to the same
              turn total.
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
              <strong>Round Minimum:</strong> For every turn, you must at least score {ROUND_MINIMUM} points.
            </li>
            <li>
              <strong>Reach {WINNING_SCORE.toLocaleString()}:</strong> the first player to hit the target triggers the
              final round.
            </li>
            <li>
              <strong>Final round:</strong> every other player gets one last turn to beat the leader. Highest total then
              wins.
            </li>
          </ul>

          <p className="pf-rules__note">
            House rules vary — four-of-a-kind values, three pairs, and the opening threshold are common things to agree
            on before you start.
          </p>
        </aside>
      </div>
    </main>
  );
}
