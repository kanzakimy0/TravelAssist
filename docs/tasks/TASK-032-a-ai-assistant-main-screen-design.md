# TASK-032-A — WBS 1.19 AI Travel Assistant Main Screen Design Candidate

## Metadata

- Task ID: TASK-032-A
- Owner: A / Main AI UX Design
- Status: 待验收
- WBS: 1.19
- GitHub Issue: #262
- Branch: `docs/a-ai-assistant-main-screen-design`
- Depends On: WBS 1.5
- Base Commit: `171900698180b80220017c9c4bec551b72792f27`
- Commit: `47c201a3ae95a7185334b54ebaf4ab9fce5f1312`
- Pull Request: #270 (Draft)

## Objective

Produce a development-ready AI assistant UX specification consistent with the current Home/Planner/Detail language and with the separation between AI suggestion, deterministic validation and actual Trip change application.

## Required design

Document:

- entry surfaces on Home / Planner / Detail;
- panel/sheet size and hierarchy by viewport;
- message roles and visible metadata;
- composer, attachments/place references if applicable, suggested actions;
- contextual trip/day/item summary shown to the user;
- change proposal → preview → confirmation → applied/failed state;
- loading, timeout, offline, unavailable, partial and safety/error states;
- keyboard/focus/Escape/screen-reader behavior;
- responsive and reduced-motion rules;
- what is local UI state vs savable conversation state;
- explicit boundaries to Planner, Route, Engine, Preference and future AI API;
- privacy: no provider raw payload, secrets or hidden reasoning display.

## Deliverables

- `docs/ui/ai-travel-assistant-main-screen.md`
- interaction/state diagram in Markdown
- acceptance matrix
- TASK-032 Result

## Completion rule

Design remains `待审查` until user acceptance. No runtime or AI API implementation.

## Final result rules

Before returning:

- update the task Result;
- update the current Master WBS truthfully;
- synchronize Issue/PR tracking;
- commit and push all task-owned changes;
- report exact commands/tests run and exact Deferred items;
- stop. Do not start the next task automatically.
