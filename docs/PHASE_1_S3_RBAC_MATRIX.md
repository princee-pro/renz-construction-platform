# RENZ Phase 1 / S3 RBAC matrix

## Role vocabulary

| Role | Purpose | S3 authority |
|---|---|---|
| `super_admin` | Protected highest administrative role | All S3 permissions, including role management and Super Admin safeguards |
| `admin` | Normal invited administrator | User invitation/disablement, role/capability read, audit read/write, security status; cannot manage roles |

No Editor, Sales, Project Manager, Operations, Accountant, content, lead, order, invoice, or analytics role is seeded in S3.

## Permissions

| Permission | `super_admin` | `admin` | Implemented S3 operation |
|---|---:|---:|---|
| `users.read` | yes | yes | Safe profile state list/read |
| `users.invite` | yes | yes | Narrow server-only Auth invitation plus caller-scoped approved-admin assignment |
| `users.disable` | yes | yes | Disable profile through guarded RPC |
| `roles.read` | yes | yes | Read approved role/capability catalog |
| `roles.manage` | yes | no | Assign/remove approved roles |
| `audit.read` | yes | yes | Read redacted audit rows |
| `audit.write` | yes | yes | Trusted audit helper |
| `security.manage` | yes | yes | Current security status |

## Database enforcement

The permission helper accepts only a permission key and derives the actor from `auth.uid()`. It requires an active profile and AAL2. Public facades are narrow, schema-qualified, `SECURITY DEFINER`, empty-search-path functions with explicit authenticated execution grants. Future content, lead, media, settings, and public tables remain default-deny.

## Invariants

- public signup and anonymous sign-in are disabled;
- lower administrators cannot assign/remove `super_admin`;
- the last active `super_admin` cannot be removed or disabled;
- direct audit table mutation is denied;
- role removal is effective on the next fresh permission check;
- disabled profiles cannot authorize operations even with a stale browser session.
