"use server";
import axios from "axios";
import { resolveYoutubeApiKey } from "@/lib/google-api-keys";

export async function searchYoutube(searchQuery: string) {
  const apiKey = resolveYoutubeApiKey();
  if (!apiKey) {
    console.warn("YouTube search: no API key (set YOUTUBE_API_KEY or GOOGLE_API_KEY)");
    return null;
  }

  const q = encodeURIComponent(searchQuery);
  const url = `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&q=${q}&videoDuration=medium&videoEmbeddable=true&type=video&maxResults=5`;

  try {
    const { data } = await axios.get(url);
    if (!data) {
      console.log("The YouTube API failed");
      return null;
    }
    if (data.items?.[0] == undefined) {
      console.log("No video found");
      return null;
    }
    const videoIds = data.items.map((item: { id?: { videoId?: string } }) => item?.id?.videoId);
    return videoIds;
  } catch (e: unknown) {
    const err = e as { response?: { status?: number; data?: unknown } };
    console.error(
      "YouTube API error:",
      err.response?.status,
      err.response?.data ?? e,
    );
    return null;
  }
}
