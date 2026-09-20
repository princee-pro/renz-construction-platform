import { RegisterSkeleton } from "@/components/admin/ui/register-skeleton";

export default function Loading() {
  return <RegisterSkeleton eyebrow="Invoice" rows={4} title="Loading invoice…" />;
}
