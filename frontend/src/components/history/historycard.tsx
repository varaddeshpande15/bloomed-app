"use client";

import { deleteSavedRoadmapById } from "@/actions/roadmaps";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { RoadmapHistoryItem } from "@/lib/types/history";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Calendar, Eye, Link2, MoreHorizontal, Trash2 } from "lucide-react";
import { Link } from "next-view-transitions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Props = {
  item: RoadmapHistoryItem;
  onRemoved?: () => void;
};

export function HistoryCard({ item, onRemoved }: Props) {
  const router = useRouter();
  const created = (() => {
    try {
      return formatDistanceToNow(parseISO(item.createdAt), { addSuffix: true });
    } catch {
      return "—";
    }
  })();

  const handleRemove = async () => {
    const res = await deleteSavedRoadmapById(item.savedId);
    if (res.status === "success") {
      toast.success("Removed from saved", {
        description: "This roadmap was removed from your history.",
      });
      onRemoved?.();
      router.refresh();
      return;
    }
    toast.error("Could not remove", {
      description: res.message ?? "Try again.",
    });
  };

  return (
    <Card className="flex h-full w-full min-w-0 flex-col overflow-hidden transition-shadow hover:shadow-md md:min-h-[11rem]">
      <CardHeader className="space-y-2 pb-2 sm:p-7">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-2 min-w-0 text-base leading-snug sm:text-lg">
            {item.title}
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                aria-label="More actions"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={handleRemove}
              >
                <Trash2 className="mr-2 size-4" />
                Remove from saved
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm">
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Calendar className="size-3.5 shrink-0" aria-hidden />
            {created}
          </span>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Eye className="size-3.5 shrink-0" aria-hidden />
            {item.views.toLocaleString()} views
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6 pb-3 pt-0 sm:px-7">
        <Badge
          variant={item.visibility === "PUBLIC" ? "default" : "secondary"}
        >
          {item.visibility === "PUBLIC" ? "Public" : "Private"}
        </Badge>
      </CardContent>
      <CardFooter className="mt-auto flex flex-col gap-2 border-t bg-muted/30 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <Button asChild className="w-full gap-2 sm:w-auto sm:min-w-[10rem]" size="sm">
          <Link href={`/roadmap/${item.roadmapId}`}>
            <Link2 className="size-4" aria-hidden />
            Open roadmap
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export default HistoryCard;
