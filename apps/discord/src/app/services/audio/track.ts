import { Readable } from "stream";

interface BaseTrack{
  resolveStream(): Promise<Readable|null|undefined>|null|undefined
}
export interface YoutubeVideoTrack extends BaseTrack{
  type: "youtube_video"
  author: {
    name: string,
    url: string,
  }
  title: string
  url: string
  thumbnail?: string|null
  playback_time: number,
}
export type Track = YoutubeVideoTrack;