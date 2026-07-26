---
name: workarounds
description: Workarounds are this site's published how-to guides in src/content/docs/workarounds — tricks of the trade for everyday life. Use when the user wants to add or revise a workaround, or asks where a practical guide belongs on the site.
---

# Workarounds

A **workaround** is one of this site's published guides — [`CONTEXT.md`](../../../CONTEXT.md)
holds the canonical definition. They live in `src/content/docs/workarounds` and
span whatever the author has figured out: shell setup, gardening, tabletop RPGs.
"Write a workaround for X" means: add a page there.

Code-level hacks are ordinary work. When the user wants a patch around a
broken dependency or a browser quirk, fix the code and leave this collection
alone.

## Add one

1. Write `src/content/docs/workarounds/<slug>.md` — kebab-case, naming the
   trick rather than the topic. Frontmatter carries exactly two keys:

   ```yaml
   ---
   title: Bare-Git Dotfiles Across macOS and Linux
   description: One line, ending in a period — it feeds search results and the collection index.
   ---
   ```

   A workaround is a docs page, not a blog post: `location` coordinates and
   the timeline rules of ADR-0004 belong to `docs/blog`. The sidebar
   autogenerates from the directory, so the config needs no edit.

2. Write English only. The collection has no German counterparts, and the
   fact-mirroring rule in `CLAUDE.md` covers blog posts. Say so when you
   finish, so the author can call for a translation.

3. Match the house voice — see the style rules below.

4. Verify in the dev server (`astro dev --background`, then check
   `/workarounds/<slug>/`). Done when the page renders, its headings populate
   "On this page", and the sidebar lists it under Workarounds.

## Style

The author's own guides are the reference — read
[`bare-git-dotfiles.md`](../../../src/content/docs/workarounds/bare-git-dotfiles.md)
before writing.

- Hard-wrap prose near 76 columns. Bold a term on first use, then reuse it.
- Open with two or three sentences of orientation: what this is, and the
  situation it gets you out of.
- Number `##` headings (`## 1. Initialize the bare repo`) when the reader
  must follow them in order; leave them unnumbered when they don't.
- Reach for a table when the page compares options across the same few
  dimensions — cost, maintenance, verdict.
- Write shell commands with long options (`--message`, not `-m`) and a
  comment where a flag isn't self-evident.
- Mark deferred territory in its own section, so the page states its own
  edges rather than implying completeness.
- Link inline, on the words a reader would click. These are web pages, not
  papers — a tool gets its link where it's first named. Save a bullet list of
  sources for pages where the reader wants a reading list.
- Match the register the subject deserves. A shell-setup page can be dry; a
  guide for a hobby audience can be funny, as long as every joke sits on top
  of something true and the page stays skimmable.
