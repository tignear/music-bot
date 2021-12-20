import { YouTubeYTDLResolver } from './resolver-youtube-ytdl';
const resolver = new YouTubeYTDLResolver();
describe('resolverYoutubeYtdl', () => {
  it('formats', async () => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const handle = (await resolver.getHandle("https://www.youtube.com/watch?v=cm-l2h6GB8Q"))!;
    await handle.fetchMetadata();
    const s = await handle.fetchStream();
    await new Promise(resolve=>s.on("close",resolve));
  },30*1000);
});
