"use client";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { IOrilley } from "@/lib/types";
import { formatDuration } from "@/lib/utils";
import { searchYoutube } from "@/lib/youtube";
import axios from "axios";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { useUIStore } from "@/lib/stores";
import { useShallow } from "zustand/react/shallow";
import { saveNodeDetails, findSavedNodeDetails } from "@/actions/roadmaps";

interface DrawerProps {
  roadmapId?: string;
}

export const Drawer = ({ roadmapId }: DrawerProps) => {
  const [drawerData, setDrawerData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { drawerOpen, toggleDrawer, drawerDetails, model, modelApiKey } =
    useUIStore(
      useShallow((state) => ({
        drawerOpen: state.drawerOpen,
        toggleDrawer: state.toggleDrawer,
        drawerDetails: state.drawerDetails,
        modelApiKey: state.modelApiKey,
        model: state.model,
      })),
    );

  const nodeName = `${drawerDetails?.query}_${drawerDetails?.parent}_${drawerDetails?.child}`;

  useEffect(() => {
    if (!drawerOpen) return;

    const fetchAndSaveData = async () => {
      if (
        !drawerDetails?.query ||
        !drawerDetails?.parent ||
        !drawerDetails?.child
      ) {
        return;
      }

      setIsLoading(true);
      setDrawerData(null);

      try {
        if (roadmapId) {
          const existingDetails = await findSavedNodeDetails(
            roadmapId,
            nodeName,
          );

          if (existingDetails) {
            const { youtubeVideoIds, details, books } = existingDetails;

            setDrawerData({
              detailsData: JSON.parse(details),
              videoIds: youtubeVideoIds as string[],
              booksData: JSON.parse(books),
              isSuccess: true,
            });
            return;
          }
        }

        const { detailsData, videoIds, booksData } =
          await fetchDataFromAPIs();

        const shouldSaveNodeDetails =
          roadmapId &&
          nodeName &&
          videoIds &&
          videoIds.length > 0 &&
          JSON.stringify(detailsData) !== "null" &&
          detailsData;

        if (shouldSaveNodeDetails) {
          await saveNodeDetails(
            roadmapId,
            nodeName,
            JSON.stringify(detailsData),
            JSON.stringify(booksData),
            videoIds,
          );
        }

        setDrawerData({
          detailsData,
          videoIds: (videoIds ?? []) as string[],
          booksData: Array.isArray(booksData) ? booksData : [],
          isSuccess: true,
        });
      } catch (error) {
        console.error("Error fetching or saving data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchAndSaveData();
  }, [
    drawerOpen,
    roadmapId,
    model,
    modelApiKey,
    drawerDetails?.query,
    drawerDetails?.parent,
    drawerDetails?.child,
    nodeName,
  ]);

  const fetchDataFromAPIs = async () => {
    const detailsData = await fetchDetailsData();
    const videoIds = await searchYoutube(
      `${drawerDetails?.query} ${drawerDetails?.parent} ${drawerDetails?.child}`,
    );
    const booksData = await fetchBooksData();

    return { detailsData, videoIds, booksData };
  };

  const fetchDetailsData = async () => {
    try {
      const qs = new URLSearchParams({ provider: model ?? "gemini" });
      if (modelApiKey) qs.set("apiKey", modelApiKey);
      const response = await axios.post(
        `/api/v1/details?${qs.toString()}`,
        {
          query: drawerDetails?.query,
          child: drawerDetails?.child,
          parent: drawerDetails?.parent,
        },
      );
      return response.data.text;
    } catch (error) {
      console.error("Error fetching details data:", error);
      return null;
    }
  };

  const fetchBooksData = async () => {
    try {
      const response = await axios.post(`/api/v1/orilley`, {
        data: { query: drawerDetails?.child },
      });
      const raw = response.data?.data?.results ?? response.data?.results;
      return Array.isArray(raw) ? raw : [];
    } catch (error) {
      console.error("Error fetching books data:", error);
      return [];
    }
  };

  const YoutubeVideo = () => {
    return (
      <div className="mt-4 md:px-12 px-8">
        <Carousel>
          <CarouselContent>
            {drawerData.videoIds &&
              drawerData.videoIds.map((videoId: string, index: number) => (
                <CarouselItem key={index}>
                  <div className="p-1">
                    <div className="aspect-video w-full overflow-hidden rounded-md">
                      <iframe
                        className="h-full w-full"
                        src={`https://www.youtube.com/embed/${videoId}`}
                        title="YouTube video"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    </div>
                  </div>
                </CarouselItem>
              ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </div>
    );
  };

  const ResourceLink = ({
    linkTitle,
    link,
    iconUrl,
  }: {
    link: string;
    linkTitle: string;
    iconUrl: string;
  }) => {
    return (
      <>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <a href={link} target="_blank" referrerPolicy="no-referrer">
                <Image
                  src={iconUrl}
                  alt="Wikipedia Logo"
                  width={16}
                  height={16}
                />
              </a>
            </TooltipTrigger>
            <TooltipContent>
              <p>{linkTitle}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </>
    );
  };

  return (
    <Sheet open={drawerOpen} onOpenChange={toggleDrawer}>
      <SheetContent className="overflow-auto min-w-full md:min-w-[700px]">
        <SheetTitle className="sr-only">
          {drawerDetails?.child || "Roadmap node details"}
        </SheetTitle>
        <div className="mb-4">
          <p className="text-xs text-slate-400">
            {drawerDetails?.parent ?? ""}
          </p>
          <p className="font-light">{drawerDetails?.child ?? ""}</p>
        </div>
        <div>
          {isLoading ? (
            <div className="flex justify-center items-center w-full h-[500px]">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <div>
              {drawerData?.videoIds?.length > 0 && <YoutubeVideo />}
              <div className="flex flex-wrap m-4">
                {drawerData?.detailsData?.link && (
                  <ResourceLink
                    link={drawerData?.detailsData?.link ?? ""}
                    linkTitle="Wikipedia"
                    iconUrl="/images/wikipedia.png"
                  />
                )}
              </div>
              <p className="text-sm text-slate-600">
                {drawerData?.detailsData?.description ?? ""}
              </p>
              {drawerData?.detailsData?.bulletPoints &&
              drawerData?.detailsData?.bulletPoints?.length > 0 ? (
                <div className="mt-4">
                  <ul className="list-disc list-inside">
                    {drawerData?.detailsData.bulletPoints?.map(
                      (point: string, id: number) => (
                        <li key={id} className="text-sm text-slate-600">
                          {point ?? ""}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              ) : null}
              <div className="mt-4">
                <p className="text-black mb-2">Recommended Books</p>
                <div className="flex flex-col gap-3">
                  {drawerData?.booksData?.length > 0 &&
                    drawerData?.booksData?.map(
                      (book: IOrilley["data"][number], id: number) => (
                        <a
                          className="flex items-start bg-white rounded-md overflow-hidden cursor-pointer"
                          href={"https://learning.oreilly.com" + book?.web_url}
                          target="_blank"
                          key={book?.id}
                        >
                          <div className="w-[80px] h-[80px] flex-shrink-0">
                            <img
                              className="w-full h-full object-cover"
                              src={book?.cover_url ?? ""}
                              alt={book?.title ?? ""}
                            />
                          </div>
                          <div className="px-4">
                            <p className="text-base font-regular mb-1">
                              {book?.title ?? ""}
                            </p>
                            <p className="text-gray-700 text-sm">
                              By {book?.authors?.[0] ?? ""}
                            </p>
                            {book?.duration_seconds > 0 && (
                              <p className="text-gray-600 text-xs">
                                Complete in{" "}
                                {formatDuration(book?.duration_seconds)}
                              </p>
                            )}
                          </div>
                        </a>
                      ),
                    )}
                </div>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
