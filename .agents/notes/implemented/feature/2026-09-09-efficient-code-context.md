# Agent Note: Bounded initial code reads and detached token measurements

Status: implemented

English | [中文](2026-09-09-efficient-code-context.zh.md)

## Problem

Large file observations remain in subsequent model requests until pruning or compaction. Using one setting for both the initial read window and the maximum accepted window prevents deployments from reducing incidental context while retaining deliberate large reads. Token measurement also copies positional nodes that its pricing operation already allocates independently.

## Decision

The [filesystem tools](../../../../packages/fs/tool-fs/README.md) expose `readDefaultLimit` separately from `readLimit`. An omitted setting inherits the maximum. Both values must be positive integers, and the default cannot exceed the maximum. The schema states the effective default; result pagination and explicit larger reads retain their existing behavior. Smaller defaults are a deployment choice, not a global reduction in file access.

The [token meter](../../../../packages/llm/token-meter/README.md) freezes freshly priced scalar nodes directly and copies retained provider usage separately. Each returned measurement remains detached and deeply immutable. Route pricing is recomputed on every measurement; this change introduces no pricing cache or session-format change.

## Alternatives considered

**Lower the maximum read size.** A lower maximum forces extra tool rounds even when the model knows that it needs a larger contiguous region. Independent defaults preserve that choice.

**Prune observations earlier.** Rewriting retained history can remove evidence or invalidate request-prefix reuse. Bounded initial reads reduce unnecessary output before it enters the durable transcript.

**Cache complete token measurements.** Dynamic route pricing and request-time file projection can change without a new session event. Avoiding a redundant copy preserves those dependencies without cache invalidation machinery.

## Consequences

Deployments can reduce initial read output while retaining pagination, mutation observation guards, and explicit larger windows. Tasks that need entire files can incur additional calls when the model follows every default window instead of requesting a larger one. Measurement remains linear in retained nodes; it does not reduce provider inference latency or billed tokens by itself.

## Testing

Focused filesystem tests cover omitted limits, continuation, explicit larger windows, maximum rejection, and invalid configuration. The [recorded-session case](../../../../snapshots/session/fs-read-default-window/snapshot.yml) pins the configured schema and paginated result. Token-meter tests cover detached immutable measurements and live route repricing. The [local benchmark](../../../../scripts/benchmark-code-efficiency.ts) measures synthetic node pricing and read output without provider calls; its character-based token estimates do not establish end-to-end task savings.
