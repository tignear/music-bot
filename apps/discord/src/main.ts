import { Client, Guild, Message, Permissions } from "discord.js";
import { processCommand } from "./app/commands";
import { logger } from "./app/logger";
const client = new Client({
  partials: ["GUILD_MEMBER", "USER"],
  intents: ["GUILDS", "GUILD_MESSAGES", "GUILD_VOICE_STATES"]
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
    scopes: ["bot", "applications.commands"],
    permissions: new Permissions([
      "SEND_MESSAGES", "VIEW_CHANNEL", "CONNECT", "SPEAK"
    ])
  }))
});
client.login();
