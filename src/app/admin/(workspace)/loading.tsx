import { RegisterSkeleton } from "@/components/admin/ui/register-skeleton";

export default function Loading() {
  return <RegisterSkeleton eyebrow="Restricted workspace" metrics={4} rows={4} title="Overview" />;
}
