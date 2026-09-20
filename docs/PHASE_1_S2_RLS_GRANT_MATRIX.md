# RENZ Phase 1 / S2 RLS and Grant Matrix

**Status date:** 2 September 2026
**Current posture:** default deny

Every S2 application table in `public` has row-level security enabled. `PUBLIC`, `anon`, and `authenticated` have no table privileges, and S2 creates zero allow policies. PostgreSQL grants and RLS are intentionally both restrictive; neither is treated as a substitute for the other.

Future-operation columns below describe policy ownership, not access granted by S2. S3 owns the authorization spine; S6 may later admit verified published reads; S7 owns a narrow server-only intake path; S8 owns lead operations.

| Table                            | Sensitivity                        | Future anonymous operation                         | Future authenticated operation       | S2 privilege/policy | RLS | Future owner |
| -------------------------------- | ---------------------------------- | -------------------------------------------------- | ------------------------------------ | ------------------- | --- | ------------ |
| `profiles`                       | Restricted identity                | None                                               | Own/admin-scoped access if approved  | None / none         | Yes | S3           |
| `roles`                          | Restricted authorization           | None                                               | Scoped administration                | None / none         | Yes | S3           |
| `permissions`                    | Restricted authorization           | None                                               | Scoped administration/read           | None / none         | Yes | S3           |
| `role_permissions`               | Restricted authorization           | None                                               | Scoped administration/read           | None / none         | Yes | S3           |
| `user_roles`                     | Restricted authorization           | None                                               | Own/scoped administration            | None / none         | Yes | S3           |
| `media_assets`                   | Internal plus publishable metadata | Approved public derivative metadata only           | Scoped editorial access              | None / none         | Yes | S3/S4/S6     |
| `services`                       | Editorial                          | Verified published rows only                       | Scoped editorial access              | None / none         | Yes | S3/S4/S6     |
| `service_localizations`          | Editorial                          | Verified published parent rows only                | Scoped editorial access              | None / none         | Yes | S3/S4/S6     |
| `projects`                       | Editorial/proof                    | Verified published rows only                       | Scoped editorial access              | None / none         | Yes | S3/S4/S6     |
| `project_localizations`          | Editorial/proof                    | Verified published parent rows only                | Scoped editorial access              | None / none         | Yes | S3/S4/S6     |
| `project_categories`             | Editorial taxonomy                 | Verified published rows only                       | Scoped editorial access              | None / none         | Yes | S3/S4/S6     |
| `project_category_localizations` | Editorial taxonomy                 | Verified published parent rows only                | Scoped editorial access              | None / none         | Yes | S3/S4/S6     |
| `project_category_assignments`   | Editorial relationships            | Relationships between verified published rows      | Scoped editorial access              | None / none         | Yes | S3/S4/S6     |
| `project_services`               | Editorial relationships            | Relationships between verified published rows      | Scoped editorial access              | None / none         | Yes | S3/S4/S6     |
| `project_stages`                 | Editorial/proof                    | Approved stages of verified published projects     | Scoped editorial access              | None / none         | Yes | S3/S4/S6     |
| `project_media`                  | Editorial/proof                    | Approved media of verified published projects      | Scoped editorial access              | None / none         | Yes | S3/S4/S6     |
| `project_media_localizations`    | Editorial/proof                    | Approved usage text for public media               | Scoped editorial access              | None / none         | Yes | S3/S4/S6     |
| `posts`                          | Editorial                          | Verified published rows only                       | Scoped editorial access              | None / none         | Yes | S3/S4/S6     |
| `post_localizations`             | Editorial                          | Verified published parent rows only                | Scoped editorial access              | None / none         | Yes | S3/S4/S6     |
| `post_categories`                | Editorial taxonomy                 | Verified published rows only                       | Scoped editorial access              | None / none         | Yes | S3/S4/S6     |
| `post_category_localizations`    | Editorial taxonomy                 | Verified published parent rows only                | Scoped editorial access              | None / none         | Yes | S3/S4/S6     |
| `post_category_assignments`      | Editorial relationships            | Relationships between verified published rows      | Scoped editorial access              | None / none         | Yes | S3/S4/S6     |
| `team_members`                   | Claim-bearing                      | Verified published rows only                       | Scoped editorial/verification access | None / none         | Yes | S3/S4/S6     |
| `team_member_localizations`      | Claim-bearing                      | Verified published parent rows only                | Scoped editorial/verification access | None / none         | Yes | S3/S4/S6     |
| `testimonials`                   | Claim-bearing                      | Verified published rows only                       | Scoped editorial/verification access | None / none         | Yes | S3/S4/S6     |
| `testimonial_localizations`      | Claim-bearing                      | Verified published parent rows only                | Scoped editorial/verification access | None / none         | Yes | S3/S4/S6     |
| `testimonial_verifications`      | Private evidence                   | None                                               | Named verifier/admin only            | None / none         | Yes | S3/S4        |
| `credentials`                    | Claim-bearing                      | Verified published rows only                       | Scoped editorial/verification access | None / none         | Yes | S3/S4/S6     |
| `credential_localizations`       | Claim-bearing                      | Verified published parent rows only                | Scoped editorial/verification access | None / none         | Yes | S3/S4/S6     |
| `site_pages`                     | Editorial                          | Verified published rows only                       | Scoped editorial access              | None / none         | Yes | S3/S4/S6     |
| `page_localizations`             | Editorial                          | Verified published parent rows only                | Scoped editorial access              | None / none         | Yes | S3/S4/S6     |
| `page_sections`                  | Editorial composition              | Enabled sections of verified published pages       | Scoped editorial access              | None / none         | Yes | S3/S4/S6     |
| `page_section_projects`          | Editorial relationships            | Approved selections on public pages                | Scoped editorial access              | None / none         | Yes | S3/S4/S6     |
| `page_section_services`          | Editorial relationships            | Approved selections on public pages                | Scoped editorial access              | None / none         | Yes | S3/S4/S6     |
| `page_section_media`             | Editorial relationships            | Approved selections on public pages                | Scoped editorial access              | None / none         | Yes | S3/S4/S6     |
| `navigation_menus`               | Editorial navigation               | Approved public menus                              | Scoped editorial access              | None / none         | Yes | S3/S4/S6     |
| `navigation_items`               | Editorial navigation               | Approved visible items                             | Scoped editorial access              | None / none         | Yes | S3/S4/S6     |
| `navigation_item_localizations`  | Editorial navigation               | Approved labels for visible items                  | Scoped editorial access              | None / none         | Yes | S3/S4/S6     |
| `public_site_settings`           | Allow-listed public configuration  | Approved non-secret keys only                      | Scoped setting administration        | None / none         | Yes | S3/S4/S6     |
| `lead_stages`                    | Restricted operations              | None                                               | Scoped lead operations               | None / none         | Yes | S3/S8        |
| `leads`                          | Sensitive personal data            | No direct insert/read; future server boundary only | Scoped lead operations               | None / none         | Yes | S3/S7/S8     |
| `project_briefs`                 | Sensitive personal/project data    | No direct operation                                | Scoped lead operations               | None / none         | Yes | S3/S7/S8     |
| `lead_services`                  | Sensitive inquiry data             | No direct operation                                | Scoped lead operations               | None / none         | Yes | S3/S7/S8     |
| `contact_messages`               | Sensitive personal/message data    | No direct operation                                | Scoped lead operations               | None / none         | Yes | S3/S7/S8     |
| `lead_attachments`               | Highly sensitive file metadata     | No direct operation                                | Scoped lead operations               | None / none         | Yes | S3/S7/S8     |
| `lead_notes`                     | Highly sensitive internal notes    | None                                               | Named operational roles only         | None / none         | Yes | S3/S8        |
| `lead_stage_history`             | Restricted operational history     | None                                               | Named operational roles only         | None / none         | Yes | S3/S8        |
| `audit_logs`                     | Highly restricted audit            | None                                               | Trusted read/write paths only        | None / none         | Yes | S3           |

## Schema and default privileges

- `private`: all access revoked from `PUBLIC`, `anon`, and `authenticated`; its S2 functions are `SECURITY INVOKER`, have an empty search path, and expose no policy bypass.
- `public` tables: all table privileges revoked from `PUBLIC`, `anon`, and `authenticated` after creation.
- `public` sequences and functions: all privileges revoked from the same roles.
- Default table/sequence/function privileges are revoked for future objects created by the migration owner in the relevant schema.
- S2 defines no public lead insert, no visitor content read, no authenticated admin mutation, no service-role utility, and no Storage policy.

## Later policy admission rule

A later slice must add both the minimum PostgreSQL grant and a narrowly tested RLS policy for each admitted operation. Policies must be caller- and row-specific, include `WITH CHECK` where writes exist, and ship with negative tests. Temporary `USING (true)` or broad authenticated policies are not acceptable.
