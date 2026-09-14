# Agent Note: Reserve conversation output before pressure compaction

Status: implemented

English | [中文](2026-09-10-compaction-output-reserve.zh.md)

## Problem

An input-pressure threshold based only on the total context window can exceed the input capacity remaining after generation. The DeepSeek adapter declares a 1,000,000-token window and a default 256,000-token output cap; an 80% threshold leaves less room than that output cap.

## Decision

[Basic compaction](../../../../packages/compaction/compaction-basic/README.md) resolves its threshold as the smaller of the configured window fraction and `contextWindow - reservedOutputTokens - safetyMarginTokens`. The output reserve comes from the latest durable request header, where adapter defaults have already been resolved. An absent output cap reserves zero. A configurable non-negative integer safety margin defaults to zero and supports exact provider/model overrides.

Retention remains explicit: it must fit below the effective threshold, and no automatic clamping discards more history to hide a contradictory policy. Exhausted input capacity and incompatible retention raise the existing target-pressure configuration error. The automatic listener retains its warning-and-continue behavior; provider overflow recovery remains bounded.

## Alternatives considered

**Lower the global ratio.** A fixed lower ratio cannot track different output caps or model routes.

**Use the summary output cap.** That cap belongs to a separate request and does not reserve the conversation response.

**Reject every request exceeding a character heuristic.** That would conflate estimated and exact tokens and change request-error semantics. This change only corrects between-step pressure budgeting.

## Consequences

Long conversations can compact earlier when their output allocation requires it. Request admission, subsequent route changes, small-window summary providers, and heuristic underestimation are not fully prevented by a between-step policy. No Session format or event is added. Tests cover routed reserves, safety margins, invalid policies, and a large conversation below the ratio threshold that compacts after its logged output cap increases. The existing recorded overflow-recovery composition also loads the safety-margin setting.
