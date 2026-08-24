# Workarounds

(The underscore prefix keeps this file out of the published site.)

A **workaround** is one of this site's published how-to guides — tricks of
the trade for everyday life, spanning whatever the author has figured out:
shell setup, gardening, tabletop RPGs. Code-level hacks are ordinary work,
not workarounds; a patch around a broken dependency belongs in the code,
not in this collection.

## Add one

1. Write `<slug>.md` in this directory — kebab-case, naming the trick
   rather than the topic. Frontmatter carries exactly two keys:

   ```yaml
   ---
   title: Bare-Git Dotfiles Across macOS and Linux
   description: One line, ending in a period — it feeds search results and the collection index.
   ---
   ```

   A workaround is a docs page, not a blog post: `location` coordinates
   and the timeline rules belong to `docs/blog`. The sidebar autogenerates
   from the directory, so the config needs no edit.

2. English only. The collection has no German counterparts; the
   fact-mirroring rule covers blog posts only.

3. Verify in the dev server (`astro dev --background`, then check
   `/workarounds/<slug>/`). Done when the page renders, its headings
   populate "On this page", and the sidebar lists it under Workarounds.

## Style

[`bare-git-dotfiles.md`](./bare-git-dotfiles.md) is the reference.

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
  papers — a tool gets its link where it's first named. Save a bullet list
  of sources for pages where the reader wants a reading list.
- Match the register the subject deserves. A shell-setup page can be dry; a
  guide for a hobby audience can be funny, as long as every joke sits on
  top of something true and the page stays skimmable.
