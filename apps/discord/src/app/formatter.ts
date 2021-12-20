import { MessageEmbed } from "discord.js";
import { YoutubeVideoTrack } from "./services/audio/track";

export function format_playback_time(msec: number) {
  const asec = Math.floor(msec / 1000);
  const sec = asec % 60;
  const aminutes = Math.floor(asec / 60);
  const minutes = aminutes % 60;
  const hour = Math.floor(aminutes / 60);
  if (hour === 0) {
    return `${minutes.toString().padStart(2, '0')}: ${sec.toString().padStart(2, '0')}`;
  }
  return `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}
export function format_track(track: YoutubeVideoTrack, playbackDuration?: number) {
  const pt = format_playback_time(track.playback_time);
  const text = playbackDuration ? `${format_playback_time(playbackDuration)}/${pt}` : pt;
  return new MessageEmbed({
    title: track.title,
    url: track.url,
    author: {
      name: track.author.name,
      url: track.author.url
    },
    thumbnail: {
      url: track.thumbnail ?? undefined,
    },
    footer: {
      text
    }
  }).setColor("DARK_NAVY");
}