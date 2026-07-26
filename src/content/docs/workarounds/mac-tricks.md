---
title: 🍎 macOS Tricks
description: Short explainers for macOS tools that don't warrant a page each — starting with duti, which sets default apps from the command line.
---

A running collection of macOS hints: small tools and incantations that each
solve one annoyance well, and are each too short to deserve their own page.
Entries stand alone — read the one you need and ignore the rest.

## duti — set default apps from the CLI

[duti](https://github.com/moretension/duti) manages file-type → app
associations. It does what Finder's **Open With → Change All…** does, except
scriptable, and therefore repeatable across machines.

Associations are **per-user**. Run it as the account whose defaults are
changing, not under `sudo`.

```sh
brew install duti
# for another account: su - guidos -c 'brew install duti'
```

### Find the identifiers

Setting an association takes two things: the app's bundle ID, and the file's
[Uniform Type Identifier](https://developer.apple.com/documentation/uniformtypeidentifiers).

```sh
osascript -e 'id of app "Zed"'               # app bundle ID
mdls -name kMDItemContentType -r file.json   # a file's UTI
duti -x json                                 # who currently handles .json
```

### Set the default

```sh
duti -s dev.zed.Zed public.json all          # by UTI
duti -s dev.zed.Zed jsonl all                # by extension, for odd or dynamic types
duti -s abnerworks.Typora net.daringfireball.markdown all
```

The trailing argument is the role — `all`, `viewer`, or `editor`. Use `all`
unless there's a specific reason not to.

### Common UTIs

| UTI | Extension |
| --- | --------- |
| `public.json` | `.json` |
| `public.plain-text` | `.txt` |
| `net.daringfireball.markdown` | `.md` |
| `public.yaml` | `.yaml`, `.yml` |
| `public.shell-script` | `.sh` |
| `public.data` | fallback for unknown types |

### Keep it in dotfiles

The calls are idempotent, so a batch is safe to rerun and belongs with your
[dotfiles](/workarounds/bare-git-dotfiles/) — a new machine then gets the same
associations without a Finder session.

```sh
duti -s dev.zed.Zed public.plain-text all
duti -s dev.zed.Zed public.yaml all
duti -s dev.zed.Zed public.shell-script all
```

Changes hit the LaunchServices database for the current user only, and take
effect immediately — no restart, no logout. The Finder equivalent, one file
type at a time, is ⌘I → **Open with** → **Change All…**.
