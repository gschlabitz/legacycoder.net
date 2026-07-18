---
title: duti — set macOS default apps from the CLI
draft: true
---

Manages file-type → app associations (what "Open With → Change All" does in Finder,
but scriptable). Per-user; run as the account whose defaults you're changing.

## Install
brew install duti          # via: su - guidos -c 'brew install duti'

## Find identifiers
osascript -e 'id of app "Zed"'                    # app bundle ID
mdls -name kMDItemContentType -r file.json        # file's UTI
duti -x json                                      # current handler for extension

## Set defaults
duti -s dev.zed.Zed public.json all               # by UTI
duti -s dev.zed.Zed jsonl all                     # by extension (odd/dynamic types)
duti -s abnerworks.Typora net.daringfireball.markdown all

# roles: all | viewer | editor  (use "all" unless you know why not)

## Common UTIs
public.json            .json
public.plain-text      .txt
net.daringfireball.markdown  .md
public.yaml            .yaml/.yml
public.shell-script    .sh
public.data            fallback for unknown types

## Batch (idempotent — safe to rerun; keep in dotfiles)
duti -s dev.zed.Zed public.plain-text all
duti -s dev.zed.Zed public.yaml all
duti -s dev.zed.Zed public.shell-script all

## Notes
- Changes LaunchServices DB for *current user only*
- Takes effect immediately; no restart needed
- Finder equivalent: ⌘I → Open with → Change All…
