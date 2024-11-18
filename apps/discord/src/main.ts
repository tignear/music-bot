import { Client, Guild, Message, OAuth2Scopes, Partials } from "discord.js";
import { processCommand } from "./app/commands";
import { logger } from "./app/logger";
const client = new Client({
  partials: [Partials.GuildMember, Partials.User],
  intents: ["Guilds", "GuildMessages", "GuildVoiceStates", "MessageContent"]
});
let clientUserMentionPrefixRegex!: RegExp;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function getPrefix(guild: Guild | null) {
  return "!";
}
async function isCommandCall(message: Message) {
  const match = message.content.match(clientUserMentionPrefixRegex);
  if (match) {
    return match[0];
  }
  const prefix = await getPrefix(message.guild);
  if (message.content.startsWith(prefix)) {
    return prefix;
  }
  return null;
}
async function onMessageCreate(message: Message) {
  const prefix = await isCommandCall(message);
  if (!prefix) {
    return;
  }
  await processCommand(message, prefix);
}
client.on("messageCreate", (message) => {
  onMessageCreate(message).catch((err) => logger.error(err));
});
client.once("ready", () => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  clientUserMentionPrefixRegex = new RegExp(`^<@!?${client.user!.id}>`);
  logger.info("ready!");
  logger.info(client.generateInvite({
    scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands],
    permissions: ["SendMessages", "ViewChannel", "Connect", "Speak"]
  }))
});
client.login();
