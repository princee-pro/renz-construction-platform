import { RegisterSkeleton } from "@/components/admin/ui/register-skeleton";

export default function Loading() {
  return <RegisterSkeleton eyebrow="Client" rows={4} title="Loading client…" />;
}
