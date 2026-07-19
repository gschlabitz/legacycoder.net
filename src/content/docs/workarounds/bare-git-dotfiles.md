---
title: Bare-Git Dotfiles Across macOS and Linux
description: One dotfiles repo shared across macOS and CachyOS using the bare-git approach — no symlinks, no extra tooling, secrets kept out of the repo.
---

One dotfiles repo shared across macOS and CachyOS using the **bare-git**
approach — no symlinks, no extra tooling, files live in their real locations.
OS differences are handled by conditional logic inside the shared files.
Secrets never enter the repo (Level 1 below); 1Password integration is
deferred.

These steps are meant to be **executed manually** (security + learning).

## 1. Initialize the bare repo (start on macOS)

```sh
git init --bare $HOME/.dotfiles
echo 'alias dotfiles="git --git-dir=$HOME/.dotfiles --work-tree=$HOME"' >> ~/.zshrc
source ~/.zshrc
dotfiles config --local status.showUntrackedFiles no
```

`showUntrackedFiles no` hides the rest of `$HOME` from status — only files you
explicitly `dotfiles add` are tracked.

## 2. Add the first files

```sh
dotfiles add ~/.zshrc ~/.gitconfig ~/.config/ghostty/config
dotfiles commit --message "Initial commit: zsh, git, ghostty"
```

## 3. Add OS-conditional logic to `~/.zshrc`

```zsh
case "$OSTYPE" in
  darwin*)  eval "$(/opt/homebrew/bin/brew shellenv)" ;;
  linux*)   alias ls='ls --color=auto' ;;
esac
```

Grow this block as real differences appear — don't speculatively add cases.

## 4. Secrets, Level 1: uncommitted local includes

In `~/.zshrc` (committed):

```zsh
[[ -f ~/.zshrc.local ]] && source ~/.zshrc.local
```

In `~/.gitconfig` (committed):

```gitconfig
[include]
    path = ~/.gitconfig.local
```

API tokens, work email, signing keys, machine-specific paths go into the
`.local` files. Never `dotfiles add` them. They are not backed up — you
recreate them per machine.

## 5. Push to GitHub

```sh
gh repo create dotfiles --private
dotfiles remote add origin git@github.com:gschlabitz/dotfiles.git
dotfiles branch --move --force main
dotfiles push --set-upstream origin main
```

## 6. Bootstrap on the second machine (CachyOS)

```sh
git clone --bare git@github.com:gschlabitz/dotfiles.git $HOME/.dotfiles
# add the same alias to ~/.zshrc there, then:
dotfiles config --local status.showUntrackedFiles no
# checkout fails if stock configs already exist — back them up, then retry:
dotfiles checkout 2>&1 | grep --extended-regexp '^\s+' | xargs -I{} mv {} {}.bak
dotfiles checkout
```

Then recreate `~/.zshrc.local` and `~/.gitconfig.local` manually on that
machine.

## Later (explicitly out of scope for now)

- **Secrets, Level 2:** 1Password CLI in `.zshrc.local`, e.g.
  `export OPENAI_API_KEY="$(op read 'op://Private/OpenAI/credential')"`
- **Package bootstrap:** `Brewfile` (macOS) + pacman/AUR pkglist (CachyOS) +
  an `install.sh` that detects OS
- **Windows:** ignore, or a manually-copied `windows/` folder (usage is rare)
- **Ghostty:** config is already designed (TokyoNight light/dark following
  system appearance, frosted glass, Hack Nerd Font Mono);
  `background-blur-radius` is silently ignored on Linux, so one shared config
  works. Hack Nerd Font must be installed per machine
  (`brew install --cask font-hack-nerd-font` / AUR equivalent).

## Notes

- Always use the `dotfiles` alias — plain `git` in `$HOME` won't find the
  repo (it's not named `.git`), which is a built-in safety net.
- A private GitHub repo is not a secrets store: treat anything committed as
  eventually-public.
