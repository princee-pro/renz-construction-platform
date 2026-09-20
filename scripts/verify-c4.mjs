import {
  admin,
  client,
  createActor,
  credentials,
  removeUserByEmail,
  rpc,
  signInAndActivate,
} from "./c4-local.mjs";
import { assert } from "./s4-local.mjs";

// Bounded synthetic RPC-level end-to-end proof of the C4 Client CRM +
// Operational Project Management workflow. Complements (does not duplicate)
// supabase/tests/database/011_c4_control_room.sql, which already covers
// function-level shape/permission/version-conflict assertions. This script
// proves the full real-actor lifecycle through the RPC facade a signed-in
// browser session actually calls: client create -> project create -> status
// & phase transitions -> note -> public case-study draft (privacy-checked)
// -> link -> archive project -> archive client -> synthetic cleanup, plus
// the required public-privacy-invariant and anonymous-denial regressions.

const actorEmail = "c4-synthetic-admin@example.test";
const actorPassword = ["Local", "C4", "Control", "Room", "Passphrase", "2026", "!"].join("-");

// Default-deny tables answer anon with a permission error (data null) or, at
// most, an empty set. Either is a correct denial; rows are the only failure.
function anonDenied(result) {
  return Boolean(result.error) || !Array.isArray(result.data) || result.data.length === 0;
}

function reasons(result) {
  return Array.isArray(result?.reasons) ? result.reasons : [];
}
function hasReason(result, code, field) {
  return reasons(result).some(
    (r) => r?.code === code && (field === undefined || r?.field === field),
  );
}

async function verifyC4() {
  let clientId;
  let projectId;
  let caseStudyId;

  try {
    // 1. Create a synthetic AAL2 admin staff member (the "admin" role already
    //    holds clients.read/write + operations.projects.read/write, seeded by
    //    the C4 migration — no bespoke role is needed).
    await createActor(actorEmail, actorPassword, "admin");
    const operator = await signInAndActivate(actorEmail, actorPassword);
    const anonymous = client(credentials.anonymousKey);

    // 2-3. Create "SYNTHETIC C4 CLIENT", Tier VIP, with contact details.
    const createdClient = await rpc(operator, "create_admin_client", {
      full_name: "SYNTHETIC C4 CLIENT",
      target_email: "synthetic-c4-client@example.test",
      target_phone: "+250780000001",
      target_tier: "vip",
    });
    assert(createdClient?.ok === true, "Client creation failed.");
    clientId = createdClient.id;

    // Negative: anon cannot read clients at all.
    const anonClientRead = await anonymous.from("clients").select("id").limit(1);
    assert(anonDenied(anonClientRead), "Anonymous caller could read the clients table.");
    const anonClientRpc = await anonymous.rpc("admin_get_client", { target_id: clientId });
    assert(
      anonClientRpc.data === null || anonClientRpc.error,
      "Anonymous caller resolved a client via RPC.",
    );

    // 4-6. Open Client 360, create "SYNTHETIC C4 PROJECT" (Planning / Design /
    //      High priority, valid dates, RWF budget), verify it is listed.
    const createdProject = await rpc(operator, "create_admin_operational_project", {
      target_client_id: clientId,
      title: "SYNTHETIC C4 PROJECT",
      target_status: "planning",
      target_phase: "design",
      target_priority: "high",
      target_start_date: "2026-01-01",
      target_end_date: "2026-12-31",
      target_budget_amount: 5_000_000,
      target_budget_currency: "rwf",
    });
    assert(createdProject?.ok === true, "Operational project creation failed.");
    projectId = createdProject.id;

    let clientDetail = await rpc(operator, "admin_get_client", { target_id: clientId });
    assert(
      clientDetail.projects.some((row) => row.id === projectId),
      "Client 360 did not list the new project.",
    );

    // 7-8. Open the project, change Planning -> In Progress, Design -> Planning.
    let projectDetail = await rpc(operator, "admin_get_operational_project", {
      target_id: projectId,
    });
    assert(
      projectDetail.project.budget_currency === "RWF",
      "Currency was not normalized to uppercase.",
    );
    const statusChanged = await rpc(operator, "change_operational_project_status", {
      target_id: projectId,
      expected_version: projectDetail.project.version,
      next_status: "in_progress",
    });
    assert(statusChanged?.ok === true, "Status change failed.");
    const phaseChanged = await rpc(operator, "change_operational_project_phase", {
      target_id: projectId,
      expected_version: statusChanged.version,
      next_phase: "planning",
    });
    assert(phaseChanged?.ok === true, "Phase change failed.");

    // 9. Confirm status/phase history.
    projectDetail = await rpc(operator, "admin_get_operational_project", { target_id: projectId });
    assert(
      projectDetail.status_history.length === 2,
      "Status history did not record both transitions.",
    );
    assert(
      projectDetail.phase_history.length === 2,
      "Phase history did not record both transitions.",
    );
    assert(
      projectDetail.status_history[0].to_status === "in_progress",
      "Most recent status history row was not the latest transition.",
    );

    // Concurrency: reusing a stale expected_version must be rejected, not
    // silently overwritten.
    const staleUpdate = await rpc(operator, "change_operational_project_priority", {
      target_id: projectId,
      expected_version: 1,
      next_priority: "low",
    });
    assert(hasReason(staleUpdate, "version_conflict"), "A stale version was not rejected.");

    // 10. Add a project note.
    const noted = await rpc(operator, "create_operational_project_note", {
      target_project_id: projectId,
      body: "SYNTHETIC C4 project note.",
    });
    assert(noted?.ok === true, "Project note creation failed.");

    // 11. Create a public case-study draft from the project; confirm no
    //     client PII was copied onto the public record.
    const draft = await rpc(operator, "create_case_study_draft_from_operational_project", {
      target_id: projectId,
      expected_version: phaseChanged.version,
      target_locale: "en",
      target_slug: "synthetic-c4-case-study",
      target_title: "SYNTHETIC C4 CASE STUDY",
    });
    assert(draft?.ok === true, "Case study draft creation failed.");
    // `id` is the operational project (as with every project command);
    // the newly created public draft is returned separately.
    caseStudyId = draft.case_study_id;
    assert(typeof caseStudyId === "string", "Draft result did not carry case_study_id.");

    const publicDraftRow = await admin
      .from("projects")
      .select("id")
      .eq("id", caseStudyId)
      .maybeSingle();
    assert(!publicDraftRow.error && publicDraftRow.data, "Draft case study row was not created.");
    const publicColumns = await admin.from("projects").select("*").eq("id", caseStudyId).single();
    const serializedPublicRow = JSON.stringify(publicColumns.data);
    for (const forbidden of [
      "SYNTHETIC C4 CLIENT",
      "synthetic-c4-client@example.test",
      "+250780000001",
      "5000000",
    ]) {
      assert(
        !serializedPublicRow.includes(forbidden),
        `Public case study row unexpectedly contained "${forbidden}".`,
      );
    }

    // 12-13. Verify the bridge relationship in both directions.
    projectDetail = await rpc(operator, "admin_get_operational_project", { target_id: projectId });
    assert(
      projectDetail.case_study?.id === caseStudyId,
      "Project did not report the linked case study.",
    );
    const caseStudyRow = await admin
      .from("operational_projects")
      .select("id")
      .eq("public_case_study_id", caseStudyId)
      .maybeSingle();
    assert(
      !caseStudyRow.error && caseStudyRow.data?.id === projectId,
      "Reverse lookup from case study to operational project failed.",
    );

    // A second project can never claim the same case study (unique bridge).
    const secondProject = await rpc(operator, "create_admin_operational_project", {
      target_client_id: clientId,
      title: "SYNTHETIC C4 SECOND PROJECT",
    });
    assert(secondProject?.ok === true, "Second synthetic project creation failed.");
    const doubleLink = await rpc(operator, "link_operational_project_case_study", {
      target_id: secondProject.id,
      expected_version: secondProject.version,
      target_case_study_id: caseStudyId,
    });
    assert(
      hasReason(doubleLink, "already_linked"),
      "A case study was linked to two projects at once.",
    );
    await admin.from("operational_projects").delete().eq("id", secondProject.id);

    // 14. Public privacy invariant: the anonymous public API never exposes
    //     client identity, contact details, budget, or private notes.
    const publicLocalization = await anonymous
      .from("project_localizations")
      .select("*")
      .eq("project_id", caseStudyId)
      .maybeSingle();
    if (publicLocalization.data) {
      const serializedLocalization = JSON.stringify(publicLocalization.data);
      for (const forbidden of [
        "SYNTHETIC C4 CLIENT",
        "synthetic-c4-client@example.test",
        "+250780000001",
      ]) {
        assert(
          !serializedLocalization.includes(forbidden),
          `Public localization unexpectedly contained "${forbidden}".`,
        );
      }
    }
    const anonProjectRead = await anonymous.from("operational_projects").select("id").limit(1);
    assert(anonDenied(anonProjectRead), "Anonymous caller could read operational_projects.");
    const anonNotesRead = await anonymous.from("operational_project_notes").select("id").limit(1);
    assert(anonDenied(anonNotesRead), "Anonymous caller could read operational_project_notes.");

    // 15-16. Archive the project, then the client.
    projectDetail = await rpc(operator, "admin_get_operational_project", { target_id: projectId });
    const projectArchived = await rpc(operator, "archive_admin_operational_project", {
      target_id: projectId,
      expected_version: projectDetail.project.version,
    });
    assert(projectArchived?.ok === true, "Project archive failed.");

    clientDetail = await rpc(operator, "admin_get_client", { target_id: clientId });
    const clientArchived = await rpc(operator, "archive_admin_client", {
      target_id: clientId,
      expected_version: clientDetail.client.version,
    });
    assert(clientArchived?.ok === true, "Client archive failed.");

    // 17. Confirm history remains after archiving.
    projectDetail = await rpc(operator, "admin_get_operational_project", { target_id: projectId });
    assert(projectDetail.status_history.length === 2, "Status history was lost after archiving.");
    assert(projectDetail.client.id === clientId, "Archived project lost its client relationship.");

    // Archived client must not appear in the active-client picker.
    const picker = await rpc(operator, "admin_list_active_clients_for_picker", {
      search_query: "SYNTHETIC C4 CLIENT",
    });
    assert(
      !picker.some((row) => row.id === clientId),
      "Archived client still appeared in the active-client picker.",
    );

    console.log(
      JSON.stringify({
        ok: true,
        clientId,
        projectId,
        caseStudyId,
        checkpoints: [
          "synthetic AAL2 admin staff created",
          "client created (VIP tier, email+phone)",
          "anonymous cannot read or resolve clients",
          "operational project created against the client, currency normalized",
          "client 360 lists the new project",
          "status changed planning -> in_progress",
          "phase changed design -> planning",
          "status/phase history recorded both transitions in order",
          "stale version rejected as version_conflict",
          "project note created",
          "public case-study draft created with no client PII copied",
          "bridge relationship verified in both directions",
          "case study cannot be linked to a second project (unique bridge)",
          "public privacy invariant: no client PII on the public projection",
          "anonymous cannot read operational_projects or their notes",
          "project archived, client archived",
          "history survives archiving",
          "archived client excluded from the active-client picker",
        ],
      }),
    );
  } finally {
    const cleanupFailures = [];
    const steps = [
      async () => {
        if (caseStudyId) {
          await admin.from("project_localizations").delete().eq("project_id", caseStudyId);
          await admin.from("projects").delete().eq("id", caseStudyId);
        }
      },
      async () => {
        if (projectId) {
          await admin
            .from("operational_project_status_history")
            .delete()
            .eq("project_id", projectId);
          await admin
            .from("operational_project_phase_history")
            .delete()
            .eq("project_id", projectId);
          await admin.from("operational_project_notes").delete().eq("project_id", projectId);
          await admin.from("operational_projects").delete().eq("id", projectId);
        }
      },
      async () => {
        if (clientId) {
          await admin.from("client_notes").delete().eq("client_id", clientId);
          await admin.from("clients").delete().eq("id", clientId);
        }
      },
      async () => {
        await admin
          .from("audit_logs")
          .delete()
          .in("entity_id", [clientId, projectId, caseStudyId].filter(Boolean));
      },
      () => removeUserByEmail(actorEmail),
    ];
    for (const step of steps) {
      try {
        await step();
      } catch {
        cleanupFailures.push("cleanup step failed");
      }
    }
    if (cleanupFailures.length > 0) {
      console.error(
        "One or more synthetic C4 cleanup steps failed; no sensitive detail was logged.",
      );
      process.exitCode = 1;
    }
  }
}

try {
  await verifyC4();
} catch (error) {
  console.error(error instanceof Error ? error.message : "C4 verification failed.");
  process.exitCode = 1;
}
