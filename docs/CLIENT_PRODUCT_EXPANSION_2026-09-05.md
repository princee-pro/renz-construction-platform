# Client product expansion — 5 September 2026

## Purpose and authority

This record captures the product direction supplied with the S3 authorization. It separates locked direction from the narrow S3 implementation and from capabilities that remain deferred. Product direction is not evidence of current RENZ services, locations, pricing, legal identity, credentials, or public claims.

## Locked product requirements

- Public visitors do not create customer accounts, register, log in, or manage passwords.
- Any future guest status/order access must use a high-entropy, revocable, narrowly scoped reference mechanism unless the client explicitly changes this requirement.
- Authentication is staff/admin-only, invitation-only, email/password followed by mandatory TOTP MFA.
- The eventual administration product may support operational queues, inquiries, project requests, orders, quotations, invoices, projects, services, editorial content, media, contacts, navigation, SEO, settings, analytics, users, roles, permissions, and audit.
- Contact details, locations, service/order behavior, commercial documents, analytics, consent, and premium media/motion require verified data, policy, rights, and operational ownership before implementation.
- Future public motion must explain construction, respect reduced motion and poor networks, and avoid decorative particle systems, scroll hijacking, generic floating-card patterns, and an unmeasured WebGL baseline.
- Admin-managed public values must never become editable secrets, infrastructure settings, security policy, arbitrary JavaScript, or arbitrary HTML.

## Current S3 implementation

S3 implements only the identity and authorization spine:

- invitation-only local Supabase Auth;
- staff email/password sign-in;
- TOTP enrollment and challenge;
- server-side AAL2 enforcement;
- two system roles: `super_admin` and `admin`;
- eight bounded identity/security permissions;
- fresh database-backed permission checks;
- protected `/admin`, `/admin/security`, `/admin/mfa`, `/admin/mfa/enroll`, and `/admin/sign-in` routes;
- redacted append-only audit helper;
- least-privilege grants and explicit RLS policies for identity/RBAC/audit tables;
- last-active-Super-Admin safeguards;
- server-only narrow Auth Admin invitation adapter.

The local Auth stack and synthetic users are verification fixtures only. No real staff identity, client email, production secret, customer account, cloud project, or deployment was created.

## Explicitly deferred future implementation

- **S4:** content, evidence, media, rights, and publication kernel.
- **S5:** admin content vertical slice.
- **S6:** public content delivery and technical SEO.
- **S7:** guest Contact, Start a Project, and service/material request flows without customer accounts.
- **S8:** lead operations, order/request operations, quotation and invoice extensions after legal/tax decisions.
- **S9:** approved brand, photography, responsive media, and premium motion experience.
- **S10:** analytics, consent, privacy, rate limits, observability, CSP, performance and security hardening.
- **S11:** release rehearsal, recovery proof, controlled rollout, and deliberate indexing.

No deferred capability is represented by fabricated seed data, placeholder credentials, public routes, or speculative provider configuration.
