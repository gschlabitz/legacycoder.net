# Scroll-position checks instead of IntersectionObserver for pin reveal

Pins on the timeline map reveal when their timeline event is "reached or
passed" by the reader. IntersectionObserver is the obvious tool, but it only
fires when an element crosses the observed box — a jump to the bottom of the
page (End key, dragging the scrollbar, a footer link) skips elements past the
box without ever firing, silently leaving their pins unrevealed. So
TimelineMap uses a throttled scroll listener doing rect checks against the
viewport, which gives true reached-or-passed semantics. Don't "modernize" this
back to IntersectionObserver without solving the jump-past problem.
