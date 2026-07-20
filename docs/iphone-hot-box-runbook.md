# iPhone runbook: work on a hot box from the phone

Goal: `./morph hot` before heading out, then from the phone an SSH app
wakes the paused box and drops you into the opencode TUI. One-time setup
gives the phone a permanent key, so per-outing setup is just updating a
username.

## One-time setup

### 1. Create the phone's key

**Termius (preferred — SSH ID):** Settings → **SSH ID** → follow the
guided setup and pick a handle. This creates a device-bound passkey:
the private key is generated on the phone, can't be exported, and each
use is gated by Face ID — no passphrase needed. Your public keys are
published at `https://sshid.io/<handle>` (public keys are not secrets;
that's the point of the page).

**Termius (manual alternative):** Keychain → **+** → **Generate Key** →
type **ED25519**, name it `morph-phone` → Generate → copy the public
key.

**Blink:** Settings → Keys → **+** → Generate New Key → ED25519, name
`morph-phone` → Copy Public Key.

### 2. Put the public key in `~/.zshenv` (one command on the Mac)

**With SSH ID:** fetch the key from your public key page and append the
export line in one go:

```sh
key="$(curl --fail --silent https://sshid.io/<handle>)" &&
  echo "export MORPH_PHONE_PUBKEY=\"$key\"" >> ~/.zshenv &&
  source ~/.zshenv
```

The `&&` chain means a failed fetch appends nothing. sshid.io returns
one line per device you enabled SSH ID on; all of them end up in the
variable, so every SSH ID device can open your hot boxes. The key is
baked into the file rather than curled at shell start on purpose —
`~/.zshenv` runs on every shell, and a network call there would slow
all of them down. (Enabled SSH ID on a new device later? Re-run the
command and delete the old export line from `~/.zshenv`.)

**Manual key (Blink or Termius keychain):** get the public key over any
channel — AirDrop, iMessage to yourself, Universal Clipboard — and add
the export line by hand:

```sh
export MORPH_PHONE_PUBKEY="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA... morph-phone"
```

### 3. Create the host entry in the SSH app

**Termius:** Hosts → **+** → New Host:

- Label: `morph hot`
- Hostname: `ssh.cloud.morph.so`, port `22`
- Username: *(leave blank for now — it's per-box, see below)*
- Auth: tap **"+ SSH ID, Key, Certificate, FIDO2"** and choose **SSH
  ID** (there's no key to pick — it automatically uses this device's
  passkey, gated by Face ID). If you generated a key manually instead,
  select `morph-phone` here. Don't leave both attached.

**Blink:** Settings → Hosts → **+**, same values.

## Per outing

### 4. Build the hot box (laptop, before heading out)

```sh
./morph hot
```

It prints the instance id (e.g. `morphvm_2vrcn62h`) and confirms the
phone key is on the box. The box is left **paused** — costing storage,
not compute.

### 5. Update the username on the phone

Edit the `morph hot` host entry and set **Username** to the printed
instance id. That's the only per-outing step on the phone.

### 6. Connect

Open the host. The connection itself wakes the box (allow ~5–10 s for
the first prompt). Then:

```sh
tmux attach -t agent
```

The opencode TUI is already open. The `dev` session runs the dev server;
the preview URL printed by `hot` also wakes the box and works in mobile
Safari.

Useful in Termius: the on-screen key bar has Ctrl — detach from tmux
with `Ctrl-b` then `d`. Detaching (or losing signal) is safe; the box
re-pauses on its own after the TTL (default 120 min after each wake).

## Back at the laptop

```sh
./morph reap --force <instance-id>   # the box (secrets on its disk)
./morph sweep                        # any stale snapshots
```

Reap always *skips* hot boxes (they never have a done signal), so the
targeted `--force` is the intended way to finish one.

## Troubleshooting

- **Permission denied (publickey):** the box was built without
  `MORPH_PHONE_PUBKEY` in the environment — rebuild with `./morph hot`,
  or fall back to importing the per-instance key it printed
  (`~/.ssh/morph/<instance-id>.pem`).
- **Connection times out:** paused boxes take a few seconds to wake;
  retry once. Check `./morph status` from a laptop if it persists.
- **TUI looks garbled:** resize the terminal once (rotate the phone or
  toggle the keyboard) — tmux redraws.
