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

// C7 configuration: synthetic settings lifecycle at RPC level — draft →
// publish → public projection, WhatsApp texting-only, location publish /
// unpublish, SEO, legal draft / publish, document defaults, thresholds, site
// mode gate, conflicts, negative security — plus the historical-document
// invariant (an issued invoice and purchase order keep their snapshots). The
// authorized baseline is captured first and restored byte-for-byte at the end.

const emailA = "c7-synthetic-a@example.test";
const emailB = "c7-synthetic-b@example.test";
const emailAal1 = "c7-synthetic-aal1@example.test";
const password = ["Local", "C7", "Settings", "Passphrase", "2026", "!"].join("-");
const today = new Date().toISOString().slice(0, 10);

const settingsTables = [
  "business_profile",
  "contact_channels",
  "business_location",
  "business_hours",
  "social_links",
  "website_settings",
  "navigation_settings",
  "brand_media_settings",
  "seo_settings",
  "legal_pages",
  "legal_page_revisions",
  "document_defaults",
  "operational_settings",
  "settings_domain_versions",
  "public_configuration_snapshots",
];

function reasons(result) {
  return Array.isArray(result?.reasons) ? result.reasons : [];
}
function hasReason(result, code) {
  return reasons(result).some((r) => r?.code === code);
}
function sqlLiteral(value) {
  return `'${JSON.stringify(value).replace(/'/gu, "''")}'`;
}

async function captureBaseline() {
  const baseline = {};
  for (const table of settingsTables) {
    const result = await admin.from(table).select("*");
    assert(!result.error, `Could not capture ${table}: ${result.error?.message ?? ""}`);
    baseline[table] = result.data ?? [];
  }
  return baseline;
}

function restoreBaseline(baseline) {
  // Delete children before parents; restore parents before children.
  const deleteOrder = [
    "legal_page_revisions",
    "public_configuration_snapshots",
    "contact_channels",
    "social_links",
    ...settingsTables.filter(
      (t) =>
        ![
          "legal_page_revisions",
          "public_configuration_snapshots",
          "contact_channels",
          "social_links",
        ].includes(t),
    ),
  ];
  const statements = ["set session_replication_role = replica;"];
  for (const table of deleteOrder) statements.push(`delete from public.${table};`);
  for (const table of settingsTables) {
    if (baseline[table].length === 0) continue;
    statements.push(
      `insert into public.${table} select * from jsonb_populate_recordset(null::public.${table}, ${sqlLiteral(baseline[table])}::jsonb);`,
    );
  }
  statements.push(
    `delete from public.audit_logs where entity_type = 'settings' or action like 'staff.%';`,
    `delete from public.realtime_events where entity_type = 'settings';`,
  );
  runLocalSql(statements.join("\n"), "C7 settings baseline restore");
}

async function verifyC7() {
  const baseline = await captureBaseline();
  const created = { clients: [], projects: [], partners: [], invoices: [], orders: [] };
  try {
    await createActor(emailA, password, "super_admin");
    await createActor(emailB, password, "admin");
    await createActor(emailAal1, password, "admin");
    const a = await signInAndActivate(emailA, password);
    const b = await signInAndActivate(emailB, password);
    const anonymous = client(credentials.anonymousKey);
    const aal1 = client(credentials.publishableKey);
    const aal1SignIn = await aal1.auth.signInWithPassword({ email: emailAal1, password });
    assert(!aal1SignIn.error, "AAL1 synthetic sign-in failed.");

    // ------------------------------------------------------------------
    // Historical documents: an issued invoice and PO before any change.
    // ------------------------------------------------------------------
    const clientRow = await rpc(a, "create_admin_client", {
      full_name: "SYNTHETIC C7 CLIENT",
      target_email: "synthetic-c7-client@example.test",
    });
    created.clients.push(clientRow.id);
    const project = await rpc(a, "create_admin_operational_project", {
      target_client_id: clientRow.id,
      title: "SYNTHETIC C7 PROJECT",
    });
    created.projects.push(project.id);
    const supplier = await rpc(a, "create_admin_trade_partner", {
      target_display_name: "SYNTHETIC C7 SUPPLIER",
      target_capabilities: ["supplier"],
      target_email: "synthetic-c7-supplier@example.test",
    });
    created.partners.push(supplier.id);
    const invoice = await rpc(a, "create_admin_invoice", {
      target_client_id: clientRow.id,
      target_project_id: project.id,
      target_currency: "RWF",
      target_tax_rate: 0,
      lines: [
        { description: "SYNTHETIC line", quantity: "1", unit_label: "item", unit_price: "1000" },
      ],
    });
    created.invoices.push(invoice.id);
    const issuedInvoice = await rpc(a, "issue_admin_invoice", {
      target_id: invoice.id,
      expected_version: invoice.version,
      target_issue_date: today,
      target_due_date: today,
    });
    assert(issuedInvoice?.ok === true, "Historical invoice could not be issued.");
    const po = await rpc(a, "create_admin_purchase_order", {
      target_project_id: project.id,
      target_supplier_id: supplier.id,
      target_currency: "RWF",
      target_tax_rate: 0,
      lines: [
        { description: "SYNTHETIC cement", quantity: "1", unit_label: "bag", unit_price: "1000" },
      ],
    });
    created.orders.push(po.id);
    const issuedPo = await rpc(a, "issue_admin_purchase_order", {
      target_id: po.id,
      expected_version: po.version,
      target_issue_date: today,
    });
    assert(issuedPo?.ok === true, "Historical PO could not be issued.");
    const invoiceBefore = (await rpc(a, "admin_get_invoice", { target_id: invoice.id })).document;
    const poBefore = (await rpc(a, "admin_get_purchase_order", { target_id: po.id })).document;
    assert(
      invoiceBefore.issuer.name && poBefore.issuer.name,
      "Issuer snapshots missing before the change.",
    );

    // ------------------------------------------------------------------
    // 1–6. Edit business profile as draft; public unchanged; publish; changes.
    // ------------------------------------------------------------------
    const business = await rpc(b, "admin_get_business_settings");
    const publicBefore = (await anonymous.rpc("public_site_configuration")).data;
    const draft = await rpc(b, "update_business_profile", {
      expected_version: business.profile.version,
      target_display_name: "SYNTHETIC C7 BUSINESS",
      target_primary_email: "synthetic-c7-public@example.test",
      target_short_name: "SYN",
      target_tagline: "SYNTHETIC tagline",
      target_public_description: "SYNTHETIC description",
    });
    assert(draft?.ok === true, "Business profile draft failed.");
    const publicStill = (await anonymous.rpc("public_site_configuration")).data;
    assert(
      JSON.stringify(publicStill?.business ?? null) ===
        JSON.stringify(publicBefore?.business ?? null),
      "A draft edit changed the public projection before publish.",
    );
    // 11–12. WhatsApp channel: wa.me only, no tel:
    const whatsapp = await rpc(b, "upsert_contact_channel", {
      expected_version: business.domain_versions.contact_channels,
      target_channel_type: "whatsapp",
      target_label: "WhatsApp",
      target_value: "+44 7412 853143",
      target_purpose: "SYNTHETIC enquiries",
    });
    assert(whatsapp?.ok === true, "WhatsApp channel failed.");
    const emailChannel = await rpc(b, "upsert_contact_channel", {
      expected_version: whatsapp.version,
      target_channel_type: "email",
      target_label: "Email",
      target_value: "synthetic-c7-public@example.test",
    });
    assert(emailChannel?.ok === true, "Email channel failed.");
    const scriptUrl = await rpc(b, "upsert_contact_channel", {
      expected_version: emailChannel.version,
      target_channel_type: "maps",
      target_label: "Map",
      target_value: "javascript:alert(1)",
    });
    assert(hasReason(scriptUrl, "invalid_input"), "A javascript: URL was accepted.");
    // 13. Location + maps URL
    const location = await rpc(b, "update_business_location", {
      expected_version: business.location.version,
      target_publish: true,
      target_public_name: "SYNTHETIC HQ",
      target_street: "SYNTHETIC 1 Example Street",
      target_city: "Kigali",
      target_country: "Rwanda",
      target_maps_url: "https://maps.example.test/synthetic",
      target_directions_url: "https://maps.example.test/synthetic/directions",
    });
    assert(location?.ok === true, "Location update failed.");
    // 17. SEO + website
    const website = await rpc(b, "admin_get_website_settings");
    const seo = await rpc(b, "update_seo_settings", {
      expected_version: website.seo.version,
      target_site_name: "SYNTHETIC SITE",
      target_title_template: "%s | SYNTHETIC",
      target_meta_description:
        "SYNTHETIC meta description that is comfortably long enough for the readiness check.",
    });
    assert(seo?.ok === true, "SEO update failed.");
    const site = await rpc(b, "update_website_settings", {
      expected_version: website.website.version,
      target_homepage_cta_label: "SYNTHETIC CTA",
      target_homepage_cta_route: "contact",
      target_canonical_base_url: "https://synthetic.example.test",
      target_footer_statement: "SYNTHETIC footer statement",
    });
    assert(site?.ok === true, "Website update failed.");
    const nav = await rpc(b, "update_navigation_settings", {
      expected_version: website.domain_versions.navigation,
      items: [
        { route_key: "insights", visible: false },
        { route_key: "about", label: "SYNTHETIC Studio" },
      ],
    });
    assert(nav?.ok === true, "Navigation update failed.");
    // 5. Publish
    const published = await rpc(b, "publish_public_configuration", { note: "SYNTHETIC publish" });
    assert(published?.ok === true, "Publish failed.");
    // 6. Public projection changes; 8. footer/contact data; 12. no tel:
    const publicAfter = (await anonymous.rpc("public_site_configuration")).data;
    assert(
      publicAfter?.business?.display_name === "SYNTHETIC C7 BUSINESS",
      "Published display name missing.",
    );
    assert(
      publicAfter?.contact?.primary_email === "synthetic-c7-public@example.test",
      "Published email missing.",
    );
    assert(
      publicAfter?.contact?.whatsapp_digits === "447412853143",
      "Published WhatsApp digits missing.",
    );
    const publicText = JSON.stringify(publicAfter);
    assert(publicText.includes("https://wa.me/447412853143"), "wa.me href missing.");
    assert(!publicText.includes("tel:"), "A tel: link was published without calling enabled.");
    assert(
      publicAfter?.location?.city === "Kigali" && publicAfter.location.maps_url,
      "Published location missing.",
    );
    assert(publicAfter?.seo?.site_name === "SYNTHETIC SITE", "Published SEO missing.");
    assert(
      publicAfter?.website?.footer_statement === "SYNTHETIC footer statement",
      "Published footer statement missing.",
    );
    assert(
      publicAfter?.navigation?.some(
        (n) => n.route_key === "about" && n.label === "SYNTHETIC Studio",
      ) && publicAfter.navigation.some((n) => n.route_key === "insights" && n.visible === false),
      "Published navigation overrides missing.",
    );
    for (const forbidden of [
      "invoice_tax",
      "po_tax",
      "ending_soon",
      "draft_body",
      "account_status",
      "published_by",
      "SYNTHETIC enquiries",
    ]) {
      assert(!publicText.includes(forbidden), `Public projection leaked "${forbidden}".`);
    }
    for (const table of settingsTables) {
      const probe = await anonymous.from(table).select("*").limit(1);
      assert(probe.error || !probe.data?.length, `Anonymous caller could read ${table}.`);
    }
    // 9–10. Historical invoice / PO unchanged
    const invoiceAfter = (await rpc(a, "admin_get_invoice", { target_id: invoice.id })).document;
    const poAfter = (await rpc(a, "admin_get_purchase_order", { target_id: po.id })).document;
    assert(
      JSON.stringify(invoiceAfter) === JSON.stringify(invoiceBefore),
      "The historical invoice changed after settings publish.",
    );
    assert(
      JSON.stringify(poAfter) === JSON.stringify(poBefore),
      "The historical PO changed after settings publish.",
    );
    assert(
      invoiceAfter.issuer.name !== "SYNTHETIC C7 BUSINESS",
      "Historical issuer snapshot was rewritten.",
    );
    // New drafts issued now carry the new issuer.
    const newInvoice = await rpc(a, "create_admin_invoice", {
      target_client_id: clientRow.id,
      target_currency: "RWF",
      target_tax_rate: 0,
      lines: [
        { description: "SYNTHETIC after", quantity: "1", unit_label: "item", unit_price: "10" },
      ],
    });
    created.invoices.push(newInvoice.id);
    const issuedNew = await rpc(a, "issue_admin_invoice", {
      target_id: newInvoice.id,
      expected_version: newInvoice.version,
      target_issue_date: today,
      target_due_date: today,
    });
    assert(issuedNew?.ok === true, "New invoice could not be issued.");
    const newDoc = (await rpc(a, "admin_get_invoice", { target_id: newInvoice.id })).document;
    assert(
      newDoc.issuer.name === "SYNTHETIC C7 BUSINESS",
      "A new invoice did not take the published issuer.",
    );

    // 15–16. Unpublish location → card disappears after re-publish
    const loc = (await rpc(b, "admin_get_business_settings")).location;
    const unpublish = await rpc(b, "update_business_location", {
      expected_version: loc.version,
      target_publish: false,
      target_street: "SYNTHETIC 1 Example Street",
      target_city: "Kigali",
    });
    assert(unpublish?.ok === true, "Location unpublish failed.");
    assert(
      (await anonymous.rpc("public_site_configuration")).data?.location?.city === "Kigali",
      "Location vanished before re-publish.",
    );
    assert((await rpc(b, "publish_public_configuration"))?.ok === true, "Re-publish failed.");
    assert(
      !(await anonymous.rpc("public_site_configuration")).data?.location,
      "Location still published after re-publish.",
    );

    // 19–22. Legal draft / publish
    const legal = await rpc(b, "admin_get_legal_pages");
    const privacy = legal.pages.find((p) => p.slug === "privacy");
    assert(
      (await anonymous.rpc("public_legal_page", { target_slug: "privacy" })).data === null,
      "Privacy is public before publish.",
    );
    const legalDraft = await rpc(b, "update_legal_page_draft", {
      target_slug: "privacy",
      expected_version: privacy.version,
      target_title: "SYNTHETIC Privacy",
      target_body:
        "SYNTHETIC reviewed privacy body. Enquiries and project submissions are stored privately.",
    });
    assert(legalDraft?.ok === true, "Legal draft failed.");
    const publishByAdmin = await rpc(b, "publish_legal_page", {
      target_slug: "privacy",
      expected_version: legalDraft.version,
    });
    assert(
      hasReason(publishByAdmin, "not_authorized"),
      "An admin without settings.legal.publish published a legal page.",
    );
    assert(
      (await anonymous.rpc("public_legal_page", { target_slug: "privacy" })).data === null,
      "Draft became public.",
    );
    const legalPublished = await rpc(a, "publish_legal_page", {
      target_slug: "privacy",
      expected_version: legalDraft.version,
    });
    assert(legalPublished?.ok === true && legalPublished.revision === 1, "Legal publish failed.");
    const publicPrivacy = (await anonymous.rpc("public_legal_page", { target_slug: "privacy" }))
      .data;
    assert(
      publicPrivacy?.body ===
        "SYNTHETIC reviewed privacy body. Enquiries and project submissions are stored privately.",
      "Published privacy body mismatch.",
    );
    const legalDraft2 = await rpc(b, "update_legal_page_draft", {
      target_slug: "privacy",
      expected_version: legalPublished.version,
      target_title: "SYNTHETIC Privacy",
      target_body: "SYNTHETIC second draft.",
    });
    assert(legalDraft2?.ok === true, "Second legal draft failed.");
    assert(
      (await anonymous.rpc("public_legal_page", { target_slug: "privacy" })).data?.body ===
        "SYNTHETIC reviewed privacy body. Enquiries and project submissions are stored privately.",
      "Public changed before the revision was published.",
    );
    const terms = legal.pages.find((p) => p.slug === "terms");
    const termsDraft = await rpc(b, "update_legal_page_draft", {
      target_slug: "terms",
      expected_version: terms.version,
      target_title: "SYNTHETIC Terms",
      target_body: "SYNTHETIC terms body.",
    });
    assert(
      (
        await rpc(a, "publish_legal_page", {
          target_slug: "terms",
          expected_version: termsDraft.version,
        })
      )?.ok === true,
      "Terms publish failed.",
    );

    // 23–24. Version conflict with a second session
    const profileNow = (await rpc(a, "admin_get_business_settings")).profile;
    const saveA = await rpc(a, "update_business_profile", {
      expected_version: profileNow.version,
      target_display_name: "SYNTHETIC C7 BUSINESS A",
      target_primary_email: "synthetic-c7-public@example.test",
    });
    assert(saveA?.ok === true, "A's save failed.");
    const saveB = await rpc(b, "update_business_profile", {
      expected_version: profileNow.version,
      target_display_name: "SYNTHETIC STALE",
      target_primary_email: "synthetic-c7-public@example.test",
    });
    assert(
      hasReason(saveB, "version_conflict") && saveB.current_version === profileNow.version + 1,
      "Stale save was accepted.",
    );
    assert(
      (await rpc(a, "admin_get_business_settings")).profile.display_name ===
        "SYNTHETIC C7 BUSINESS A",
      "Stale save overwrote A.",
    );

    // Document defaults + thresholds (super admin only) and their effect
    const system = await rpc(a, "admin_get_system_settings");
    const defaultsByAdmin = await rpc(b, "update_document_defaults", {
      expected_version: system.document_defaults.version,
      target_default_currency: "RWF",
      target_allowed_currencies: ["RWF"],
      target_invoice_tax_label: "Tax",
      target_invoice_tax_rate: 18,
      target_invoice_due_days: 30,
      target_po_tax_label: "Tax",
      target_po_tax_rate: 0,
      target_po_expected_delivery_days: 10,
    });
    assert(hasReason(defaultsByAdmin, "not_authorized"), "An admin changed document defaults.");
    const defaults = await rpc(a, "update_document_defaults", {
      expected_version: system.document_defaults.version,
      target_default_currency: "RWF",
      target_allowed_currencies: ["RWF", "USD"],
      target_invoice_tax_label: "Tax",
      target_invoice_tax_rate: 18,
      target_invoice_due_days: 30,
      target_po_tax_label: "Tax",
      target_po_tax_rate: 0,
      target_po_expected_delivery_days: 10,
      target_invoice_payment_terms: "SYNTHETIC pay within 30 days",
    });
    assert(defaults?.ok === true, "Document defaults update failed.");
    const drafts = await rpc(a, "admin_document_defaults");
    assert(
      Number(drafts.invoice_tax_rate) === 18,
      "Document defaults are not exposed to draft creators.",
    );
    assert(
      JSON.stringify((await rpc(a, "admin_get_invoice", { target_id: invoice.id })).document) ===
        JSON.stringify(invoiceBefore),
      "Document defaults rewrote a historical invoice.",
    );
    const thresholds = await rpc(a, "update_operational_settings", {
      expected_version: system.operational.version,
      target_project_ending_soon_days: 21,
      target_invoice_due_soon_days: 10,
      target_stale_draft_invoice_days: 30,
      target_assignment_ending_soon_days: 21,
      target_material_required_soon_days: 21,
      target_po_expected_soon_days: 3,
    });
    assert(thresholds?.ok === true, "Operational thresholds update failed.");
    assert(
      (await rpc(a, "admin_delivery_overview")).po_soon_window_days === 3,
      "C6 overview ignores the configured window.",
    );
    assert(
      (await rpc(a, "admin_finance_overview")).due_soon_window_days === 10,
      "C5 overview ignores the configured window.",
    );
    assert(
      (await rpc(a, "admin_operations_overview")).ending_soon_window_days === 21,
      "C4 overview ignores the configured window.",
    );

    // Site mode gate (§68): admin refused; super admin refused while blocked; then live; restore preview
    const websiteNow = (await rpc(a, "admin_get_website_settings")).website;
    const liveByAdmin = await rpc(b, "change_site_mode", {
      expected_version: websiteNow.version,
      next_mode: "live",
    });
    assert(hasReason(liveByAdmin, "not_authorized"), "A non-super-admin switched the site mode.");
    const readiness = await rpc(a, "admin_launch_readiness");
    assert(
      ["ready", "warning"].includes(readiness.overall),
      `Readiness is ${readiness.overall} after prerequisites.`,
    );
    const live = await rpc(a, "change_site_mode", {
      expected_version: websiteNow.version,
      next_mode: "live",
    });
    assert(live?.ok === true, "Super admin could not go live.");
    assert(
      (await anonymous.rpc("public_site_configuration")).data?.site_mode === "live",
      "Projection does not report live.",
    );
    const preview = await rpc(a, "change_site_mode", {
      expected_version: live.version,
      next_mode: "preview",
    });
    assert(preview?.ok === true, "Could not restore preview.");

    // Negative security (§69)
    const anonAdmin = await anonymous.rpc("admin_get_business_settings");
    assert(anonAdmin.error, "Anonymous caller read draft settings.");
    const aal1Read = await aal1.rpc("admin_get_website_settings");
    assert(aal1Read.error, "An AAL1 session read website settings.");
    runLocalSql(
      `delete from public.role_permissions where role_id in (select id from public.roles where key = 'c7-synthetic-read');
       delete from public.roles where key = 'c7-synthetic-read';`,
      "C7 stale synthetic role cleanup",
    );
    const readOnlyRole = await admin
      .from("roles")
      .insert({ key: "c7-synthetic-read", display_name: "SYNTHETIC read only" })
      .select("id")
      .single();
    assert(!readOnlyRole.error, "Could not create the synthetic read-only role.");
    const permissionRows = await admin
      .from("permissions")
      .select("id, key")
      .in("key", ["settings.business.read", "settings.website.read", "settings.legal.read"]);
    await admin.from("role_permissions").insert(
      permissionRows.data.map((row) => ({
        role_id: readOnlyRole.data.id,
        permission_id: row.id,
      })),
    );
    const readOnlyEmail = "c7-synthetic-readonly@example.test";
    const readOnlyId = await createActor(readOnlyEmail, password, "c7-synthetic-read");
    const r = await signInAndActivate(readOnlyEmail, password);
    assert(
      (await rpc(r, "admin_get_business_settings")).profile,
      "Read-only actor cannot read business settings.",
    );
    assert(
      hasReason(
        await rpc(r, "update_business_profile", {
          expected_version: 1,
          target_display_name: "X",
          target_primary_email: "x@example.test",
        }),
        "not_authorized",
      ),
      "Missing business.write was not denied.",
    );
    assert(
      hasReason(
        await rpc(r, "publish_legal_page", { target_slug: "terms", expected_version: 1 }),
        "not_authorized",
      ),
      "Missing legal.publish was not denied.",
    );
    const systemRead = await r.rpc("admin_get_system_settings");
    assert(systemRead.error, "Missing settings.system.read was not denied.");
    await removeUserByEmail(readOnlyEmail);
    await admin.from("roles").delete().eq("id", readOnlyRole.data.id);
    void readOnlyId;
    const disabledEmail = "c7-synthetic-disabled@example.test";
    await createActor(disabledEmail, password, "admin");
    const d = await signInAndActivate(disabledEmail, password);
    const disabledUser = (await admin.auth.admin.listUsers({ perPage: 1000 })).data.users.find(
      (u) => u.email === disabledEmail,
    );
    await admin.from("profiles").update({ account_status: "disabled" }).eq("id", disabledUser.id);
    runLocalSql(
      `update public.profiles set account_status = 'disabled', version = version + 1 where id = '${disabledUser.id}';`,
      "disable synthetic actor",
    );
    const disabledRead = await d.rpc("admin_get_business_settings");
    assert(disabledRead.error, "A disabled staff member read settings.");
    await removeUserByEmail(disabledEmail);
    for (const secret of [credentials.secretKey, "SUPABASE_SECRET_KEY"]) {
      const systemText = JSON.stringify(await rpc(a, "admin_get_system_settings"));
      assert(!systemText.includes(secret), "System settings exposed a secret value.");
    }

    // Staff register + reactivate + audit (§26, §41–42)
    const staff = await rpc(a, "admin_list_staff");
    assert(
      staff.staff.some((m) => m.email === emailB) && staff.can_manage === true,
      "Staff register missing the synthetic admin.",
    );
    const bUser = staff.staff.find((m) => m.email === emailB);
    assert(
      (await rpc(a, "disable_user", { target_user_id: bUser.id })) === true,
      "disable_user failed.",
    );
    assert(
      (await rpc(a, "reactivate_user", { target_user_id: bUser.id }))?.ok === true,
      "reactivate_user failed.",
    );
    const audit = await admin
      .from("audit_logs")
      .select("action, metadata")
      .or("entity_type.eq.settings,action.like.staff.%");
    const actions = new Set(audit.data.map((row) => row.action));
    for (const expected of [
      "business_profile.update",
      "contact_channel.create",
      "business_location.update",
      "seo_settings.update",
      "website_settings.update",
      // CR1 redefined update_navigation_settings and renamed its audit
      // action (docs/CLAUDE_OWNER_CMS_ARCHITECTURE.md); the C7 name is gone.
      "navigation.update",
      "public_configuration.publish",
      "legal_page.update",
      "legal_page.publish",
      "document_defaults.update",
      "operational_settings.update",
      "site_mode.change",
      "staff.reactivate",
    ]) {
      assert(actions.has(expected), `Audit is missing ${expected}.`);
    }
    const auditText = JSON.stringify(audit.data);
    assert(!auditText.includes("SYNTHETIC reviewed privacy body"), "Audit stored a legal body.");
    assert(!auditText.includes("SYNTHETIC enquiries"), "Audit stored a channel purpose note.");
    const events = await admin
      .from("realtime_events")
      .select("entity_type, action")
      .eq("entity_type", "settings");
    assert(
      events.data.some((e) => e.action === "published") &&
        events.data.some((e) => e.action === "updated"),
      "Settings realtime pointers missing.",
    );
    assert(!JSON.stringify(events.data).includes("SYNTHETIC"), "Realtime events carry values.");

    console.log(
      JSON.stringify({
        ok: true,
        checkpoints: [
          "draft edits invisible to anon until publish; publish exposes business/contact/location/SEO/website/navigation",
          "WhatsApp published as wa.me; no tel: without calling enabled; javascript: URLs refused",
          "historical issued invoice and PO documents byte-identical after settings publish; new invoice takes the published issuer",
          "location unpublish removes the card only after re-publish (coherent snapshots)",
          "legal: admin draft, publish denied without settings.legal.publish, super admin publishes; public shows published revision while a new draft exists",
          "two-session version conflict rejected with current_version; A's save preserved",
          "document defaults super-admin only, exposed to draft creators, never rewrite history; thresholds drive C4/C5/C6 overviews",
          "site mode: admin denied; super admin live once readiness passes; projection reports live; preview restored",
          "anon/AAL1/disabled/read-only actors denied appropriately; no secret values in settings reads",
          "staff register + disable/reactivate; audit complete without legal bodies or notes; value-free realtime pointers",
          "authorized baseline restored",
        ],
      }),
    );
  } finally {
    const failures = [];
    const quoted = (ids) => ids.map((id) => `'${id}'`).join(", ");
    const steps = [
      () => restoreBaseline(baseline),
      async () => {
        if (created.orders.length) {
          const ids = quoted(created.orders);
          runLocalSql(
            `set session_replication_role = replica;
             delete from public.purchase_order_share_links where purchase_order_id in (${ids});
             delete from public.purchase_order_line_items where purchase_order_id in (${ids});
             delete from public.purchase_orders where id in (${ids});
             delete from public.audit_logs where entity_id in (${ids});
             delete from public.realtime_events where entity_id in (${ids});`,
            "C7 synthetic PO cleanup",
          );
        }
      },
      async () => {
        if (created.invoices.length) {
          const ids = quoted(created.invoices);
          runLocalSql(
            `set session_replication_role = replica;
             delete from public.invoice_share_links where invoice_id in (${ids});
             delete from public.invoice_payments where invoice_id in (${ids});
             delete from public.invoice_line_items where invoice_id in (${ids});
             delete from public.invoices where id in (${ids});
             delete from public.audit_logs where entity_id in (${ids});
             delete from public.realtime_events where entity_id in (${ids});`,
            "C7 synthetic invoice cleanup",
          );
        }
      },
      async () => {
        if (created.partners.length) {
          const ids = quoted(created.partners);
          runLocalSql(
            `delete from public.trade_partners where id in (${ids}); delete from public.audit_logs where entity_id in (${ids}); delete from public.realtime_events where entity_id in (${ids});`,
            "C7 partner cleanup",
          );
        }
      },
      async () => {
        if (created.projects.length) {
          const ids = quoted(created.projects);
          runLocalSql(
            `delete from public.operational_project_status_history where project_id in (${ids});
             delete from public.operational_project_phase_history where project_id in (${ids});
             delete from public.operational_projects where id in (${ids});
             delete from public.audit_logs where entity_id in (${ids});
             delete from public.realtime_events where entity_id in (${ids});`,
            "C7 project cleanup",
          );
        }
      },
      async () => {
        if (created.clients.length) {
          const ids = quoted(created.clients);
          runLocalSql(
            `delete from public.clients where id in (${ids}); delete from public.audit_logs where entity_id in (${ids}); delete from public.realtime_events where entity_id in (${ids});`,
            "C7 client cleanup",
          );
        }
      },
      () => removeUserByEmail(emailB),
      () => removeUserByEmail(emailAal1),
      () => removeUserByEmail("c7-synthetic-readonly@example.test"),
      () => removeUserByEmail("c7-synthetic-disabled@example.test"),
      async () => {
        runLocalSql(
          `delete from public.role_permissions where role_id in (select id from public.roles where key = 'c7-synthetic-read');
           delete from public.user_roles where role_id in (select id from public.roles where key = 'c7-synthetic-read');
           delete from public.roles where key = 'c7-synthetic-read';
           alter table public.profiles disable trigger profiles_prevent_last_super_admin_delete;
           delete from auth.users where email = '${emailA}';
           alter table public.profiles enable trigger profiles_prevent_last_super_admin_delete;`,
          "C7 synthetic super admin cleanup",
        );
      },
    ];
    for (const step of steps) {
      try {
        await step();
      } catch (error) {
        failures.push(error instanceof Error ? error.message : "cleanup step failed");
      }
    }
    if (failures.length > 0) {
      console.error(`Synthetic C7 cleanup failed: ${failures.join("; ")}`);
      process.exitCode = 1;
    }
  }
}

try {
  await verifyC7();
} catch (error) {
  console.error(error instanceof Error ? error.message : "C7 verification failed.");
  process.exitCode = 1;
}
process.exit();
