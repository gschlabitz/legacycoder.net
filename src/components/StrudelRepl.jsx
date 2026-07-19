import { useEffect, useRef, useState } from "react";

// The full Strudel live-coding REPL (CodeMirror editor + scheduler + WebAudio)
// behind the lab page. `@strudel/repl` registers the <strudel-editor> web
// component as an import side effect and injects its own styles. The package
// is heavy (editor, tonal, soundfonts), so it is dynamically imported inside
// useEffect — Vite splits it into a chunk that only ever downloads on the lab
// page. Render with client:only="react" so SSR never touches this
// browser-only package.
export default function StrudelRepl({ code }) {
  const containerRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let editorEl;
    let cancelled = false;
    import("@strudel/repl")
      .then(() => {
        if (cancelled || !containerRef.current) return;
        // Create the element only after registration — deterministic upgrade,
        // no reliance on the browser upgrading a pre-existing unknown tag.
        // `code` is the *initial* code; after that the user owns the editor.
        editorEl = document.createElement("strudel-editor");
        editorEl.setAttribute("code", code);
        containerRef.current.replaceChildren(editorEl);
      })
      .catch((err) => {
        console.error("Failed to load the Strudel REPL:", err);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      // Stop the scheduler so sound never outlives the island (dev HMR).
      editorEl?.editor?.stop?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- code is initial state
  }, []);

  if (failed) return <p>The Strudel REPL could not be loaded.</p>;
  // min-height reserves space so the page doesn't jump while the chunk loads.
  return <div ref={containerRef} style={{ minHeight: "24rem" }} />;
}
