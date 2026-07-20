# iPhone runbook: work on a hot box from the phone

Goal: `./morph hot` before heading out, then from the phone an SSH app
wakes the paused box and drops you into the opencode TUI. One-time setup
gives the phone a permanent key, so per-outing setup is just updating a
username.

## One-time setup

### 1. Create the phone's key (Termius SSH ID)

In Termius: Settings → **SSH ID** → follow the guided setup and pick a
handle. This creates a device-bound passkey: the private key is
generated on the phone, can't be exported, and each use is gated by
Face ID — no passphrase needed. Your public keys are published at
`https://sshid.io/<handle>` (public keys are not secrets; that's the
point of the page).

### 2. Register the phone key as your Morph account key (one command on the Mac)

Morph's `ssh.cloud.morph.so` terminates SSH itself and never consults a
VM's `authorized_keys` — keys on the box do nothing. What it does honor
is the **account-level user SSH key**, so the phone key is registered
once with the account and every instance (hot, task, cmux) accepts it
from then on:

```sh
curl --request PUT "https://cloud.morph.so/api/user/ssh-key" \
  --header "Authorization: Bearer $MORPH_API_KEY" \
  --header "Content-Type: application/json" \
  --data "{\"public_key\": \"$(curl --fail --silent https://sshid.io/<handle>)\"}"
```

Notes:

- This **replaces** the account's current user key (the per-instance
  keys the morph scripts use are unaffected).
- The account holds a single key, so if you've enabled SSH ID on
  several devices (sshid.io returns one line each), pick the phone's
  line instead of the raw `curl`.

### 3. Create the host entry in Termius

Hosts → **+** → New Host:

- Label: `morph hot`
- Hostname: `ssh.cloud.morph.so`, port `22`
- Auth: tap **"+ SSH ID, Key, Certificate, FIDO2"** and choose **SSH
  ID** (there's no key to pick — it automatically uses this device's
  passkey, gated by Face ID). The **Username** field is on this SSH ID
  screen; it defaults to your handle (`@<handle>`), but for Morph it
  must be the instance id — you'll set it per outing (step 5).

## Per outing

### 4. Build the hot box (laptop, before heading out)

```sh
./morph hot
```

It prints the instance id (e.g. `morphvm_2vrcn62h`) and confirms the
phone key is on the box. The box is left **paused** — costing storage,
not compute.

### 5. Update the username on the phone

Edit the `morph hot` host entry (Hosts → tap the host → edit), open
its **SSH ID** credential, and set **Username** to the printed
instance id (`morphvm_…`), replacing the `@<handle>` default. That's
the only per-outing step on the phone.

(Why a username when the key authenticates? Morph runs one shared SSH
endpoint for every VM, and the username is how it routes the connection
to *your* box — it's the instance id, which changes with each hot
build. The SSH ID key then authenticates you to that box. Termius's
default of `@<handle>` assumes servers where your account name matches
the handle, which Morph's proxy is not.)

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

- **Prompted for a password / permission denied:** the account key
  doesn't match the phone — re-run the step-2 `curl` (did sshid.io
  return several lines? only one key fits) — or fall back to importing
  the per-instance key `./morph hot` printed
  (`~/.ssh/morph/<instance-id>.pem`).
- **Connection times out:** paused boxes take a few seconds to wake;
  retry once. Check `./morph status` from a laptop if it persists.
- **TUI looks garbled:** resize the terminal once (rotate the phone or
  toggle the keyboard) — tmux redraws.
