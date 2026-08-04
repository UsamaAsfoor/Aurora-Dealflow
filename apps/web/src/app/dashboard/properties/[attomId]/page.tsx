"use client";

import { useParams, useRouter } from "next/navigation";
import { PropertyDetailView } from "@/components/property/property-detail-view";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";

export default function PropertyProfilePage() {
  const params = useParams<{ attomId: string }>();
  const router = useRouter();
  const attomId = params.attomId;

  const propertyQuery = trpc.property.getByAttomId.useQuery({ attomId });
  const createLead = trpc.lead.createFromProperty.useMutation({
    onSuccess: (data) => {
      router.push(`/dashboard/leads/${data.leadId}`);
    },
  });

  const property = propertyQuery.data;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 lg:px-6">
      {propertyQuery.isLoading ? (
        <ProfileSkeleton />
      ) : property ? (
        <PropertyDetailView
          property={property}
          saving={createLead.isPending}
          onSaveLead={() => createLead.mutate({ attomId })}
        />
      ) : (
        <p className="text-[var(--color-muted-foreground)]">
          Property not found.
        </p>
      )}
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-4 w-1/3" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    </div>
  );
}
