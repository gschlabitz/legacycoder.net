import { useState } from "react";

// Click-to-play toggle for Strudel background music on content pages. Browsers
// only allow audio after a user gesture, so a play button is not a limitation
// but the design. The engine (@strudel/web — pattern core + WebAudio, no
// editor) is imported inside the click handler: pages embedding this island
// ship zero Strudel JS until a reader actually presses play.
//
// Module scope, shared by every player island on the page: the first click
// downloads the engine and registers the default samples; later clicks (any
// island) reuse the same init promise.
let enginePromise = null;
function loadEngine() {
  enginePromise ??= import("@strudel/web").then(({ initStrudel, samples }) =>
    initStrudel({ prebake: () => samples("github:tidalcycles/dirt-samples") }),
  );
  return enginePromise;
}

// Styling reuses Starlight's theme tokens so the button tracks the active
// light/dark palette (same trick as PfefferScoreSheet).
const btnStyle = {
  font: "inherit",
  fontWeight: 600,
  padding: "0.4em 0.9em",
  borderRadius: "0.35rem",
  border: "1px solid var(--sl-color-gray-5)",
  background: "transparent",
  color: "var(--sl-color-text)",
  lineHeight: 1.2,
  cursor: "pointer",
};

export default function StrudelPlayer({ code, label = "Background music" }) {
  const [state, setState] = useState("idle"); // idle | loading | playing

  async function toggle() {
    if (state === "loading") return;
    const { evaluate, hush } = await import("@strudel/web");
    if (state === "playing") {
      hush();
      setState("idle");
      return;
    }
    setState("loading");
    try {
      await loadEngine();
      await evaluate(code);
      setState("playing");
    } catch (err) {
      console.error("Strudel player failed:", err);
      setState("idle");
    }
  }

  const text = state === "playing" ? "⏹ Stop" : state === "loading" ? "⏳ Loading…" : "▶ Play";
  return (
    <button type="button" style={btnStyle} onClick={toggle} aria-pressed={state === "playing"} disabled={state === "loading"}>
      {text} — {label}
    </button>
  );
}
