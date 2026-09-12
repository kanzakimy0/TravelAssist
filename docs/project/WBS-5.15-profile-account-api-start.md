# WBS 5.15 — Profile / Account API Start Record

> WBS: **5.15**  
> Task: **TASK-050-B**  
> Owner: **B / Personal Center**  
> Issue: **#336**  
> Spec branch: `task/b-wbs-5-15-profile-account-api`  
> Planned implementation branch: `codex/b-account-wbs-5-15-profile-account-api`  
> Publication baseline: `develop@1af8d7feac7fa2d254ca85a00061bf6d6b0e7940`  
> Publication status: **Task published / implementation not started**  
> Date: **2026-09-12**

---

## 1. Why 5.15 Can Start

Master WBS defines 5.15 dependencies as `8.2,8.3`.

At publication time:

- WBS 8.2 / TASK-016-B User / Profile Schema = **已完成**;
- WBS 8.3 / TASK-018-B Authentication Core = **已完成**.

Therefore the dependency gate for creating/executing TASK-050-B is open.

Codex must still re-check execution-time latest `origin/develop` before implementation.

---

## 2. Existing Accepted Foundations

### User/Profile DB

Existing accepted schema already provides:

```text
public.profiles
public.profile_settings
public.emergency_contacts
```

All are linked to `auth.users` with owner-focused RLS and existing FK lifecycle behavior.

### Auth Core

Existing accepted Auth Core already provides trusted server-side user verification. Cookie/session JSON is not treated as final authorization proof.

### Private B API convention

Existing Preference/Companion APIs establish the pattern:

```text
thin Route Handler
→ server HTTP orchestration
→ strict parser/domain mapper
→ owner-scoped repository
→ Supabase + RLS
```

`src/server/private-http.ts` currently centralizes verified private requests, bounded JSON, same-origin Cookie mutation protection and explicit Bearer behavior.

TASK-050-B must reuse this foundation rather than creating a parallel stack.

---

## 3. Frozen Scope

TASK-050-B implements:

```text
GET    /api/profile
PATCH  /api/profile
GET    /api/emergency-contacts
POST   /api/emergency-contacts
PATCH  /api/emergency-contacts/[id]
DELETE /api/emergency-contacts/[id]
```

It covers:

- current-user product Profile;
- account display settings;
- trusted read-only Auth email/phone/verification summary;
- emergency-contact CRUD.

It does **not** cover credential changes, session/device management, data export or account deletion.

---

## 4. Critical Boundaries

1. `auth.users` remains authentication identity source of truth.
2. Request body/path/query never selects the current owner.
3. Verified Auth user ID is the only owner identity.
4. Auth email/phone are read-only projections; do not copy credential truth into Profile rows.
5. Settings remain global display settings, not travel preferences.
6. Emergency contacts remain separate from Companions.
7. No normal-user service-role path.
8. Prefer no migration; reuse current tables.
9. No visual UI redesign.
10. **WBS 5.21 account/data deletion remains separate and must not be started by this Task.**

---

## 5. Master WBS Safety

This publication does **not** mechanically overwrite the shared Master WBS, because publication is not implementation.

When Codex actually begins implementation from the execution-time latest `origin/develop`, it must read the complete current Master WBS and change only WBS 5.15:

```text
未开始
→ 进行中（#336 / TASK-050-B）
```

After implementation + mandatory real Local Supabase/Auth acceptance + Draft PR:

```text
进行中
→ 待审查（#336 / TASK-050-B；Draft PR #<number>）
```

Only explicit user acceptance + merge to `develop` may later produce `已完成`.

---

## 6. Acceptance Gate Summary

A successful implementation must prove with real Local Supabase:

- two authenticated users + anon;
- owner isolation / no owner spoof;
- Cookie mutation same-origin protection;
- explicit Bearer no-fallback behavior;
- Profile/settings read/update/upsert and null semantics;
- trusted Auth contact projection;
- emergency-contact CRUD and cross-user denial;
- existing TASK-016 RLS regression;
- no server-only code in client bundle;
- focused/full test + lint + typecheck + build + current repository quality gates.

If the real Local Supabase/Auth gate cannot run, TASK-050-B must not be reported as fully complete or moved to `待审查`.

---

## 7. Canonical Task Files

- Formal Task: `docs/tasks/TASK-050-b-profile-account-api.md`
- Codex Launcher: `docs/tasks/CODEX-TASK-050-b-profile-account-api.md`
- GitHub Issue: `#336`

Implementation Result path:

`docs/tasks/RESULT-TASK-050-b-profile-account-api.md`

QA evidence root:

`docs/qa/TASK-050/`
