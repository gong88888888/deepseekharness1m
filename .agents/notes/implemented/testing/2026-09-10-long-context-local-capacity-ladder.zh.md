# Agent Note: 本地长上下文容量测量

Status: implemented

[English](2026-09-10-long-context-local-capacity-ladder.md) | 中文

## Problem

配置百万 token 窗口不能证明本地请求准备成本。消息数量和文本体积影响不同操作，而提供方延迟会掩盖本地回归。

## Decision

[容量基准](../../../../scripts/benchmark-long-context.ts) 接受启发式 token 目标、节点数和文本种类。每个进程创建各不相同的合成消息文本，预热五次，记录三十次 token 定价、缓存消息派生和 DeepSeek 请求序列化测量。输出包含原始样本、准备时间中位数与 p95、进程峰值 RSS、事件循环 p95、请求字节及运行环境信息。

通过 `pnpm exec tsx scripts/benchmark-long-context.ts 1000000 2000 code` 运行单个场景。各场景在独立进程中运行；比较结果要求使用相同运行时、硬件和工作负载。`cjk` 和 `json` 选择其他文本密度。无效或过大的样本参数在分配会话前失败。

## Alternatives considered

**仅使用提供方计时。** 网络和推理时间不能隔离消息准备与内存占用。

**把字符当作精确 token。** 计量器采用启发式定价。这些样本确立本地工作负载大小，不证明分词准确性或提供方接收能力。

## Consequences

该基准无需凭据或应用状态即可测量本地操作。它不包含真实模型请求、完整 profile 启动、持久化、工具执行或压缩历史质量。事件循环样本包含迭代间定时器及预热。峰值 RSS 覆盖整个进程及启动过程；样本中的 heap 和 RSS 是准备完成后的观测值，而非连续采集的堆峰值。运行门槛由部署确定，不作为 CI 计时断言。
