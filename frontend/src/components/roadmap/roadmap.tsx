"use client";

import { getRoadmapById } from "@/actions/roadmaps";
import ExpandCollapse from "@/components/flow-components/expand-collapse";
import { Separator } from "@/components/ui/separator";
import { useGenerateRoadmap } from "@/lib/queries";
import { decodeFromURL } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useShallow } from "zustand/react/shallow";
import { GeneratorControls } from "@/components/flow-components/generator-controls";
import { useUIStore } from "@/lib/stores/useUI";
import Instructions from "@/components/flow-components/Instructions";
import * as React from "react";

interface Props {
  roadmapId?: string;
}

export default function Roadmap({ roadmapId }: Props) {
  const { query, model, modelApiKey, setQuery } = useUIStore(
    useShallow((state) => ({
      query: state.query,
      model: state.model,
      modelApiKey: state.modelApiKey,
      setQuery: state.setQuery,
    })),
  );

  const params = useSearchParams();
  React.useEffect(() => {
    const topic = params.get("topic");
    if (!topic?.trim()) return;
    const base = decodeURIComponent(topic.trim());
    const learn = params.get("learn")?.trim();
    const withStyle =
      learn && learn.length > 0 && !base.includes("Learning preference:")
        ? `${base} — Learning preference: ${learn}; structure steps for this modality (examples, diagrams, or practice as appropriate).`
        : base;
    setQuery(withStyle);
  }, [params, setQuery]);

  const { data: roadmap, isPending: isRoadmapPending } = useQuery({
    queryFn: async () => {
      const roadmap = await getRoadmapById(roadmapId || "");
      if (roadmap) {
        const json = JSON.parse(roadmap.content);
        roadmap.content = json;
        return roadmap;
      }
      throw Error("error");
    },
    queryKey: ["Roadmap", roadmapId],
    enabled: Boolean(roadmapId),
  });

  const isLoadingRoadmapById = Boolean(roadmapId) && isRoadmapPending;

  const { data, mutate, isPending } = useGenerateRoadmap(
    query,
    model,
    modelApiKey ?? null,
  );

  const renderFlow =
    roadmap?.content[0] ||
    data?.tree?.[0]?.name ||
    decodeFromURL(params)?.[0]?.name;

  const effectiveRoadmapId = roadmapId ?? data?.roadmapId;

  return (
    <>
      <div className="mx-auto max-w-7xl">
        <GeneratorControls
          mutate={mutate}
          isPending={isPending}
          renderFlow={renderFlow}
          title={query}
          treeToSave={data?.tree}
        />
      </div>
      <Separator />
      {isPending ? (
        <div className="grid h-[75vh] place-content-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : isLoadingRoadmapById ? (
        <div>
          <div className="grid h-[75vh] place-content-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </div>
      ) : (
        <>
          {renderFlow ? (
            <ExpandCollapse
              key={renderFlow}
              data={roadmap?.content || data?.tree || decodeFromURL(params)}
              isPending={isLoadingRoadmapById || isPending}
              roadmapId={effectiveRoadmapId}
            />
          ) : (
            <Instructions />
          )}
        </>
      )}
    </>
  );
}
