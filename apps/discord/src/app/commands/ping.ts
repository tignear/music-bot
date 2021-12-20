import { Message } from "discord.js";
import { Context } from "../context";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default async function ping(message: Message, args: string[],ctx: Context) {
  await message.channel.send("pong!");
}