# RENZ Admin user guide

**Checked against the source on 23 October 2026.** This guide covers the built Control Room. The website has not been made live by the GitHub handoff; a developer must finish staging and release checks before real business use. Screens may show fewer options when your account lacks permission. Never use real client details in local test exercises.

The Control Room holds private business information. **Operations → Projects** is for running a client engagement. **Website → Projects** is for the separate public case study or labelled concept study. Creating one does not publish the other. Website editing has its own [CMS guide](WEBSITE_CMS_GUIDE.md).

## Sign in, authenticator and password

1. Open `/admin/sign-in` on the environment URL given by the owner/developer. There is no public staff registration.
2. Enter your staff email and password. The owner creates accounts and privately gives a temporary password; the current creation workflow sends no invitation email.
3. At first use, follow the authenticator setup. Add the displayed QR/manual setup to your authenticator app and enter its six-digit code. At later sign-ins, enter the current six-digit authenticator code when asked. Do not share the QR, setup secret or codes.
4. If you used a temporary password, the application takes you to **Choose your own password** after the authenticator step. Choose and confirm your private password. The workspace stays locked until this is complete.
5. For a voluntary password change, open `/admin/security/password` after signing in and completing MFA. The current form checks password strength and confirmation.

If a code fails, check the authenticator entry and device time, then try a fresh code. If you lose the authenticator or cannot sign in, contact the authorized owner/developer privately. The application does not offer a self-service MFA recovery-code workflow. Cloud email/password-reset delivery must be separately configured and tested; do not assume an email is on its way.

Local developer accounts are created by the developer's local-only setup workflow, described in [environment setup](ENVIRONMENT_SETUP.md). Do not reuse a local fixture password for a real staff account.

## Navigation, search and updates

The opening `/admin` Control Room shows the operational overview, attention/action lists, recent activity and summaries your permissions allow. The sidebar groups Operations, Finance, Procurement, Website, Analytics, Notifications and Settings. On a small screen use the menu control; registers become stacked records and editors use tabs where needed.

Use **Quick Find** (`Ctrl+K` on Windows, `⌘K` on Mac) to search the supported business and website records. Select a result to open its detail/editor page. Search results are permission-filtered; no result does not prove a record does not exist. Register search and filters are useful when you know the domain. **Older/next records** loads another bounded page; a register does not load the entire database at once.

A live-updates indicator means the screen can receive change notices. These notices reload authorized data. If connection is lost, refresh or return focus to the window and check the current record before acting. An open form keeps its starting version: **Someone else saved first** means your save was refused. Copy any wording you need, choose **Reload latest**, compare and reapply deliberately. Repeatedly submitting the stale form will not win the conflict.

## What each role can do

These are the six templates defined by the current migrations. The displayed permission list is the final authority; role wording is only a summary. Older reports predate these templates.

| Role                    | Main capabilities                                                                                                                                                                     | Important limits                                                                                                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Owner / Super Admin** | All current business and website capabilities; create/change/disable staff; role/security management; publish legal pages and change system defaults.                                 | The last active owner cannot be disabled or removed. Give this role only to an authorized owner.                                                                                                              |
| **Admin**               | Day-to-day leads, clients, operational projects, invoice drafts/issue/payment records, contractors, procurement; prepare website/content drafts and media; business/website settings. | Cannot manage staff, void invoices, publish/archive editorial content, verify claims or publish website pages; cannot publish legal pages or change system defaults.                                          |
| **Project Manager**     | Leads, client/project changes, contractors and assignments, materials/orders/delivery; read invoices and website drafts.                                                              | Cannot issue/edit invoices or record customer/contractor payments; cannot edit/publish website content or manage staff.                                                                                       |
| **Finance**             | Invoice drafts/issue/void and customer payments, contractor payments, finance analytics; read clients/projects/partners/materials/orders.                                             | Cannot change clients/projects, assign contractors, edit procurement orders, publish website content or manage staff.                                                                                         |
| **Content Editor**      | Edit/review/publish/archive services, public projects and insights; page editing/layout/publication, media rights/upload, navigation capability and website analytics.                | No private client/project/finance registers, staff management, business-setting changes or legal publication. Global C7 configuration controls may need a separate settings permission; see CMS limits below. |
| **View Only**           | Read the permitted leads/clients/projects/partners/materials/orders/invoice/content/page registers and general analytics/settings.                                                    | No business/content changes or finance-analytics permission. It is still a private-data role: read access includes sensitive registers.                                                                       |

For example, Content Editor is a publishing role in the current implementation. Do not assign it expecting a review-only editor. Finance can void invoices. These are deliberate current grants in `20260922100000_c10_staff_access.sql`, even where an older guide says owner-only. The system does not provide an arbitrary per-user checkbox permission builder; the owner chooses supported role templates.

## Add, edit or disable staff

Only the owner can perform the management actions in **Settings → Users & Access / Staff** (`/admin/settings/staff`).

1. Open **Add a staff member**; enter name and email.
2. Choose the least-permission role that fits the person's work. Read the role notes and **What can they do?** capability summaries.
3. Leave the optional temporary password empty to generate a strong one, or enter a permitted temporary password. Choose **Create staff account**.
4. Privately hand over the temporary password shown once. It is not sent by email and must not be pasted into an issue, screenshot, chat transcript, commit or shared document.
5. The register shows waiting/active/disabled state, authenticator state and sign-in/activity information. Open the member's controls to rename, change role, require/reset a temporary password, disable or reactivate. Review and confirm the target shown before submitting.

Disable access when someone leaves. A disabled account loses protected database access even if an old page remains open. Reactivation does not waive the MFA/password requirements. A role change alters what subsequent requests may do. Do not try to bypass the last-owner protection by editing database rows; use the documented recovery process with the authorized technical owner.

## Clients

Open **Operations → Clients** (`/admin/operations/clients`). Search by recorded details, filter tier/status, then open the client. Use the active/archived/all filter if an expected record is absent.

To add a client, choose **New client**, enter the full name and at least email or phone, then any known company/address/referral/reference and an initial note. Review **Possible existing clients** before saving. A shared family/business contact is possible, so a warning does not automatically block creation or merge people. Standard/VIP/Premium is a business segmentation label, not “active/inactive.”

Client detail provides contact shortcuts where suitable, edit/archive actions, linked projects, notes, invoices and originating leads as permission allows. Check a stored phone before opening WhatsApp; a plausible format does not prove the person uses it. Archive closes a record to new-project pickers and preserves its links/history. The current client UI does not include a general unarchive button; ask the authorized developer if a mistaken archive needs recovery.

## Operational projects and stages

From a client choose **Create Project**, or open **Operations → Projects → New project**. Select an active client, enter the working title and only known description/dates/budget. Budget requires both amount and currency. Save the draft business record; there is no website publication step for a private project.

In the Project Command Center use the status/phase controls deliberately:

- **Status:** Planning, In progress, On hold, Completed describes the whole engagement.
- **Phase:** Design, Planning, Procurement, Structural, Execution, Finishing, Completed describes the current work.
- **Priority:** Low, Medium, High controls attention, not access or billing.

Status and phase history retain who changed them and when. Completed is not automatically archived. Notes stay private. Invoices, contractor assignments and material/procurement panels connect the related workflows without copying the project into another domain.

The **Public Case Study** panel can link an existing editorial record or create a separate draft with a public-safe title/slug. This is optional. Client identity, contact, budget and internal notes do not copy into that draft. The website editor must separately supply truthful narrative, evidence, media rights and publication approval. Unlinking is not the same as deleting either record.

## Invoice drafts, issue and PDF

1. Open **Finance → Invoices → New invoice**, or start from the relevant client/project.
2. Choose the client and optional project belonging to that client. Choose the currency, tax rate, reference, terms and dates as applicable. Add description, quantity, unit price and unit details for each line.
3. Save the draft and inspect the preview. Drafts have no official invoice number. Display totals are a preview; the server recomputes them.
4. Confirm the parties, currency, tax, dates, lines, payment instructions and outward-facing notes. Those notes appear on the document; keep private comments elsewhere.
5. An authorized issuer chooses **Issue** with valid issue/due dates and at least one line. Issue assigns the official number and freezes the document details and financial totals.
6. Use **View/Print** or **Download PDF** in the invoice detail. A PDF download is generated from the same document model. Inspect the file before handing it to a client.

An issued invoice cannot be edited into a different bill. The supported correction is an authorized **Void** with reason, then **Duplicate to draft** and issue the corrected draft. Effective payments must be reversed before void. Void preserves the old number/document/history. An unused draft can be archived; an archive is not deletion. Finance and Owner have void permission; ordinary Admin does not.

## Record and reverse payments

Recording a payment records money already received by the business; it does not collect money online. In the issued invoice's **Payments** tab choose **Record Payment**, enter amount/date/method and optional reference/internal payment note, check the remaining balance and submit. Currency comes from the invoice. The system rejects overpayment; concurrent entries are checked against the updated balance. Unpaid/Partially paid/Paid and overdue are calculated automatically.

For a mistake, use **Reverse** on the original payment with a reason, then record the correct payment if needed. You cannot erase or rewrite the original receipt. Reversal removes it from effective totals and keeps the history. **Receipt** opens a printable confirmation; a separate client receipt PDF is not a general feature. Keep customer invoice payments separate from outgoing contractor payments.

Finance summaries show Invoiced, Paid and Outstanding per currency. They are not tax advice, an accounting ledger or an exchange-rate calculation. Never add different currency rows into one total.

## Share an invoice safely

In the issued invoice's **Client link** tab choose **Generate Client Link**. The full URL is shown once; copy it privately to the intended recipient. The link gives anyone holding it access to that document, including billing details, without sign-in. Do not publish it in a repository, support issue or public chat.

**Regenerate** replaces the active link; **Revoke** ends its access. The old link then fails. **Email Invoice** opens your mail application and **Share on WhatsApp** opens a message; the platform does not send either automatically. Review recipient and text before sending. A voided invoice may remain viewable through an existing link with a VOID banner so the recipient learns it was cancelled; revoke if access should end entirely.

## Contractors and assignments

Open **Operations → Contractors → New contractor**. Enter known identity/contact and business details, review duplicate suggestions and save. Suppliers and contractors share one partner record; add the appropriate capability instead of duplicating the same firm.

From the operational project's Contractors panel create an assignment: contractor, scope, dates, status and any known rate/agreed amount with currency. Update progress, complete/cancel/on-hold as appropriate. Performance rating is available for completed assignments. Use the supported amount-adjustment control with a reason to preserve financial history. Authorized payment staff record/reverse outgoing contractor payments against the assignment; the **Contractor payables** view shows the remaining amounts by currency. Recording a payment does not transfer money.

## Suppliers, materials, requirements and purchase orders

Use **Procurement → Suppliers** for supplier-capable partners and **Materials** for catalog records such as name, specification, unit and optional preferred supplier. Do not invent prices/stock figures merely to fill an empty record. A catalog record is not an inventory balance.

1. In an operational project, add a material requirement with quantity/unit/specification and known required-by date/priority. Review and approve it before ordering.
2. Create a purchase-order draft for the project and supplier, choose currency/tax, and add approved requirements or explicit free-text lines. Review an over-order warning; only confirm excess when intended.
3. Save/preview, then an authorized issuer issues the order. It receives its number and frozen document details. Use print/PDF or the revocable supplier link as needed; treat that link as private like an invoice share.
4. When goods arrive choose **Record Delivery**, select actual quantities and date. Partial deliveries are supported. The server rejects over-receiving.
5. Reverse an incorrect receipt with a reason. Cancel when allowed, or close a completed/accepted short delivery with the required reason. Issued order terms/lines are immutable; duplicate creates a fresh draft and does not carry requirement links automatically.

The current workflow manages requirements, orders and receiving. It does not operate a warehouse stock ledger or settle supplier payments through a payment gateway.

## Leads and follow-up

Open **Operations → Leads** to see contact/project/service/material enquiries, including staff-entered enquiries. Filter/search and open Lead 360. Review the source, visitor's details/message, typed enquiry fields and any attachments. Assign an eligible staff member, set priority, log contact and notes, and choose the correct stage: New, Contacted, Qualified, Site visit, Proposal, Won or Lost. Lost needs a reason.

Attachment access requires permission and clearance; do not assume an uploaded file is safe merely because it arrived through a form. Conversion is explicit: choose an appropriate existing client or create one, then create an operational project if needed. Material enquiries can become draft material requirements after that. Marking a project lead Won requires the client/project links. The source lead and its history remain; conversion does not automatically publish anything or send a message to the visitor.

If no website enquiries arrive, the developer should inspect intake settings, privacy publication and anti-abuse configuration. A form success alone can also be a bot-decoy response; use the saved lead/reference in Admin for a real operational confirmation.

## Analytics, notifications, history and help

**Analytics** offers operational, finance, leads, delivery, project and website views according to permissions. Review date range, scope and currency before interpreting a number. Website counters require enabled/configured collection; an empty graph is not proof of no visitors. Finance Analytics needs a separate permission from reading individual invoices. Detailed definitions are in the [C9 analytics contract](CLAUDE_C9_ANALYTICS_ARCHITECTURE.md).

The bell opens recent in-app notifications. Open a record, mark read/unread, archive or use **Mark all read**; the full register is `/admin/notifications`. **Settings → Notifications** controls optional categories. Security/system categories remain mandatory. There is no automatic staff notification email, WhatsApp delivery or browser push. Timed alerts need the scheduler; an authorized user can run a sweep manually, and Launch Readiness reports stale/missing sweep evidence.

Use a record's **Activity** tab and the Control Room's recent activity to understand changes. History records actions and actors, not the entire private note/form body; not every staff template has `audit.read`. There is no separate arbitrary audit-log editor. Do not alter/delete financial or activity history to hide a mistake.

For help, record the environment, route, record type/reference, time, exact non-sensitive error and steps that led to it. Send these privately to the authorized owner/developer. Exclude passwords, MFA setup/codes, share URLs, client contact data and attachments from public issues/screenshots. There is no invented RENZ support address in this guide. The developer can use [handoff start](HANDOFF_START_HERE.md), [testing guide](TESTING_AND_QA_GUIDE.md) and [incident response](RENZ_INCIDENT_RESPONSE.md).

Choose **Sign out** when finished, especially on a shared device, and close any downloaded private documents. If an action reports failure or a network interruption, inspect the latest record before retrying so a payment/receipt is not recorded twice. An error is not permission to bypass the application with direct database edits.
