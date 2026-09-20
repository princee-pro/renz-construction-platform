# RENZ Phase 1 / S3 identity architecture

**Date:** 5 September 2026  
**Scope:** local invitation-only staff identity and authorization spine

## Trust boundaries

1. Public browser: may view the public foundation route and the staff sign-in shell; it never receives a customer account or server secret.
2. Browser Supabase client: uses only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for Auth/MFA calls.
3. Server caller-scoped client: uses request cookies and the publishable key; every protected request revalidates the current user, profile status, AAL, and permission.
4. Narrow Auth Admin adapter: server-only, creates a fresh Supabase client with `SUPABASE_SECRET_KEY` only for invitation operations. It is not exported as a generic database client.
5. Caller-scoped database operations: approved-admin assignment and other mutations use reviewed public facades that recheck the current actor's AAL2 state and permission inside PostgreSQL.
6. Database: grants and RLS remain authoritative. Fresh permission evaluation derives the actor from `auth.uid()` and requires AAL2 plus an active profile.

## Session flow

`proxy` refreshes the SSR cookie session for `/admin/:path*`. Route/page guards then call `auth.getUser()`, inspect AAL/factors, read the safe profile state, and call the narrow permission facade. Proxy checks are optimistic; page/action/database checks are authoritative.

## MFA flow

- Password sign-in establishes AAL1.
- No verified TOTP factor routes to enrollment.
- A verified factor with an AAL1 session routes to challenge.
- Only AAL2 plus an active profile and required capability reaches the admin shell.
- Enrollment displays the Auth-provided QR/manual secret only until verification; the React state is cleared immediately after success.

## Bootstrap and audit

The initial operator path is `pnpm auth:bootstrap -- --email <operator-email>` with the local Auth environment loaded privately. It invites one pending-MFA user, then calls the unexposed `private.bootstrap_super_admin` transaction through the local database connection. An advisory transaction lock and a no-existing-assignment check make the bootstrap one-shot; the helper is not exposed through PostgREST and stores only a bounded, actor-null bootstrap audit marker. Once the invited operator completes MFA, normal role/capability checks apply.

The application records successful MFA verification/enrollment, invitation, role assignment/removal, disablement, sign-out (when an AAL2 actor is present), and bootstrap events. The audit writer rejects credential-bearing metadata keys and direct authenticated table mutation remains denied.

## Profile lifecycle

Auth user creation creates a `pending_mfa` profile through a locked-down trigger. Successful AAL2 enrollment promotes the current profile to `active`. `disabled` profiles fail every permission check. Profile and role changes advance the existing optimistic-concurrency version.

## Recovery boundary

Password recovery, factor removal, and break-glass ownership are documented but not silently bypassed. Local email delivery is enabled only for local testing; production SMTP, recovery ownership, and operational factor reset remain later decisions.
