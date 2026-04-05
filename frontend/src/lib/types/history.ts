/** Response shape for `GET /api/v1/history` (saved roadmaps + roadmap metadata). */
export type RoadmapHistoryItem = {
  savedId: string;
  roadmapId: string;
  title: string;
  createdAt: string;
  views: number;
  visibility: "PRIVATE" | "PUBLIC";
};
