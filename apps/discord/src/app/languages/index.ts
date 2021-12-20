import { Metadata } from "@music-bot/domain-youtube";
import { MessageEmbed } from "discord.js";
import { logger } from "../logger";
import { Result } from "ytpl";
import { format_playback_time } from "../formatter";

interface Texts {
  NOT_TARGET: (key: string, code: string) => MessageEmbed
  MISSING_CONNECT_PERMISSION: () => MessageEmbed
  MISSING_VIEW_CHANNEL_PERMISSION: () => MessageEmbed
  VOICE_CHANNEL_FULL: () => MessageEmbed
  QUEUE_SHUFFLED: () => MessageEmbed
  CONNECT_VOICE_CHANNEL_FIRST: () => MessageEmbed
  YOUTUBE_VIDEO_QUEUED: (metadata: Metadata, total: number, queuedEstTime: number, totalEstTime: number) => MessageEmbed
  DISCONNECTED: () => MessageEmbed
  INVALID_PAGE: () => MessageEmbed
  PAGE_EMPTY: () => MessageEmbed
  NOTHING_PLAYING: () => MessageEmbed
  PLAY_COMMAND_TOO_FEW_ARGUMENT: () => MessageEmbed
  QUEUE_CLEARED: () => MessageEmbed
  TRACK_SKIPPED: () => MessageEmbed
  PLAYLIST_ADDED: (playlist: Result, count: number, total: number, queuedEstTime: number, totalEstTime: number) => MessageEmbed
}
const COLOR_ERROR = "RED" as const;
const COLOR_OK = "DARK_GREEN" as const;

const ja_JP: Texts = {
  NOT_TARGET: (url, code) => new MessageEmbed({
    description: `\`${url}\`は有効な再生対象ではありません。(${code})`
  }).setColor(COLOR_ERROR),
  PLAYLIST_ADDED: (playlist: Result, count: number, total: number, queuedEstTime: number, totalEstTime: number) => new MessageEmbed({
    description: `${playlist.title} をキューに追加しました。`,
    thumbnail: {
      url: playlist.bestThumbnail.url ?? undefined
    },
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
  }).setColor(COLOR_OK),
  MISSING_CONNECT_PERMISSION: () => new MessageEmbed({
    description: `ボイスチャンネルに接続する権限がありません。`
  }).setColor(COLOR_ERROR),
  MISSING_VIEW_CHANNEL_PERMISSION: () => new MessageEmbed({
    description: `チャンネルを見る権限がありません。`
  }).setColor(COLOR_ERROR),
  VOICE_CHANNEL_FULL: () => new MessageEmbed({
    description: `ボイスチャンネルが満員のため接続できません。`
  }).setColor(COLOR_ERROR),
  CONNECT_VOICE_CHANNEL_FIRST: () => new MessageEmbed({
    description: "まずVoiceChannelに接続してください。"
  }).setColor(COLOR_ERROR),
  QUEUE_SHUFFLED: () => new MessageEmbed({
    description: "キューをシャッフルしました。"
  }).setColor(COLOR_OK),
  YOUTUBE_VIDEO_QUEUED: (metadata: Metadata, total: number, queuedEstTime: number, totalEstTime: number) => new MessageEmbed({
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
  DISCONNECTED: () => new MessageEmbed({
    description: "VoiceChannelから切断しました。"
  }).setColor(COLOR_OK),
  INVALID_PAGE: () => new MessageEmbed({
    description: "処理できないページです。"
  }).setColor(COLOR_ERROR),
  PAGE_EMPTY: () => new MessageEmbed({
    description: "このページには表示するものがありません。"
  }).setColor(COLOR_OK),
  NOTHING_PLAYING: () => new MessageEmbed({
    description: "現在再生しているものはありません。"
  }).setColor(COLOR_OK),
  PLAY_COMMAND_TOO_FEW_ARGUMENT: () => new MessageEmbed({
    description: "引数が不足しています。"
  }).setColor(COLOR_ERROR),
  QUEUE_CLEARED: () => new MessageEmbed({
    description: "キューを空にしました。"
  }).setColor(COLOR_OK),
  TRACK_SKIPPED: () => new MessageEmbed({
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