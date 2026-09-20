import { createHash, randomBytes } from "node:crypto";

import {
  admin,
  client,
  createActor,
  credentials,
  removeUserByEmail,
  rpc,
  signInAndActivate,
} from "./c4-local.mjs";
import { assert, runLocalSql } from "./s4-local.mjs";

// C8 leads: the public submission boundary (service_role facades only),
// reference numbering, idempotency, rate limiting, upload ownership /
// expiry, the Lead CRM facades, conversion (idempotent + race), the material
// requirement bridge (no purchase orders), RBAC/RLS negatives, audit
// redaction and value-free realtime pointers. Every record is synthetic and
// removed at the end.

const emailA = "c8-synthetic-a@example.test";
const emailB = "c8-synthetic-b@example.test";
const emailRead = "c8-synthetic-read@example.test";
const emailAal1 = "c8-synthetic-aal1@example.test";
const password = ["Local", "C8", "Leads", "Passphrase", "2026", "!"].join("-");
const readRole = "c8-synthetic-read";
const marker = "SYNTHETIC C8";

function reasons(result) {
  return Array.isArray(result?.reasons) ? result.reasons : [];
}
function hasReason(result, code) {
  return reasons(result).some((r) => r?.code === code);
}
function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
function hex(bytes) {
  return randomBytes(bytes).toString("hex");
}

async function submit(service, payload) {
  return rpc(service, "intake_submit_lead", { payload });
}

async function verifyC8() {
  const checkpoints = [];
  const created = { leads: [], clients: [], projects: [], sessions: [] };
  const service = client(credentials.secretKey);
  const anonymous = client(credentials.anonymousKey);
  try {
    // Synthetic read-only role (leads.read only).
    runLocalSql(
      `delete from public.user_roles where role_id in (select id from public.roles where key = '${readRole}');
       delete from public.role_permissions where role_id in (select id from public.roles where key = '${readRole}');
       delete from public.roles where key = '${readRole}';
       insert into public.roles (key, display_name) values ('${readRole}', 'SYNTHETIC leads read only');
       insert into public.role_permissions (role_id, permission_id)
       select r.id, p.id from public.roles r cross join public.permissions p where r.key = '${readRole}' and p.key = 'leads.read';`,
      "C8 synthetic role",
    );
    await createActor(emailA, password, "admin");
    await createActor(emailB, password, "admin");
    await createActor(emailRead, password, readRole);
    await createActor(emailAal1, password, "admin");
    const a = await signInAndActivate(emailA, password);
    const b = await signInAndActivate(emailB, password);
    const readOnly = await signInAndActivate(emailRead, password);
    const aal1 = client(credentials.publishableKey);
    assert(
      !(await aal1.auth.signInWithPassword({ email: emailAal1, password })).error,
      "AAL1 sign-in failed.",
    );

    // ------------------------------------------------------------------
    // 1. Public boundary: anon and authenticated cannot call intake facades.
    // ------------------------------------------------------------------
    const anonSubmit = await anonymous.rpc("intake_submit_lead", { payload: {} });
    assert(Boolean(anonSubmit.error), "Anonymous could execute intake_submit_lead.");
    const staffSubmit = await a.rpc("intake_submit_lead", { payload: {} });
    assert(Boolean(staffSubmit.error), "Authenticated staff could execute intake_submit_lead.");
    const anonTable = await anonymous.from("leads").select("id").limit(1);
    assert(
      Boolean(anonTable.error) || (anonTable.data ?? []).length === 0,
      "Anonymous read the leads table.",
    );
    checkpoints.push(
      "intake facades are service_role only; anon/authenticated denied; leads table default-deny",
    );

    // ------------------------------------------------------------------
    // 2. Project intake with an owned upload session; reference; idempotency.
    // ------------------------------------------------------------------
    const tokenA = hex(32);
    const sessionA = await rpc(service, "intake_create_upload_session", {
      target_token_hash: sha256(tokenA),
      target_identity_hash: sha256("identity-a"),
      ttl_seconds: 7200,
    });
    assert(sessionA?.ok === true, "Upload session creation failed.");
    created.sessions.push(sessionA.id);
    const objectPath = `${sessionA.id}/${crypto.randomUUID()}.jpg`;
    const upload = await service.storage
      .from("lead-intake")
      .upload(objectPath, new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), { contentType: "image/jpeg" });
    assert(!upload.error, `Quarantine upload failed: ${upload.error?.message ?? ""}`);
    const registered = await rpc(service, "intake_register_attachment", {
      target_session_id: sessionA.id,
      target_token_hash: sha256(tokenA),
      target_object_path: objectPath,
      target_original_filename: "site.jpg",
      target_mime_type: "image/jpeg",
      target_byte_size: 4,
      target_checksum: sha256("jpeg"),
      max_files: 5,
    });
    assert(registered?.ok === true, "Attachment registration failed.");
    const tokenB = hex(32);
    const foreign = await rpc(service, "intake_register_attachment", {
      target_session_id: sessionA.id,
      target_token_hash: sha256(tokenB),
      target_object_path: `${sessionA.id}/${crypto.randomUUID()}.jpg`,
      target_original_filename: "x.jpg",
      target_mime_type: "image/jpeg",
      target_byte_size: 4,
      target_checksum: sha256("x"),
      max_files: 5,
    });
    assert(
      hasReason(foreign, "not_authorized"),
      "A foreign token attached to another visitor's session.",
    );
    const anonObject = await anonymous.storage.from("lead-intake").download(objectPath);
    assert(Boolean(anonObject.error), "Anonymous fetched a quarantine object.");
    const anonList = await anonymous.storage.from("lead-intake").list(sessionA.id);
    assert(
      Boolean(anonList.error) || (anonList.data ?? []).length === 0,
      "Anonymous listed the quarantine bucket.",
    );
    checkpoints.push(
      "upload session ownership enforced; anon cannot list or fetch quarantine objects",
    );

    const idempotency = hex(16);
    const projectPayload = {
      lead_type: "project",
      source_channel: "start_a_project",
      idempotency_key: idempotency,
      full_name: `${marker} VISITOR`,
      email: "synthetic-c8-visitor@example.test",
      phone: "+250 780 000 111",
      summary: "Residential design",
      message: `${marker} project description`,
      service_key: "design",
      preferred_contact: "whatsapp",
      consent_revision: 1,
      upload_session_id: sessionA.id,
      upload_session_token_hash: sha256(tokenA),
      details: {
        need_key: "design",
        project_type: "residential",
        floors: "2",
        scale_band: "medium",
        current_stage: "idea",
        budget_preference: "not_sure",
      },
    };
    const first = await submit(service, projectPayload);
    assert(
      first?.ok === true && /^RENZ-LEAD-\d{4}-\d{6}$/u.test(first.reference),
      "Project intake failed.",
    );
    assert(first.id === undefined, "Public result exposed an internal id.");
    const again = await submit(service, projectPayload);
    assert(
      again?.ok === true && again.reference === first.reference && again.duplicate === true,
      "Idempotency failed.",
    );
    const leadRow = await admin
      .from("leads")
      .select("id, status, version, consent_revision")
      .eq("reference", first.reference)
      .single();
    assert(
      !leadRow.error && leadRow.data.status === "new" && leadRow.data.consent_revision === 1,
      "Lead row missing.",
    );
    const leadId = leadRow.data.id;
    created.leads.push(leadId);
    const attachments = await admin
      .from("lead_attachments")
      .select("id, scan_status")
      .eq("lead_id", leadId);
    assert(
      (attachments.data ?? []).length === 1 && attachments.data[0].scan_status === "pending_review",
      "Attachment not bound in quarantine.",
    );
    const reuse = await submit(service, {
      ...projectPayload,
      idempotency_key: hex(16),
      email: "synthetic-c8-reuse@example.test",
    });
    assert(hasReason(reuse, "expired_session"), "A consumed upload session was reused.");
    checkpoints.push(
      "project intake: RENZ-LEAD reference, idempotent repeat, attachment bound, consumed session refused",
    );

    // ------------------------------------------------------------------
    // 3. Service / material / general; validation; rate limiting.
    // ------------------------------------------------------------------
    const serviceLead = await submit(service, {
      lead_type: "service",
      source_channel: "service_page",
      idempotency_key: hex(16),
      full_name: `${marker} SERVICE`,
      phone: "+44 7000 000 222",
      summary: "Design enquiry",
      service_key: "design",
      consent_revision: 1,
      details: { requirement_text: `${marker} requirement`, preferred_timing: "Q3" },
    });
    assert(serviceLead?.ok === true, "Service enquiry failed.");
    const materialLead = await submit(service, {
      lead_type: "material",
      source_channel: "material_enquiry",
      idempotency_key: hex(16),
      full_name: `${marker} MATERIAL`,
      email: "synthetic-c8-material@example.test",
      summary: "Cement and steel",
      consent_revision: 1,
      details: {
        items: [
          { description: `${marker} cement 42.5`, quantity: "200", unit: "bag" },
          {
            description: `${marker} rebar 12mm`,
            quantity: "3",
            unit: "tonne",
            specification: "Grade 500",
          },
        ],
      },
    });
    assert(materialLead?.ok === true, "Material enquiry failed.");
    const generalLead = await submit(service, {
      lead_type: "general",
      source_channel: "website_contact",
      idempotency_key: hex(16),
      full_name: `${marker} CONTACT`,
      email: "synthetic-c8-contact@example.test",
      summary: "Hello",
      message: `${marker} message`,
      consent_revision: 1,
    });
    assert(generalLead?.ok === true, "General contact failed.");
    for (const reference of [
      serviceLead.reference,
      materialLead.reference,
      generalLead.reference,
    ]) {
      const row = await admin.from("leads").select("id").eq("reference", reference).single();
      created.leads.push(row.data.id);
    }
    const invalid = await submit(service, {
      lead_type: "general",
      source_channel: "website_contact",
      full_name: "X",
      summary: "S",
      consent_revision: 1,
    });
    assert(hasReason(invalid, "missing_contact_method"), "Missing contact method accepted.");
    const staffSource = await submit(service, {
      lead_type: "general",
      source_channel: "manual",
      full_name: "X",
      email: "x@example.test",
      summary: "S",
      consent_revision: 1,
    });
    assert(hasReason(staffSource, "invalid_input"), "Public submission claimed a staff source.");
    const purchaseOrders = await admin
      .from("purchase_orders")
      .select("id", { count: "exact", head: true });
    assert((purchaseOrders.count ?? 0) === 0, "A material enquiry created a purchase order.");
    checkpoints.push(
      "service / material / general enquiries stored; invalid inputs refused; no purchase order from a material enquiry",
    );

    const identity = sha256(`rate-${hex(4)}`);
    let allowedHits = 0;
    let refused = null;
    for (let index = 0; index < 4; index += 1) {
      const verdict = await rpc(service, "intake_rate_limit_hit", {
        target_identity_hash: identity,
        target_scope: "project",
        max_hits: 3,
        window_seconds: 3600,
      });
      if (verdict.allowed) allowedHits += 1;
      else refused = verdict;
    }
    assert(
      allowedHits === 3 && refused && refused.retry_after_seconds > 0,
      "Rate limiter did not stop at the threshold.",
    );
    const other = await rpc(service, "intake_rate_limit_hit", {
      target_identity_hash: sha256(`other-${hex(4)}`),
      target_scope: "project",
      max_hits: 3,
      window_seconds: 3600,
    });
    assert(other.allowed === true, "Another identity was affected by the limit.");
    const rawIp = await rpc(service, "intake_rate_limit_hit", {
      target_identity_hash: "203.0.113.7",
      target_scope: "project",
      max_hits: 3,
      window_seconds: 3600,
    });
    assert(rawIp.allowed === false, "A raw address was accepted as an identity.");
    const limitRows = await admin
      .from("intake_rate_limits")
      .select("identity_hash")
      .eq("identity_hash", identity);
    assert(
      (limitRows.data ?? []).every((row) => /^[0-9a-f]{64}$/u.test(row.identity_hash)),
      "Rate limit rows carry a non-hash identity.",
    );
    checkpoints.push(
      "rate limit: 3 hits allowed, 4th refused with retry window; other identity unaffected; hash-only storage",
    );

    // ------------------------------------------------------------------
    // 4. Negative security on the Lead CRM.
    // ------------------------------------------------------------------
    const anonList2 = await anonymous.rpc("admin_list_leads");
    assert(Boolean(anonList2.error), "Anonymous listed leads.");
    const anonDetail = await anonymous.rpc("admin_get_lead", { target_id: leadId });
    assert(Boolean(anonDetail.error), "Anonymous read a lead.");
    const anonAssign = await anonymous.rpc("assign_lead", {
      target_id: leadId,
      expected_version: 1,
    });
    assert(
      anonAssign.error || hasReason(anonAssign.data, "not_authorized"),
      "Anonymous assigned a lead.",
    );
    const anonConvert = await anonymous.rpc("convert_lead_to_client", {
      target_id: leadId,
      expected_version: 1,
    });
    assert(
      anonConvert.error || hasReason(anonConvert.data, "not_authorized"),
      "Anonymous converted a lead.",
    );
    const aal1List = await aal1.rpc("admin_list_leads");
    assert(Boolean(aal1List.error), "AAL1 staff listed leads.");
    const readList = await rpc(readOnly, "admin_list_leads");
    assert(Array.isArray(readList.items), "Read-only role could not list leads.");
    const readStatus = await rpc(readOnly, "change_lead_status", {
      target_id: leadId,
      expected_version: 1,
      target_status: "contacted",
    });
    assert(hasReason(readStatus, "not_authorized"), "leads.read changed a status.");
    const readAssign = await rpc(readOnly, "assign_lead", {
      target_id: leadId,
      expected_version: 1,
    });
    assert(hasReason(readAssign, "not_authorized"), "leads.read assigned a lead.");
    const readConvert = await rpc(readOnly, "convert_lead_to_client", {
      target_id: leadId,
      expected_version: 1,
    });
    assert(hasReason(readConvert, "not_authorized"), "leads.read converted a lead.");
    const readAttachment = await rpc(readOnly, "admin_lead_attachment_path", {
      target_attachment_id: attachments.data[0].id,
    });
    assert(readAttachment === null, "leads.read resolved an attachment path.");
    const malformed = await a.rpc("admin_get_lead", { target_id: "not-a-uuid" });
    assert(
      Boolean(malformed.error) && !/select|from|where/iu.test(malformed.error.message ?? ""),
      "Malformed uuid leaked SQL.",
    );
    const byReference = await anonymous.rpc("admin_list_leads", { search_query: first.reference });
    assert(Boolean(byReference.error), "A public reference acted as an authentication token.");
    checkpoints.push(
      "anon / AAL1 / read-only denied on every lead write and attachment path; malformed uuid is a typed error; reference is not a credential",
    );

    // ------------------------------------------------------------------
    // 5. Lead CRM lifecycle + two-staff conflict + duplicate awareness.
    // ------------------------------------------------------------------
    const detail = await rpc(a, "admin_get_lead", { target_id: leadId });
    assert(
      detail.lead.status === "new" && detail.project_details.project_type === "residential",
      "Lead 360 incomplete.",
    );
    assert(
      detail.attachments.length === 1 && detail.attachments[0].object_path === undefined,
      "Lead 360 exposed a storage path.",
    );
    const assigned = await rpc(a, "assign_lead", {
      target_id: leadId,
      expected_version: detail.lead.version,
      target_assignee: (await a.auth.getUser()).data.user.id,
    });
    assert(assigned.ok === true, "Assign to me failed.");
    const stale = await rpc(b, "assign_lead", {
      target_id: leadId,
      expected_version: detail.lead.version,
    });
    assert(
      hasReason(stale, "version_conflict") && stale.current_version === assigned.version,
      "Stale assignment accepted.",
    );
    const contact = await rpc(a, "log_lead_contact", {
      target_id: leadId,
      target_contact_type: "whatsapp",
      target_note: `${marker} first message`,
    });
    assert(contact.ok === true, "Contact log failed.");
    let version = contact.version;
    const contacted = await rpc(a, "change_lead_status", {
      target_id: leadId,
      expected_version: version,
      target_status: "contacted",
    });
    assert(contacted.ok === true, "new → contacted failed.");
    version = contacted.version;
    const qualified = await rpc(a, "change_lead_status", {
      target_id: leadId,
      expected_version: version,
      target_status: "qualified",
    });
    assert(qualified.ok === true, "contacted → qualified failed.");
    version = qualified.version;
    const wonEarly = await rpc(a, "change_lead_status", {
      target_id: leadId,
      expected_version: version,
      target_status: "won",
    });
    assert(hasReason(wonEarly, "invalid_state"), "Won accepted without a client.");
    const note = await rpc(a, "create_lead_note", {
      target_id: leadId,
      body: `${marker} private note`,
    });
    assert(note.ok === true, "Note failed.");
    const queue = await rpc(a, "admin_lead_action_queue", { limit_count: 20 });
    assert(
      queue.some((item) => item.kind === "qualified_without_client" && item.lead_id === leadId),
      "Action queue missed the qualified lead.",
    );
    const duplicateProbe = await submit(service, {
      lead_type: "general",
      source_channel: "website_contact",
      idempotency_key: hex(16),
      full_name: `${marker} VISITOR AGAIN`,
      email: "synthetic-c8-visitor@example.test",
      summary: "Follow-up",
      consent_revision: 1,
    });
    const duplicateRow = await admin
      .from("leads")
      .select("id")
      .eq("reference", duplicateProbe.reference)
      .single();
    created.leads.push(duplicateRow.data.id);
    const duplicateDetail = await rpc(a, "admin_get_lead", { target_id: duplicateRow.data.id });
    assert(
      duplicateDetail.possible_matches.leads.some(
        (match) => match.id === leadId && match.match_reason === "email",
      ),
      "Possible-match banner data missing.",
    );
    checkpoints.push(
      "Lead 360; assign to me; stale second-staff edit rejected; contact log + notes; stage moves; won gated; action queue; possible match by email",
    );

    // ------------------------------------------------------------------
    // 6. Conversion: idempotent + concurrent race; project; won.
    // ------------------------------------------------------------------
    const detailNow = await rpc(a, "admin_get_lead", { target_id: leadId });
    const [raceA, raceB] = await Promise.all([
      rpc(a, "convert_lead_to_client", {
        target_id: leadId,
        expected_version: detailNow.lead.version,
      }),
      rpc(b, "convert_lead_to_client", {
        target_id: leadId,
        expected_version: detailNow.lead.version,
      }),
    ]);
    const outcomes = [raceA, raceB];
    const createdOnes = outcomes.filter(
      (outcome) => outcome.ok === true && outcome.created === true,
    );
    const linkedOnes = outcomes.filter(
      (outcome) => outcome.ok === true && outcome.already_linked === true,
    );
    const conflicts = outcomes.filter((outcome) => hasReason(outcome, "version_conflict"));
    assert(
      createdOnes.length === 1 && linkedOnes.length + conflicts.length === 1,
      "Conversion race produced an unexpected outcome.",
    );
    const clientId = createdOnes[0].client_id;
    created.clients.push(clientId);
    const clientRows = await admin
      .from("clients")
      .select("id")
      .eq("email_normalized", "synthetic-c8-visitor@example.test");
    assert((clientRows.data ?? []).length === 1, "Conversion race created duplicate clients.");
    const afterConvert = await rpc(a, "admin_get_lead", { target_id: leadId });
    const projectFromLead = await rpc(a, "create_project_from_lead", {
      target_id: leadId,
      expected_version: afterConvert.lead.version,
      target_title: `${marker} RESIDENCE`,
      target_phase: "design",
    });
    assert(projectFromLead.ok === true, "Project creation from lead failed.");
    created.projects.push(projectFromLead.project_id);
    const originating = await rpc(a, "admin_project_originating_lead", {
      target_project_id: projectFromLead.project_id,
    });
    assert(
      originating?.reference === first.reference,
      "Project did not resolve its originating lead.",
    );
    const clientLeads = await rpc(a, "admin_client_leads", { target_client_id: clientId });
    assert(
      clientLeads.some((lead) => lead.id === leadId),
      "Client 360 lost the originating lead.",
    );
    const won = await rpc(a, "change_lead_status", {
      target_id: leadId,
      expected_version: projectFromLead.version,
      target_status: "won",
    });
    assert(won.ok === true, "Won failed after client + project.");
    const history = await admin
      .from("lead_stage_history")
      .select("from_status, to_status")
      .eq("lead_id", leadId)
      .order("changed_at");
    assert(
      (history.data ?? []).map((row) => row.to_status).join(">") === "new>contacted>qualified>won",
      "Stage history incomplete.",
    );
    checkpoints.push(
      "concurrent conversions: exactly one client; project from lead with staff-chosen phase; originating-lead links both ways; won; full stage history",
    );

    // ------------------------------------------------------------------
    // 7. Material bridge: requirements, never purchase orders.
    // ------------------------------------------------------------------
    const materialRow = await admin
      .from("leads")
      .select("id, version")
      .eq("reference", materialLead.reference)
      .single();
    const materialClient = await rpc(a, "convert_lead_to_client", {
      target_id: materialRow.data.id,
      expected_version: materialRow.data.version,
    });
    created.clients.push(materialClient.client_id);
    const materialProject = await rpc(a, "create_project_from_lead", {
      target_id: materialRow.data.id,
      expected_version: materialClient.version,
      target_title: `${marker} MATERIAL PROJECT`,
      target_phase: "procurement",
    });
    created.projects.push(materialProject.project_id);
    const requirements = await rpc(a, "create_material_requirements_from_lead", {
      target_id: materialRow.data.id,
      expected_version: materialProject.version,
      items: [
        { item_name: `${marker} cement 42.5`, quantity: 200, unit: "bag", priority: "medium" },
      ],
    });
    assert(
      requirements.ok === true && requirements.created === 1,
      "Material requirement bridge failed.",
    );
    const requirementRows = await admin
      .from("project_material_requirements")
      .select("id, approval_state")
      .eq("operational_project_id", materialProject.project_id);
    assert(
      (requirementRows.data ?? []).length === 1 &&
        requirementRows.data[0].approval_state === "draft",
      "Requirement not created as a draft.",
    );
    const poAfter = await admin
      .from("purchase_orders")
      .select("id", { count: "exact", head: true });
    assert((poAfter.count ?? 0) === 0, "The bridge created a purchase order.");
    checkpoints.push(
      "one enquiry item → one draft project material requirement; still zero purchase orders",
    );

    // ------------------------------------------------------------------
    // 8. Lost with reason, archive, quick find, overview, audit, realtime.
    // ------------------------------------------------------------------
    const generalRow = await admin
      .from("leads")
      .select("id, version")
      .eq("reference", generalLead.reference)
      .single();
    const lostNoReason = await rpc(a, "change_lead_status", {
      target_id: generalRow.data.id,
      expected_version: generalRow.data.version,
      target_status: "lost",
    });
    assert(hasReason(lostNoReason, "invalid_input"), "Lost accepted without a reason.");
    const lost = await rpc(a, "change_lead_status", {
      target_id: generalRow.data.id,
      expected_version: generalRow.data.version,
      target_status: "lost",
      target_reason_code: "not_ready",
      target_note: `${marker} lost note`,
    });
    assert(lost.ok === true, "Lost failed.");
    const archived = await rpc(a, "archive_lead", {
      target_id: generalRow.data.id,
      expected_version: lost.version,
    });
    assert(archived.ok === true, "Archive failed.");
    const quickFind = await rpc(a, "admin_global_quick_find", { search_query: first.reference });
    assert(
      quickFind.some((item) => item.kind === "lead" && item.id === leadId),
      "Quick Find did not resolve the lead.",
    );
    const quickFindDenied = await aal1.rpc("admin_global_quick_find", {
      search_query: first.reference,
    });
    assert(
      Boolean(quickFindDenied.error) ||
        !(quickFindDenied.data ?? []).some((item) => item.kind === "lead"),
      "AAL1 quick find exposed a lead.",
    );
    const overview = await rpc(a, "admin_leads_overview");
    assert(overview.won_30d_count >= 1 && overview.lost_30d_count >= 1, "Overview counts are off.");
    const audit = await admin
      .from("audit_logs")
      .select("action, metadata")
      .like("action", "lead.%");
    const auditText = JSON.stringify((audit.data ?? []).map((row) => row.metadata));
    assert(
      !auditText.includes("synthetic-c8-visitor@example.test") &&
        !auditText.includes("private note") &&
        !auditText.includes("lost note") &&
        !auditText.includes("project description"),
      "Audit metadata leaked contact data or bodies.",
    );
    for (const action of [
      "lead.public_submit",
      "lead.assign",
      "lead.status_change",
      "lead.contact_log",
      "lead.note_create",
      "lead.convert_client",
      "lead.convert_project",
      "lead.material_requirements_create",
      "lead.archive",
    ]) {
      assert(
        (audit.data ?? []).some((row) => row.action === action),
        `Audit action missing: ${action}`,
      );
    }
    const pointers = await admin
      .from("realtime_events")
      .select("entity_type, action, entity_id")
      .eq("entity_type", "lead");
    assert(
      (pointers.data ?? []).some((row) => row.action === "submitted") &&
        (pointers.data ?? []).some((row) => row.action === "converted"),
      "Lead realtime pointers missing.",
    );
    assert(
      (pointers.data ?? []).every((row) =>
        Object.keys(row).every((key) => ["entity_type", "action", "entity_id"].includes(key)),
      ),
      "Pointer carried extra fields.",
    );
    checkpoints.push(
      "lost requires reason; archive separate from lost; quick find LEAD; overview counts; audit redacted and complete; value-free realtime pointers",
    );

    // ------------------------------------------------------------------
    // 9. Cleanup tooling: expired session purge.
    // ------------------------------------------------------------------
    const tokenC = hex(32);
    const sessionC = await rpc(service, "intake_create_upload_session", {
      target_token_hash: sha256(tokenC),
      target_identity_hash: sha256("identity-c"),
      ttl_seconds: 60,
    });
    created.sessions.push(sessionC.id);
    runLocalSql(
      `update public.lead_upload_sessions set expires_at = now() - interval '1 hour' where id = '${sessionC.id}';`,
      "expire synthetic session",
    );
    const expiredList = await rpc(service, "intake_expired_upload_sessions", { limit_count: 50 });
    assert(
      expiredList.some((session) => session.id === sessionC.id),
      "Expired session not listed.",
    );
    const purged = await rpc(service, "intake_purge_upload_session", {
      target_session_id: sessionC.id,
    });
    assert(purged.ok === true, "Expired session purge failed.");
    const consumedPurge = await rpc(service, "intake_purge_upload_session", {
      target_session_id: sessionA.id,
    });
    assert(hasReason(consumedPurge, "invalid_state"), "A submitted session was purgeable.");
    checkpoints.push(
      "expired unsubmitted upload sessions listed and purged; submitted sessions protected",
    );

    console.log(JSON.stringify({ ok: true, checkpoints }));
  } finally {
    await service.storage
      .from("lead-intake")
      .remove(created.sessions.map((id) => `${id}/`))
      .catch(() => null);
    const list = await service.storage.from("lead-intake").list("", { limit: 1000 });
    for (const folder of list.data ?? []) {
      if (!created.sessions.includes(folder.name)) continue;
      const files = await service.storage.from("lead-intake").list(folder.name, { limit: 1000 });
      const paths = (files.data ?? []).map((file) => `${folder.name}/${file.name}`);
      if (paths.length > 0) await service.storage.from("lead-intake").remove(paths);
    }
    runLocalSql(
      `delete from public.project_material_requirements where operational_project_id in (select id from public.operational_projects where title like '${marker}%');
       delete from public.lead_attachments where lead_id in (select id from public.leads where full_name like '${marker}%') or upload_session_id in (select id from public.lead_upload_sessions where lead_id is null);
       delete from public.leads where full_name like '${marker}%';
       delete from public.lead_upload_sessions where lead_id is null or lead_id not in (select id from public.leads);
       delete from public.operational_projects where title like '${marker}%';
       delete from public.clients where full_name like '${marker}%';
       delete from public.intake_rate_limits;
       delete from public.audit_logs where action like 'lead.%' or (entity_type in ('client', 'operational_project') and metadata::text like '%${marker}%');
       delete from public.realtime_events where entity_type = 'lead';
       delete from public.user_roles where role_id in (select id from public.roles where key = '${readRole}');
       delete from public.role_permissions where role_id in (select id from public.roles where key = '${readRole}');
       delete from public.roles where key = '${readRole}';`,
      "C8 synthetic cleanup",
    );
    for (const email of [emailA, emailB, emailRead, emailAal1]) {
      await removeUserByEmail(email);
    }
  }
}

verifyC8().catch((error) => {
  console.error(error instanceof Error ? error.message : "C8 verification failed.");
  process.exit(1);
});
