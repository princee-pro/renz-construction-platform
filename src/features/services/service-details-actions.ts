"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  actionState,
  authorize,
  commandReason,
  commandReasonCode,
  commandSucceeded,
  commandVersion,
} from "@/features/admin-shared/action-helpers";
import { formNumber, formText, type AdminActionState } from "@/features/admin-shared/action-state";
import type { Json } from "@/lib/database/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const lines = (value: string, max: number) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, max);

const plain = (value: string) =>
  !/[<>]/u.test(value) && !/(?:javascript\s*:|data\s*:)/iu.test(value);

/** CR1: save the owner's service detail fields (positioning, sub-services, use cases, process, coordination, FAQ). */
export async function saveServiceDetailsAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("content.write");
  if (denied) return denied;
  const serviceId = formText(formData, "serviceId");
  if (!z.string().uuid().safeParse(serviceId).success)
    return actionState("error", "Service not found.");
  const positioning = formText(formData, "positioning").trim();
  const coordination = formText(formData, "coordination").trim();
  const subServices = lines(formText(formData, "subServices"), 24);
  const useCases = lines(formText(formData, "useCases"), 24);
  const processSteps = lines(formText(formData, "processSteps"), 24);
  const entryText = (value: FormDataEntryValue) => (typeof value === "string" ? value.trim() : "");
  const faqQuestions = formData.getAll("faqQuestion").map(entryText);
  const faqAnswers = formData.getAll("faqAnswer").map(entryText);
  const faqs = faqQuestions
    .map((question, index) => ({ question, answer: faqAnswers[index] ?? "" }))
    .filter((faq) => faq.question && faq.answer)
    .slice(0, 24);
  const everything = [
    positioning,
    coordination,
    ...subServices,
    ...useCases,
    ...processSteps,
    ...faqs.flatMap((faq) => [faq.question, faq.answer]),
  ];
  if (!everything.every(plain)) {
    return actionState("error", "Markup and executable links are not accepted.");
  }
  if (positioning.length > 300) {
    return actionState("error", "Keep the positioning line to 300 characters.", {
      fieldErrors: { positioning: "Up to 300 characters." },
    });
  }
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("update_admin_service_details", {
    target_id: serviceId,
    expected_localization_version: formNumber(formData, "expectedLocalizationVersion"),
    target_positioning: (positioning || null) as unknown as string,
    target_sub_services: subServices as unknown as Json,
    target_use_cases: useCases as unknown as Json,
    target_process_steps: processSteps as unknown as Json,
    target_coordination: (coordination || null) as unknown as string,
    target_faqs: faqs as unknown as Json,
  });
  if (error || !commandSucceeded(data)) {
    const code = commandReasonCode(data);
    if (code === "version_conflict") {
      return actionState(
        "conflict",
        "This service was saved again in the meantime (for example with Save draft). Your text is kept — press Save page content once more.",
        { currentVersion: commandVersion(data, "current_localization_version") },
      );
    }
    return actionState("error", commandReason(data));
  }
  revalidatePath(`/admin/content/services/${serviceId}`);
  return actionState("success", "Service details saved. Publish changes to update the website.", {
    currentVersion: commandVersion(data, "localization_version"),
  });
}
