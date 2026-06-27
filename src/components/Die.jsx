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

export default function Die({ face }) {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      style={{ width: "2.5rem", height: "2.5rem", margin: 0, color: "oklch(68.5% 0.148 237.3)" }}
    >
      <rect
        x="6"
        y="6"
        width="88"
        height="88"
        rx="18"
        ry="18"
        style={{ fill: "none", stroke: "currentColor", strokeWidth: 5, opacity: 0.55 }}
      />
      {PIPS[face].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="9" style={{ fill: "currentColor" }} />
      ))}
    </svg>
  );
}
