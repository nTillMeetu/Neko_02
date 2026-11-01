# Contributing

Thanks for taking a look! This is a small plugin and the contribution flow is
deliberately simple.

## Repository layout

```
lib/index.js        Host half: the /usage-overview/summary route
lib/client.js       Client half: the panel UI and its styles
cordis.patch.yml    Bundle patch that inserts the plugin into a DSH profile
install.mjs         Installer / uninstaller for a DSH desktop profile
docs/               Design notes and screenshots
```

There is **no build step**: both plugin halves are plain ESM modules loaded by
DeepSeek Harness. React and the DSH UI primitives are provided by the host; do
not add runtime dependencies.

## Development loop

1. Clone the repository and run `node install.mjs` (or `--profile <dir>` for a
   non-default DSH profile).
2. Restart DeepSeek Harness and open **设置 → 账号与余额 → 查询用量**.
3. Edit `lib/client.js` (UI) or `lib/index.js` (Host route), then restart DSH
   again to pick up the change.
4. Before opening a PR run:

   ```bash
   node --check lib/index.js
   node --check lib/client.js
   node --check install.mjs
   node install.mjs --dry-run
   ```

## Guidelines

- Keep the panel inside the host dialog: no page shell, no new fonts, no new
  colours outside the host tokens in `STYLE_TEXT`.
- The Host route returns numbers only; never forward account tokens to the
  client and never call the Platform API from the client.
- Screenshots in issues and PRs must be redacted (balance, account name, phone
  number, API key ids). `docs/` screenshots use synthetic data only.
- Mention the DSH version you tested with (the plugin relies on internal DSH
  extension points that can change between releases).
- One focused change per pull request; describe what you changed and how you
  verified it in DSH.

## Compatibility

The plugin is tested with DeepSeek Harness desktop `0.2.1-rc.5` on Windows.
Other versions and platforms are welcome, but please state what you tested.
