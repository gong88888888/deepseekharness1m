# DeepSeek Harness 1M

This is a development fork of [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). The source code described here is on the [`codex/github-upload-candidate` branch](https://github.com/gong88888888/deepseekharness1m/tree/codex/github-upload-candidate).

The branch includes token-efficiency changes and configures a 1,000,000-token context window for its default DeepSeek model entries. The context window is a local model configuration; the actual context accepted by a request depends on the model service and its availability.

## Requirements

- Node.js 24.x is recommended. The repository also supports Node.js 22.19 or newer within the 22.x line. Node.js 20 is unsupported.
- Git 2.26 or newer.
- pnpm 11.28.5.
- A DeepSeek API key is needed to make model requests, but not to install or start the Web UI.

## Download, build, and run

Install Node.js and Git first. Then run these commands in PowerShell or a terminal:

```sh
npm install -g pnpm@11.28.5
git clone --depth 1 --single-branch --branch codex/github-upload-candidate https://github.com/gong88888888/deepseekharness1m.git
cd deepseekharness1m
pnpm install --frozen-lockfile
pnpm run build
pnpm dsh web
```

Open the local URL printed by `pnpm dsh web`. In the Web UI, open **Settings → Models**, enter your DeepSeek API key, and select a workspace.

Use `pnpm dsh web --no-open` if you do not want the browser to open automatically. Run `pnpm dsh --help` to see the other available profiles and commands.

Clone the repository with Git rather than using GitHub's **Download ZIP** button. The build reads the source commit from Git metadata, which a ZIP download does not contain.

## Update an existing installation

From the `deepseekharness1m` directory:

```sh
git pull --ff-only
pnpm install --frozen-lockfile
pnpm run build
pnpm dsh web
```

If `node --version` reports Node.js 20, switch to a supported Node.js version before running pnpm. Check that `pnpm --version` reports `11.28.5`.

## About the npm package

This fork has not been published as an npm package. `npx @deepseek-ai/dsh web` runs the upstream npm release; it does not install the changes from this branch. Use the Git clone and source commands above to run this fork.

## Documentation and safety

Read the [Web UI guide](docs/user/guide/index.md), [development guide](docs/development.md), and [safety notice](SAFETY.md). Keep API keys out of the repository and Git commits. The Web UI stores a saved key in the local Harness home rather than in this checkout.

## License

[MIT](LICENSE). Third-party notices are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
