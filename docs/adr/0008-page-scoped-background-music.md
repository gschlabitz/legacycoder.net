# Background music is page-scoped, because the site stays a plain MPA

The site runs no `<ClientRouter />`, so every link click discards the
document and its `AudioContext`: music cuts at navigation and cannot follow a
reader between pages. Continuity was rejected on price, not merit — Starlight
ships no ClientRouter support, and adopting it would put search, the mobile
menu, the React islands, the CRT backdrop and the timeline map's camera back
under test in order to buy a soundtrack. The consequence that shapes the
whole plugin is that audio permission dies with the document, so a reader who
picked a tune arrives at each new page *armed* — control lit, nothing
sounding — and one click resumes it from that tune's bookmark. Autoplaying on
arrival is not an escape: without a gesture it works only under Chrome's
Media Engagement heuristics, so it would work for the author and fail for
readers.
