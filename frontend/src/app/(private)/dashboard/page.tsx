import { getMappedTraitsForUser } from "@/actions/psych-profile";
import {
  getRoadmapsByUserId,
  getSavedRoadmapsByUserId,
} from "@/actions/roadmaps";
import { EmptyAlert } from "@/components/alerts/EmptyAlert";
import { BloomDashboard } from "@/components/dashboard/bloom-dashboard";
import RoadmapCard from "@/components/flow-components/roadmap-card";
import { timeFromNow } from "@/lib/utils";
import { currentUser } from "@clerk/nextjs/server";

export default async function Dashboard() {
  const user = await currentUser();
  const userName =
    user?.firstName ||
    user?.username ||
    user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ||
    "there";

  const roadmaps = await getRoadmapsByUserId();
  const savedRoadmaps = await getSavedRoadmapsByUserId();
  const mappedTraits = await getMappedTraitsForUser();
  const adaptation = mappedTraits
    ? {
        mapped: mappedTraits.mapped,
        updatedAt: mappedTraits.updatedAt
          ? mappedTraits.updatedAt.toISOString()
          : null,
      }
    : null;

  return (
    <div className="flex flex-col gap-12">
      <BloomDashboard userName={userName} adaptation={adaptation} />

      <div className="mx-auto w-full max-w-6xl px-4">
        <div className="text-center">
          <h2 className="text-lg font-semibold leading-8 text-gray-900">
            Your roadmaps
          </h2>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {roadmaps.length > 0 &&
            roadmaps.map((roadmap) => (
              <RoadmapCard
                key={roadmap.id}
                title={roadmap.title}
                views={roadmap.views.toString()}
                timeAgo={timeFromNow(roadmap?.createdAt?.toString())}
                slug={roadmap.id}
                savedRoadmapId=""
              />
            ))}
          {roadmaps.length === 0 && (
            <div className="col-span-full flex justify-center">
              <EmptyAlert
                title="No roadmaps"
                description="You haven't created any roadmaps yet. Use Learn a topic to build one."
              />
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4">
        <div className="text-center">
          <h2 className="text-lg font-semibold leading-8 text-gray-900">
            Saved roadmaps
          </h2>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {savedRoadmaps.length > 0 &&
            savedRoadmaps.map((roadmap) => (
              <RoadmapCard
                key={roadmap.id}
                title={roadmap.title}
                slug={roadmap.roadmapId}
                savedRoadmapId={roadmap.id}
                savedRoadmapCard
              />
            ))}
          {savedRoadmaps.length === 0 && (
            <div className="col-span-full flex justify-center">
              <EmptyAlert
                title="No saved roadmaps"
                description="You haven't saved any roadmaps yet."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
