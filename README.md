# DeepSeek Harness (项目说明)

English summary below | 中文说明

DeepSeek Harness（简称 dsh）是一个面向可扩展、多插件化的 agent harness 框架，基于 "everything-is-a-plugin" 的设计理念，由 DeepSeek AI 开发与维护（本仓库为个人镜像/分支）。本分支：codex/github-upload-candidate 仅更新了 README 与若干文档以便上传/展示。

核心要点

- 架构：以插件为中心（Service Definition + provider 模型），方便扩展模型适配器、工具、沙箱、子代理等能力。
- 运行时：使用 Cordis 作为运行时设计灵感（参见 upstream 设计文档）。
- 状态：开发者预览（developer preview）；接口和行为可能发生不兼容的变动，请在生产环境使用前评估风险并查看安全说明。

快速开始

从 npm 运行（推荐本地快速体验）：

```bash
# 使用 npx 直接运行 Web UI
npx @deepseek-ai/dsh web
```

默认会在本地启动 Web UI（默认地址：http://127.0.0.1:3080）。

从源码运行（适用于开发与调试）：

```bash
git clone https://github.com/deepseek-ai/deepseek-harness.git
cd deepseek-harness
pnpm install
pnpm run build
pnpm dsh web
```

- `pnpm run build` 会构建仓库产物。
- `pnpm dsh web` 使用构建好的产物来启动服务（不会重复构建）。

仓库结构概览（与本分支相关）

- README.md — 本文件（项目总览与快速入门）。
- native/ — 本仓库托管并维护的 native 源码与平台包（例如 Landlock 启动器与 POSIX 绑定）。请参阅 native/README.md 获取更多平台细节。
- packages/ — npm 包工作区，按照功能族分组（core、llm、web、sandbox、session 等），各子目录包含对应 package 的 README 与使用约定。详细分组与职责请参阅 packages/README.md。
- docs/ — 架构、开发与使用的详细文档（如果存在）。

重要文档与资源

- 上游文档（官方）：https://deepseek-harness.github.io/deepseek-harness/ 
- 安全须知：请在运行前阅读 SAFETY.md（仓库中如存在）。
- 贡献指南：CONTRIBUTING.md
- 第三方许可证声明：THIRD_PARTY_NOTICES.md

开发者提示

- 本仓库采用 pnpm 工作区管理（packages/ 与 system/ 等子包共享同一 lockfile）。
- 本项目包含原生模块（Node Addon），CI 会针对支持的架构构建并测试本地原生包。发布流程会将各架构的产物打包为 npm tarball。
- 插件与扩展：为便于插件发现，请在插件仓库打上 `dsh-plugin` topic。

贡献与社区

- 问题与反馈：使用上游仓库的 Discussions / Issues（若本仓库为镜像，请在原仓库提 issue）。
- 社区：DeepSeek Harness 社区（例如 Discord 链接，见官方文档）。

引用（Citation）

```bibtex
@misc{deepseek-harness2026,
  title={DeepSeek Harness: Everything is a Plugin},
  author={DeepSeek-AI},
  year={2026},
  publisher={GitHub},
  howpublished={\url{https://github.com/deepseek-ai/deepseek-harness}},
}
```

许可证

本仓库使用 MIT 许可证（参见 LICENSE）。第三方依赖及其许可证请查看 THIRD_PARTY_NOTICES.md。

本次变更说明

- 重写并精简 README，以匹配仓库中 native/ 与 packages/ 的现有说明，保留上游入口与关键链接。

如果你希望我把 README 同步为英文优先版、或添加更多运行示例、CI/发布说明、或按包生成的子 README 汇总页，请告诉我，我会继续把更新提交到本分支。