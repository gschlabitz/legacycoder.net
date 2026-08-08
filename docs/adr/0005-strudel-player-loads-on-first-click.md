# Lazy-load Strudel on first play

Import the pinned `@strudel/web` package only after the reader presses Play.
This keeps non-playing pages light and provides the browser-required audio
gesture without relying on a CDN or iframe.
