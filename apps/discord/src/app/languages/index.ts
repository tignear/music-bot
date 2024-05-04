import { Metadata } from "@music-bot/domain-youtube";
import { EmbedBuilder } from "discord.js";
import { logger } from "../logger";
import { Result } from "ytpl";
import { format_playback_time } from "../formatter";

interface Texts {
  NOT_TARGET: (key: string, code: string) => EmbedBuilder
  MISSING_CONNECT_PERMISSION: () => EmbedBuilder
  MISSING_VIEW_CHANNEL_PERMISSION: () => EmbedBuilder
  VOICE_CHANNEL_FULL: () => EmbedBuilder
  QUEUE_SHUFFLED: () => EmbedBuilder
  CONNECT_VOICE_CHANNEL_FIRST: () => EmbedBuilder
  YOUTUBE_VIDEO_QUEUED: (metadata: Metadata, total: number, queuedEstTime: number, totalEstTime: number) => EmbedBuilder
  DISCONNECTED: () => EmbedBuilder
  INVALID_PAGE: () => EmbedBuilder
  PAGE_EMPTY: () => EmbedBuilder
  NOTHING_PLAYING: () => EmbedBuilder
  PLAY_COMMAND_TOO_FEW_ARGUMENT: () => EmbedBuilder
  QUEUE_CLEARED: () => EmbedBuilder
  TRACK_SKIPPED: () => EmbedBuilder
  PLAYLIST_ADDED: (playlist: Result, count: number, total: number, queuedEstTime: number, totalEstTime: number) => EmbedBuilder
}
const COLOR_ERROR = "Red" as const;
const COLOR_OK = "DarkGreen" as const;

const ja_JP: Texts = {
  NOT_TARGET: (url, code) => new EmbedBuilder({
    description: `\`${url}\`は有効な再生対象ではありません。(${code})`
  }).setColor(COLOR_ERROR),
  PLAYLIST_ADDED: (playlist: Result, count: number, total: number, queuedEstTime: number, totalEstTime: number) => new EmbedBuilder({
    description: `${playlist.title} をキューに追加しました。`,

    fields: [
      {
        name: "追加",
        value: String(count),
        inline: true,
      },
      {
        name: "合計",
        value: String(total),
        inline: true,
      },
      {
        name: "再生時間(追加)",
        value: "`" + format_playback_time(queuedEstTime) + "`",
        inline: true,
      },
      {
        name: "再生時間(合計)",
        value: "`" + format_playback_time(totalEstTime) + "`",
        inline: true,
      }
    ]
  }).setThumbnail(
    playlist.bestThumbnail.url ?? null
  ).setColor(COLOR_OK),
  MISSING_CONNECT_PERMISSION: () => new EmbedBuilder({
    description: `ボイスチャンネルに接続する権限がありません。`
  }).setColor(COLOR_ERROR),
  MISSING_VIEW_CHANNEL_PERMISSION: () => new EmbedBuilder({
    description: `チャンネルを見る権限がありません。`
  }).setColor(COLOR_ERROR),
  VOICE_CHANNEL_FULL: () => new EmbedBuilder({
    description: `ボイスチャンネルが満員のため接続できません。`
  }).setColor(COLOR_ERROR),
  CONNECT_VOICE_CHANNEL_FIRST: () => new EmbedBuilder({
    description: "まずVoiceChannelに接続してください。"
  }).setColor(COLOR_ERROR),
  QUEUE_SHUFFLED: () => new EmbedBuilder({
    description: "キューをシャッフルしました。"
  }).setColor(COLOR_OK),
  YOUTUBE_VIDEO_QUEUED: (metadata: Metadata, total: number, queuedEstTime: number, totalEstTime: number) => new EmbedBuilder({
    description: `${metadata.title} をキューに追加しました。`,
    thumbnail: {
      url: metadata.thumbnail
    },
    fields: [
      {
        name: "追加",
        value: String(1),
        inline: true,

      },
      {
        name: "合計",
        value: String(total),
        inline: true,
      },
      {
        name: "再生時間(追加)",
        value: "`" + format_playback_time(queuedEstTime) + "`",
        inline: true,

      },
      {
        name: "再生時間(合計)",
        value: "`" + format_playback_time(totalEstTime) + "`",
        inline: true,
      }
    ]
  }).setColor(COLOR_OK),
  DISCONNECTED: () => new EmbedBuilder({
    description: "VoiceChannelから切断しました。"
  }).setColor(COLOR_OK),
  INVALID_PAGE: () => new EmbedBuilder({
    description: "処理できないページです。"
  }).setColor(COLOR_ERROR),
  PAGE_EMPTY: () => new EmbedBuilder({
    description: "このページには表示するものがありません。"
  }).setColor(COLOR_OK),
  NOTHING_PLAYING: () => new EmbedBuilder({
    description: "現在再生しているものはありません。"
  }).setColor(COLOR_OK),
  PLAY_COMMAND_TOO_FEW_ARGUMENT: () => new EmbedBuilder({
    description: "引数が不足しています。"
  }).setColor(COLOR_ERROR),
  QUEUE_CLEARED: () => new EmbedBuilder({
    description: "キューを空にしました。"
  }).setColor(COLOR_OK),
  TRACK_SKIPPED: () => new EmbedBuilder({
    description: "スキップしました。"
  }).setColor(COLOR_OK)
};
export default function get_text<T extends keyof Texts>(lang: string, key: T): Texts[T] {
  if (lang === "ja-JP") {
    return ja_JP[key];
  }
  logger.error("unknown language", {
    language: lang
  });
  return ja_JP[key];
}