"use client";

import { useSingleSubmit } from "@/features/admin-shared/single-submit";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/admin/ui/alert";
import { Button } from "@/components/admin/ui/button";
import { Field } from "@/components/admin/ui/field";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import {
  initialAdminActionState,
  type AdminActionState,
} from "@/features/admin-shared/action-state";
import { usePinnedEdit } from "@/features/admin-shared/use-pinned-edit";
import {
  checkDuplicatePartnersAction,
  createPartnerAction,
  updatePartnerAction,
} from "@/features/partners/partner-actions";
import {
  availabilityLabels,
  availabilityStatuses,
  partnerCapabilityLabels,
  specializationOptions,
  type DuplicatePartner,
  type PartnerCapability,
} from "@/features/partners/partner-contract";

export type PartnerFormInitial = Readonly<{
  displayName: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  specializations: readonly string[];
  availability: string;
  capabilities: readonly PartnerCapability[];
}>;

export const emptyPartnerForm: PartnerFormInitial = {
  displayName: "",
  companyName: "",
  contactName: "",
  email: "",
  phone: "",
  address: "",
  notes: "",
  specializations: [],
  availability: "available",
  capabilities: [],
};

/**
 * Create/edit form for a trade partner. Capabilities are chosen at creation
 * (contractor, supplier, or both); afterwards a capability is added through
 * the audited "Add capability" action on the 360 page. Duplicate awareness
 * is bounded (email / phone / exact name or company) and never blocks.
 */
export function PartnerForm({
  mode,
  initial,
  partnerId,
  version,
  defaultCapability,
  returnHref,
}: Readonly<{
  mode: "create" | "edit";
  initial: PartnerFormInitial;
  partnerId?: string | undefined;
  version?: number | undefined;
  defaultCapability: PartnerCapability;
  returnHref: string;
}>) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    mode === "create" ? createPartnerAction : updatePartnerAction,
    initialAdminActionState,
  );
  const edit = usePinnedEdit(
    version ?? 1,
    state.status === "success" ? state.currentVersion : null,
  );

  useEffect(() => {
    if (state.status !== "success") return;
    const id = mode === "create" ? state.createdId : partnerId;
    if (!id) {
      router.push(returnHref);
      return;
    }
    router.push(
      defaultCapability === "supplier"
        ? `/admin/procurement/suppliers/${id}`
        : `/admin/operations/contractors/${id}`,
    );
  }, [state.status, state.createdId, mode, partnerId, router, defaultCapability, returnHref]);

  return (
    <PartnerFormFields
      action={action}
      defaultCapability={defaultCapability}
      edit={edit}
      initial={initial}
      key={edit.formKey}
      mode={mode}
      partnerId={partnerId}
      pending={pending}
      returnHref={returnHref}
      state={state}
    />
  );
}

function PartnerFormFields({
  mode,
  initial,
  partnerId,
  action,
  state,
  pending,
  edit,
  defaultCapability,
  returnHref,
}: Readonly<{
  mode: "create" | "edit";
  initial: PartnerFormInitial;
  partnerId: string | undefined;
  action: (formData: FormData) => void;
  state: AdminActionState;
  pending: boolean;
  edit: ReturnType<typeof usePinnedEdit>;
  defaultCapability: PartnerCapability;
  returnHref: string;
}>) {
  const guard = useSingleSubmit(pending);
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [companyName, setCompanyName] = useState(initial.companyName);
  const [contactName, setContactName] = useState(initial.contactName);
  const [email, setEmail] = useState(initial.email);
  const [phone, setPhone] = useState(initial.phone);
  const [address, setAddress] = useState(initial.address);
  const [notes, setNotes] = useState(initial.notes);
  const [availability, setAvailability] = useState(initial.availability);
  const [capabilities, setCapabilities] = useState<readonly PartnerCapability[]>(
    initial.capabilities.length > 0 ? initial.capabilities : [defaultCapability],
  );
  const [selectedSpecializations, setSelectedSpecializations] = useState<readonly string[]>(
    initial.specializations,
  );
  const [customSpecialization, setCustomSpecialization] = useState("");
  const [duplicates, setDuplicates] = useState<readonly DuplicatePartner[]>([]);
  const [, startDuplicateCheck] = useTransition();

  useEffect(() => {
    const timer = setTimeout(() => {
      startDuplicateCheck(async () => {
        const matches = await checkDuplicatePartnersAction(
          displayName,
          email,
          phone,
          companyName,
          partnerId,
        );
        setDuplicates(matches);
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [displayName, email, phone, companyName, partnerId]);

  const toggleCapability = (capability: PartnerCapability) =>
    setCapabilities((current) =>
      current.includes(capability)
        ? current.filter((c) => c !== capability)
        : [...current, capability],
    );
  const toggleSpecialization = (value: string) =>
    setSelectedSpecializations((current) =>
      current.includes(value) ? current.filter((s) => s !== value) : [...current, value],
    );
  const addCustomSpecialization = () => {
    const value = customSpecialization.trim();
    if (!value) return;
    if (!selectedSpecializations.includes(value)) {
      setSelectedSpecializations((current) => [...current, value]);
    }
    setCustomSpecialization("");
  };
  const isContractor = capabilities.includes("contractor");

  return (
    <form action={action} className="admin-form" noValidate onSubmit={guard.onSubmit}>
      {partnerId ? <input name="partnerId" type="hidden" value={partnerId} /> : null}
      {mode === "edit" ? (
        <input name="expectedVersion" type="hidden" value={edit.pinnedVersion} />
      ) : null}
      {capabilities.map((capability) => (
        <input key={capability} name="capabilities" type="hidden" value={capability} />
      ))}
      {selectedSpecializations.map((value) => (
        <input key={value} name="specializations" type="hidden" value={value} />
      ))}

      {mode === "edit" && edit.outdated && state.status !== "conflict" ? (
        <Alert live tone="warning">
          <p>
            Another staff member updated this partner while you were editing. Reload to see their
            changes first.
          </p>
          <Button
            disabled={edit.reloading}
            onClick={edit.reloadLatest}
            tone="secondary"
            type="button"
          >
            {edit.reloading ? "Reloading…" : "Reload latest"}
          </Button>
        </Alert>
      ) : null}

      {mode === "create" ? (
        <fieldset className="capability-fieldset">
          <legend>Capabilities</legend>
          <p className="field-help">
            One business identity can be a contractor, a supplier, or both.
          </p>
          <div className="check-row">
            {(["contractor", "supplier"] as const).map((capability) => (
              <label key={capability}>
                <input
                  checked={capabilities.includes(capability)}
                  onChange={() => toggleCapability(capability)}
                  type="checkbox"
                />{" "}
                {partnerCapabilityLabels[capability]}
              </label>
            ))}
          </div>
          {state.fieldErrors["capabilities"] ? (
            <p className="field-error">{state.fieldErrors["capabilities"]}</p>
          ) : null}
        </fieldset>
      ) : null}

      <div className="field-grid field-grid-two">
        <Field
          error={state.fieldErrors["displayName"] ?? state.fieldErrors["display_name"]}
          id="displayName"
          label="Display name"
        >
          <input
            id="displayName"
            maxLength={200}
            name="displayName"
            onChange={(e) => setDisplayName(e.target.value)}
            required
            type="text"
            value={displayName}
          />
        </Field>
        <Field error={state.fieldErrors["companyName"]} id="companyName" label="Company name">
          <input
            id="companyName"
            maxLength={200}
            name="companyName"
            onChange={(e) => setCompanyName(e.target.value)}
            type="text"
            value={companyName}
          />
        </Field>
      </div>
      <div className="field-grid field-grid-three">
        <Field error={state.fieldErrors["contactName"]} id="contactName" label="Contact person">
          <input
            id="contactName"
            maxLength={200}
            name="contactName"
            onChange={(e) => setContactName(e.target.value)}
            type="text"
            value={contactName}
          />
        </Field>
        <Field error={state.fieldErrors["email"]} id="email" label="Email">
          <input
            id="email"
            maxLength={254}
            name="email"
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            value={email}
          />
        </Field>
        <Field error={state.fieldErrors["phone"]} id="phone" label="Phone">
          <input
            id="phone"
            maxLength={40}
            name="phone"
            onChange={(e) => setPhone(e.target.value)}
            type="text"
            value={phone}
          />
        </Field>
      </div>
      <Field error={state.fieldErrors["address"]} id="address" label="Address">
        <input
          id="address"
          maxLength={400}
          name="address"
          onChange={(e) => setAddress(e.target.value)}
          type="text"
          value={address}
        />
      </Field>

      {duplicates.length > 0 ? (
        <section aria-labelledby="partner-duplicates-heading" className="duplicate-panel">
          <p className="section-kicker" id="partner-duplicates-heading">
            Possible existing partners
          </p>
          <ul>
            {duplicates.map((candidate) => (
              <li key={candidate.id}>
                <Link
                  href={
                    candidate.capabilities.includes("contractor")
                      ? `/admin/operations/contractors/${candidate.id}`
                      : `/admin/procurement/suppliers/${candidate.id}`
                  }
                >
                  {candidate.display_name}
                </Link>
                <span>
                  {candidate.capabilities.map((c) => partnerCapabilityLabels[c]).join(" + ")} ·
                  matched by {candidate.match}
                  {candidate.archived_at ? " · archived" : ""}
                </span>
                {!candidate.capabilities.includes(defaultCapability) && !candidate.archived_at ? (
                  <span className="duplicate-hint">
                    Open the partner and use “Add{" "}
                    {partnerCapabilityLabels[defaultCapability].toLowerCase()} capability” instead
                    of creating a duplicate.
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {isContractor ? (
        <fieldset className="capability-fieldset">
          <legend>Contractor profile</legend>
          <Field id="availability" label="Availability">
            <select
              id="availability"
              name="availability"
              onChange={(e) => setAvailability(e.target.value)}
              value={availability}
            >
              {availabilityStatuses.map((status) => (
                <option key={status} value={status}>
                  {availabilityLabels[status]}
                </option>
              ))}
            </select>
          </Field>
          <div className="field-group">
            <span className="field-label" id="specializations-label">
              Specializations
            </span>
            <div aria-labelledby="specializations-label" className="check-row" role="group">
              {specializationOptions.map((option) => (
                <label key={option}>
                  <input
                    checked={selectedSpecializations.includes(option)}
                    onChange={() => toggleSpecialization(option)}
                    type="checkbox"
                  />{" "}
                  {option}
                </label>
              ))}
            </div>
            <div className="inline-add">
              <label htmlFor="customSpecialization">Other specialization</label>
              <input
                id="customSpecialization"
                maxLength={60}
                onChange={(e) => setCustomSpecialization(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomSpecialization();
                  }
                }}
                type="text"
                value={customSpecialization}
              />
              <Button onClick={addCustomSpecialization} tone="quiet" type="button">
                Add
              </Button>
            </div>
            {selectedSpecializations.filter(
              (s) => !(specializationOptions as readonly string[]).includes(s),
            ).length > 0 ? (
              <p className="badge-row">
                {selectedSpecializations
                  .filter((s) => !(specializationOptions as readonly string[]).includes(s))
                  .map((s) => (
                    <button
                      className="removable-badge"
                      key={s}
                      onClick={() => toggleSpecialization(s)}
                      type="button"
                    >
                      <StatusBadge tone="neutral">{s} ×</StatusBadge>
                    </button>
                  ))}
              </p>
            ) : null}
            {state.fieldErrors["specializations"] ? (
              <p className="field-error">{state.fieldErrors["specializations"]}</p>
            ) : null}
          </div>
        </fieldset>
      ) : (
        <input name="availability" type="hidden" value={availability} />
      )}

      <Field
        error={state.fieldErrors["notes"]}
        hint="Internal — never shared with the partner."
        id="notes"
        label="Private notes"
      >
        <textarea
          id="notes"
          maxLength={4000}
          name="notes"
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          value={notes}
        />
      </Field>

      {state.status === "conflict" ? (
        <Alert live tone="warning">
          <p>
            Another staff member saved changes to this partner first. Your edits are still shown,
            but have not been saved.
          </p>
          <Button
            disabled={edit.reloading}
            onClick={edit.reloadLatest}
            tone="secondary"
            type="button"
          >
            {edit.reloading ? "Reloading…" : "Reload latest"}
          </Button>
        </Alert>
      ) : null}
      {state.status === "error" || state.status === "reauth" ? (
        <Alert live tone="danger">
          <p>{state.message}</p>
        </Alert>
      ) : null}
      <div className="form-actions">
        <Button onClick={() => router.push(returnHref)} tone="quiet" type="button">
          Cancel
        </Button>
        <Button disabled={pending} tone="primary" type="submit">
          {pending
            ? "Saving…"
            : mode === "create"
              ? `Create ${partnerCapabilityLabels[defaultCapability]}`
              : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
