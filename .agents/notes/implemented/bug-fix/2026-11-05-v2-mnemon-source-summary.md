# Agent Note: Restore V2 Mnemon summaries without changing message sources

Status: implemented

English | [中文](2026-11-05-v2-mnemon-source-summary.zh.md)

## Problem

Released V2 Sessions written with `dsh-mnemon` contain `user/message` sources with `kind: 'plugin'`, `plugin: 'dsh-mnemon'`, `form: 'instructions' | 'recall'`, and a string `summary`. The frozen V0 source validator permits `summary` only on notice form. V2-to-V3 reused that validator and refused these Sessions before their history could open. The source V2 files remained intact; one local corpus contained 67 such messages across 25 artifacts.

## Decision

V2-to-V3 admission and V3 relationship restoration validate a private view that omits `summary` only for this exact `user/message` source, then return and emit the original event with its summary and content unchanged. The frozen validator still checks every remaining source field and message field. Other plugins, message locations, forms, and non-string summaries keep their existing refusal behavior. V3-to-V4 lifts the plugin identity to `plugin:dsh-mnemon` and retains the original form and summary.

## Alternatives considered

**Rewrite the V2 file or remove its summary.** Both would lose recorded data; committed generations are immutable, and the summary remains useful presentation metadata.

**Change the source form to notice.** That would misstate whether the historical message supplied instructions or recall context, even though the text itself would survive.

**Widen the frozen V0 validator or all plugin sources.** This historical producer is the observed case. A global exception would also admit unaudited source combinations in unrelated formats and plugins.

## Verification

Focused migration and V4 catalog tests cover both forms, retained metadata and text, native reopen, and continued refusal of other sources. A dedicated keyless V2 Web snapshot exercises the actual Host session observer with a recorded Mnemon recall message. It adds one historical role to the bounded corpus, raising its ceiling from 13 to 14. A read-only current-catalog scan restored all 41 local compressed Session artifacts, including the reported V2 Session, without rewriting their files; the failing artifact restored as V4 with 648 events.

## Consequences

Historical Mnemon instructions and recall messages become readable on this runtime while retaining their recorded source metadata. The compatibility exception belongs to the V2-to-V3 reader and its private V3 relationship view; it does not mount or re-enable the incompatible Mnemon plugin.
