# RENZ Phase 1 / S3 authentication threat model

**Date:** 5 September 2026

| Threat | Control in S3 | Evidence/limit |
|---|---|---|
| Public account creation | Global signup disabled; no signup route | Local Auth verification rejects public signup |
| Credential stuffing | Supabase Auth built-in controls; generic errors | Distributed edge rate limiting remains S10/production hardening |
| AAL1 reaching admin | Server page/action guards and database helper require AAL2 | Local TOTP verification and fresh RPC checks |
| MFA bypass | No bypass flag, hidden route, master password, or role claim-only check | Enrollment/challenge are explicit; recovery remains controlled/deferred |
| Stale role/session | Fresh profile and permission evaluation on every protected request | Role removal/disable behavior covered by database design and local Auth script |
| Privileged key leak | Secret key is server-only and adapter is narrow | Client bundle search and source review |
| Open redirect | `safeInternalRedirect` rejects external/protocol-relative values | Unit coverage in environment/redirect tests |
| CSRF/origin abuse | Server Actions use Next origin protections; no cookie-authenticated custom mutation route | Additional origin tests belong with future mutation endpoints |
| Audit leakage | Bounded columns, prohibited metadata keys, no payload/token fields | pgTAP and redaction review |
| Last-admin lockout | Database triggers reject removal/disablement of the last active Super Admin | pgTAP positive/negative tests |
| Bootstrap takeover | One-shot operator path requires an invited pending-MFA profile and serializes/refuses later assignments | Local bootstrap CLI and pgTAP transaction tests; no browser/PostgREST execution grant |

S3 does not claim production abuse protection, provider recovery ownership, legal privacy compliance, or deployment hardening. Those remain gated work.
