# DeepSeek Harness Token 优化 + 1M 上下文便携源码包

该压缩包是完整源码构建包，包含打包时工作树中的 token 效率优化、工具发现、Web 结果缓存、任务输出去重、性能统计、子代理结构化输出、工作流限流，以及 1M 上下文压缩预算修复。

包内包含一个最小本地 Git 快照，使项目原有的 `pnpm run build` 可以直接读取提交标识；它不包含上游完整提交历史或远端写入凭据。原始基线和工作树状态记录在 `SOURCE-PROVENANCE.json` 与 `LOCAL-CHANGES.txt`。

## 环境要求

- 64 位 Windows、Linux 或 macOS。
- Node.js `^22.19.0 || >=24.0.0`，推荐 Node.js 24 LTS。
- pnpm 11.7.0。
- Git、Python 和 C/C++ 构建工具可能被部分可选或原生依赖使用。
- 首次安装需要访问 npm registry。

## 安装

Windows PowerShell：

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\install.ps1
pnpm dsh web
```

Linux/macOS：

```sh
bash ./install.sh
pnpm dsh web
```

等价的官方源码流程：

```sh
pnpm install --frozen-lockfile
pnpm run build
pnpm dsh web
```

如系统没有 pnpm，可先运行 `corepack enable` 和 `corepack prepare pnpm@11.7.0 --activate`，或执行 `npm install --global pnpm@11.7.0`。

## API 配置

本包不包含任何凭据、`.env`、会话或附件。需要真实模型时，在解压目录创建自己的 `.env`，至少设置 `DEEPSEEK_API_KEY`；也可以按项目官方文档使用其他凭据提供方式。

## 完整性校验

解压后运行：

```sh
python verify-files.py
```

1M 表示模型路由声明的总上下文容量。有效输入预算按 `contextWindow - maxOutputTokens - safetyMarginTokens` 计算，并不表示可以输入 1M token 后再额外生成输出。打包前已完成本地构建、compaction 测试与 1M 合成容量测试；真实服务 1M 请求和 POSIX 快照仍取决于目标机器、模型账户和平台环境。
