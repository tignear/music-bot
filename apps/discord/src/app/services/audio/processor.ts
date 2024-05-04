import { HandleBase, Resolver } from "@music-bot/resolver-interface";
import { EmbedBuilder } from "discord.js";
import ytpl = require("ytpl");
import { Track, YoutubeVideoTrack } from "./track";
import i18n from "../../languages";
import { Metadata } from "@music-bot/domain-youtube";
interface ProcessorResult {
  tracks: Track[];
  embeds: EmbedBuilder[];
}
interface ProcessorContext {
  language: string;
  getQueueTrack(): Track[],
  currentTrackEstTime(): number
}
export interface VideoProcessor {
  process(key: string, ctx: ProcessorContext): Promise<ProcessorResult>;
}

export class DefaultVideoProcessor<Handle extends HandleBase<Metadata>> implements VideoProcessor {
  constructor(private youtube_resolver: Resolver<Handle, Metadata>) {

  }
  private async process_youtube_playlist_url(url: URL, ctx: ProcessorContext) {
    const playlist_id = url.searchParams.get("list");
    if (!playlist_id) {
      return { embeds: [i18n(ctx.language, "NOT_TARGET")(url.toString(), "PLAYLIST_ID_NOT_INCLUDED")], tracks: [] };
    }
    const items: ytpl.Item[] = [];
    const playlist = await ytpl(playlist_id, {
      pages: 1
    });
    let result: ytpl.Result | ytpl.ContinueResult = playlist;
    items.push(...result.items);
    while (result.continuation != null) {
      result = await ytpl.continueReq(result.continuation);
      items.push(...result.items);
    }
    items.sort((a, b) => a.index - b.index);
    const tracks = items.map((item): YoutubeVideoTrack => {
      const handle = this.youtube_resolver.getHandle(item.id);
      return {
        author: item.author,
        playback_time: (item.durationSec ?? 0) * 1000,
        thumbnail: item.bestThumbnail.url,
        title: item.title,
        type: "youtube_video",
        url: item.url,
        resolveStream: async () => {
          const h = await handle;
          return h?.fetchStream();
        }
      };
    });
    const queuedTracks = ctx.getQueueTrack();
    const est = tracks.map(e => e.playback_time).reduce((a, b) => a + b, 0);
    const embed = i18n(ctx.language, "PLAYLIST_ADDED")(
      playlist,
      items.length,
      queuedTracks.length + items.length,
      est,
      est + queuedTracks.map(e => e.playback_time).reduce((a, b) => a + b, 0) + ctx.currentTrackEstTime()
    );
    return {
      tracks,
      embeds: [embed]
    };
  }
  private async process_youtube_playback_url(url: URL, ctx: ProcessorContext) {
    const video_id = url.searchParams.get("v");
    if (!video_id) {
      return { embeds: [i18n(ctx.language, "NOT_TARGET")(url.toString(), "VIDEO_ID_NOT_INCLUDED")], tracks: [] };
    }
    const handle = await this.youtube_resolver.getHandle(video_id);
    if (!handle) {
      return { embeds: [i18n(ctx.language, "NOT_TARGET")(url.toString(), "FAILED_TO_GET_HANDLE")], tracks: [] };
    }
    const metadata = await handle.fetchMetadata();
    if (!metadata) {
      return { embeds: [i18n(ctx.language, "NOT_TARGET")(url.toString(), "FAILED_TO_FETCH_METADATA")], tracks: [] };
    }
    const track: YoutubeVideoTrack = {
      author: {
        name: metadata.author_name,
        url: metadata.author_url
      },
      resolveStream: () => handle.fetchStream(),
      playback_time: metadata.playback_time,
      title: metadata.title,
      thumbnail: metadata.thumbnail,
      type: "youtube_video",
      url: metadata.url
    }
    const queuedTracks = ctx.getQueueTrack();

    return {
      tracks: [track],
      embeds: [
        i18n(ctx.language, "YOUTUBE_VIDEO_QUEUED")(
          metadata,
          queuedTracks.length + 1,
          track.playback_time,
          track.playback_time + queuedTracks.map(e => e.playback_time).reduce((a, b) => a + b, 0) + ctx.currentTrackEstTime()
        )
      ]
    };
  }
  private async process_youtube_url(url: URL, ctx: ProcessorContext) {
    if (url.pathname.startsWith("/playlist")) {
      return this.process_youtube_playlist_url(url, ctx);
    }
    if (url.pathname.startsWith("/watch")) {
      return this.process_youtube_playback_url(url, ctx);
    }
    return { embeds: [i18n(ctx.language, "NOT_TARGET")(url.toString(), "NOT_PLAYLIST_URL_OR_PLAYBACK_URL")], tracks: [] };
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async process(key: string, ctx: ProcessorContext) {
    let url: URL;
    try {
      url = new URL(key);
    } catch {
      return { embeds: [i18n(ctx.language, "NOT_TARGET")(key, "MALFORMED_URL")], tracks: [] };
    }
    if (url.protocol !== "https:") {
      return { embeds: [i18n(ctx.language, "NOT_TARGET")(key, "NON_ACCEPTABLE_URL_PROTOCOL")], tracks: [] };
    }
    if (["https://www.youtube.com", "https://youtube.com"].includes(url.origin)) {
      return this.process_youtube_url(url, ctx);
    }
    return { embeds: [i18n(ctx.language, "NOT_TARGET")(key, "NO_MATCH")], tracks: [] };
  }
}