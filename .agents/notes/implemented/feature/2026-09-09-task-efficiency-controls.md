# Agent Note: Explicit task efficiency controls

Status: implemented

English | [中文](2026-09-09-task-efficiency-controls.zh.md)

## Problem

Large tool catalogs and repeated observations increase model input without necessarily improving task completion. Existing aggregate session timings combine preparation with model latency, while independent workflow limits do not bound the number of simultaneously active runs in one engine instance.

## Decision

The [presentation plugin](../../../../packages/core/agent-tool-presentation/README.md) optionally discovers native definitions from the admitted catalog. Successful logged discovery results determine the loaded set; request headers record the resulting definitions. The selector changes presentation without granting execution rights. Loaded-name order remains stable across plugin reloads.

The [web tools](../../../../packages/web/tool-web/README.md) optionally reuse caller-local results within byte, count, and lifetime limits. Fetch windows identify retrieval time and character offsets. Continuation requires the same retained version; provider registration changes invalidate reuse, and every lookup checks current provider availability. Provider-side truncation remains visible. The [job tools](../../../../packages/jobs/tool-jobs/README.md) can suppress repeated final output while retaining explicit recovery and existing stream cursors.

The [stats plugin](../../../../packages/session/session-stats/README.md) optionally writes bounded local timing records without message bodies. Writer overload and failure cannot delay task execution. The [workflow engine](../../../../packages/workflow/workflow-ptc/README.md) supports an engine-wide live-run ceiling, and the [workflow tool](../../../../packages/workflow/tool-workflow/README.md) can expose a smaller per-run child budget including retries.

Foreground [subagent calls](../../../../packages/subagent/tool-subagent/README.md) can request provider-validated structured results. Unsupported providers and invalid schemas fail before child creation; schema requests use caller delivery and wait for the child result. Keyless shipped-profile scenarios cover discovery, cached page continuation and refresh, final-output recovery, structured child results, and bounded workflow execution.

## Alternatives considered

**Filter execution permissions to reduce schemas.** Discovery changes what is advertised, while permissions retain their separate authority. Conflating these operations would make omitted definitions impossible to discover safely.

**Cache across callers without freshness metadata.** Such reuse obscures observation age and can combine unrelated sessions or provider generations. Caller-local retention trades some hit rate for a recorded fetch time, cache hit status, and predictable invalidation.

**Automatically retry failed work.** Failed child runs can leave file or external side effects. Explicit budgets and structured acceptance guidance preserve the caller's responsibility to inspect partial results before retrying.

## Consequences

The controls are opt-in. Discovery may add a model round and invalidate some prefix reuse when tools are first loaded. Web continuation fails after eviction instead of silently fetching a different version. Timing records measure extension-point intervals and token counters; they do not invent isolated network, OS spawn, or monetary-cost measurements. Capacity rejection avoids starting extra workers but does not deduplicate already completed tasks. Released Session generations remain unchanged.
