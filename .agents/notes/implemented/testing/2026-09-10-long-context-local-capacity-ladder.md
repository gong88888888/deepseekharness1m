# Agent Note: Local long-context capacity measurements

Status: implemented

English | [中文](2026-09-10-long-context-local-capacity-ladder.zh.md)

## Problem

A configured million-token window does not establish local request preparation cost. Message count and text volume affect different operations, and provider latency obscures local regressions.

## Decision

The [capacity benchmark](../../../../scripts/benchmark-long-context.ts) accepts a heuristic token target, node count, and text kind. Each process creates distinct synthetic message text, warms five iterations, and records thirty measurements of token pricing, cached message projection, and DeepSeek request serialization. Output includes raw samples, preparation median and p95, process peak RSS, event-loop p95, request bytes, and runtime identity.

Run one case with `pnpm exec tsx scripts/benchmark-long-context.ts 1000000 2000 code`. Cases run in separate processes; comparing results requires the same runtime, hardware, and workload. `cjk` and `json` select alternative text densities. Invalid or excessive fixture arguments fail before session allocation.

## Alternatives considered

**Use only provider timings.** Network and inference time do not isolate message preparation or memory use.

**Treat characters as exact tokens.** The meter uses heuristic pricing. These fixtures establish local workload size, not tokenizer accuracy or provider acceptance.

## Consequences

The benchmark measures local operations without credentials or application state. It excludes actual model requests, full profile boot, persistence, tool execution, and compressed-history quality. Event-loop samples include the between-iteration timer and warmup. Peak RSS is process-wide, including startup; sample heap and RSS are observations after preparation, not continuous heap peaks. Operational thresholds remain deployment-specific rather than CI timing assertions.
