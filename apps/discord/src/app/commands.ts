import { Message } from "discord.js";
import ping from "./commands/ping";
import { DefaultVideoProcessor } from "./services/audio/processor";
import { OnMemoryQueue } from "./services/audio/queue";
import { AudioService } from "./services/audio/service";
import { YouTubeYTDLResolver } from "@music-bot/resolver-youtube-ytdl";
function parseContent(content: string, prefix: string) {
  return content.slice(prefix.length).split(" ").filter(e => !!e.length);
}
type CommandHandler = (message: Message, args: string[], ctx: { prefix: string }) => Promise<void>;
const service = new AudioService(new DefaultVideoProcessor(new YouTubeYTDLResolver()), new OnMemoryQueue());
const play = service.performPlayCommand.bind(service);
const shuffle = service.performShuffleCommand.bind(service);
const disconnect = service.performDisconnectCommand.bind(service);
const queue = service.performQueueCommand.bind(service);
const now_playing = service.performNowPlayingCommand.bind(service);
const clear = service.performClearCommand.bind(service);
const skip = service.performSkipCommand.bind(service);

const commands = new Map<string, CommandHandler>([
  ["ping", ping],
  ["play", play],
  ["p", play],
  ["shuffle", shuffle],
  ["disconnect", disconnect],
  ["dc", disconnect],
  ["queue", queue],
  ["q", queue],
  ["now_playing", now_playing],
  ["np", now_playing],
  ["clear", clear],
  ["cls", clear],
  ["skip",skip]
]);
export async function processCommand(message: Message, prefix: string) {
  const [command, ...args] = parseContent(message.content, prefix);
  const f = commands.get(command?.toLocaleLowerCase());
  if (!f) {
    return;
  }
  await f(message, args, {
    prefix
  });
}