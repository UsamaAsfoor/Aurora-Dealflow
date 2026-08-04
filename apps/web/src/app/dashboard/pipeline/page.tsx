"use client";

import { PageHeader } from "@/components/layout/page-header";
import { PipelineBoard } from "@/components/pipeline/pipeline-board";

export default function PipelinePage() {
  return (
    <div className="mx-auto max-w-[100rem] px-4 py-8 lg:px-6">
      <PageHeader
        title="Pipeline"
        description="Move leads through your deal stages. Use the dropdown on each card to change stage."
      />
      <PipelineBoard />
    </div>
  );
}
