# DeepSeek Harness token/1M portable source package

Artifact: `deepseek-harness-token-1m-0.1.3-alpha.1-20260914-r2.zip`

SHA-256: `6529d743aa2582d68b73eb5cfa451926d9a31607b7c8320ff7766762e32fe2a7`

Size: 44,732,159 bytes.

The package contains the complete tracked source tree plus all 135 current worktree changes (98 tracked modifications and 37 untracked source, test, snapshot, documentation, and benchmark files). It excludes the original Git history and remotes, `.env`, credentials, local sessions and attachments, `node_modules`, compiled output, coverage, and the external backup store. A minimal local Git snapshot is included because the repository build embeds a Git commit id.

## Reproduction performed from the ZIP

- Extracted the ZIP to a new directory with no pre-existing dependencies.
- Verified 9,134 packaged source files against `FILE-MANIFEST.json`.
- Confirmed the minimal Git snapshot is clean on the `portable` branch.
- Installed all 1,068 dependency packages with Node.js 24.17.0, pnpm 11.7.0, and `pnpm install --frozen-lockfile`.
- Completed `pnpm run build`; the build recorded 222 client artifacts with digest `191e57472cd0e6e8f223744a3b0bff64deda2bcc5b720de693b5caec21feedf7`.
- Ran `pnpm dsh --help`; the CLI loaded and printed its command catalog.
- Ran all `compaction-basic` tests: 4 files and 132 tests passed.
- Re-ran the synthetic 1,000,000-token, 2,000-node code benchmark: median 10.91 ms, p95 13.73 ms, peak RSS 179,748,864 bytes, event-loop p95 19.97 ms.

The benchmark uses the repository's heuristic token estimator. It does not prove provider-side acceptance or billing. A real 1M model call requires the target account, route, API key, and provider limits. POSIX recorded-session snapshots still require Linux or macOS.

## Installation

Install Node.js `^22.19.0 || >=24.0.0` and pnpm 11.7.0, extract the ZIP, and run:

```sh
pnpm install --frozen-lockfile
pnpm run build
pnpm dsh web
```

Windows users can run `./install.ps1`; Linux and macOS users can run `bash ./install.sh`.
