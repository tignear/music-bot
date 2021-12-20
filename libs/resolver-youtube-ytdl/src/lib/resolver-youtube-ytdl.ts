import { HandleBase, Resolver } from "@music-bot/resolver-interface";
import { Metadata } from "@music-bot/domain-youtube";
import { chooseFormat, downloadFromInfo, getInfo, videoInfo } from "ytdl-core";
function metadata(info: videoInfo): Metadata {
  return {
    author_name: info.videoDetails.author.name,
    author_url: info.videoDetails.author.channel_url,
    thumbnail: info.videoDetails.thumbnails[0].url,
    title: info.videoDetails.title,
    url: info.videoDetails.video_url,
    playback_time: Number.parseInt(info.videoDetails.lengthSeconds) * 1000,
    author_icon_url: (info.videoDetails.author.thumbnails ?? [{ url: undefined }])[0].url
  };
}
class YTDLResolveHandle implements HandleBase<Metadata> {
  private videoInfo?: Promise<videoInfo>;
  constructor(private key: string, private lang?: string) {

  }
  private async fetchInfo() {
    if (!this.videoInfo) {
      this.videoInfo = getInfo(this.key, { lang: this.lang });
    }
    const info = await this.videoInfo;
    return info;
  }
  async fetchMetadata() {
    const info = await this.fetchInfo();
    return metadata(info);
  }
  async fetchStream() {
    const info = await this.fetchInfo();
    const format = chooseFormat(info.formats, {
      filter: format => format.audioCodec === "opus" && format.container === "webm",
      quality: "highest"
    });
    const stream = downloadFromInfo(info, {
      format,
      highWaterMark: 32 * 1024 * 1024, // https://github.com/fent/node-ytdl-core/issues/902
    });
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    return stream;
  }
}
export class YouTubeYTDLResolver implements Resolver<YTDLResolveHandle, Metadata> {
  constructor(private lang?: string) {

  }
  getHandle(key: string): YTDLResolveHandle | Promise<YTDLResolveHandle | null> | null {
    return new YTDLResolveHandle(key, this.lang);
  }

}