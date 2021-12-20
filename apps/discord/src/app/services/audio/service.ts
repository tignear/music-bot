import { entersState, AudioPlayer, AudioPlayerStatus, createAudioPlayer, createAudioResource, joinVoiceChannel, VoiceConnection, VoiceConnectionStatus, VoiceConnectionDisconnectReason, StreamType } from "@discordjs/voice";
import { Message } from "discord.js";
import { promisify } from "util";
import { logger } from "../../logger";
import { VideoProcessor } from "./processor";
import i18n from "../../languages";
import { Queue } from "./queue";
import { Track } from "./track";
import { Context } from "../../context";
import { format_playback_time, format_track } from "../../formatter";
const wait = promisify(setTimeout);
type Handler = {
  onError(error: Error): void;
  onStart(track: Track): void;
  onFinish(track: Track): void;
  onDestroy(): void;
};
const PAGE_COUNT = 5;
class Subscription {
  private player: AudioPlayer;
  private readyLock = false;
  private queueLock = false;
  private currentTrack: Track | null = null;
  constructor(private connection: VoiceConnection, private queue: Queue<Track>, private handler: Handler) {
    this.player = createAudioPlayer();

    this.connection.on("stateChange", async (_, newState) => {
      if (newState.status === VoiceConnectionStatus.Disconnected) {
        if (newState.reason === VoiceConnectionDisconnectReason.WebSocketClose && newState.closeCode === 4014) {
          /*
            If the WebSocket closed with a 4014 code, this means that we should not manually attempt to reconnect,
            but there is a chance the connection will recover itself if the reason of the disconnect was due to
            switching voice channels. This is also the same code for the bot being kicked from the voice channel,
            so we allow 5 seconds to figure out which scenario it is. If the bot has been kicked, we should destroy
            the voice connection.
          */
          try {
            await entersState(this.connection, VoiceConnectionStatus.Connecting, 5_000);
            // Probably moved voice channel
          } catch {
            this.connection.destroy();
            // Probably removed from voice channel
          }
        } else if (this.connection.rejoinAttempts < 5) {
          /*
            The disconnect in this case is recoverable, and we also have <5 repeated attempts so we will reconnect.
          */
          await wait((this.connection.rejoinAttempts + 1) * 5_000);
          this.connection.rejoin();
        } else {
          /*
            The disconnect in this case may be recoverable, but we have no more remaining attempts - destroy.
          */
          this.connection.destroy();
        }
      } else if (newState.status === VoiceConnectionStatus.Destroyed) {
        /*
          Once destroyed, stop the subscription
        */
        handler.onDestroy();
        this.stop();
      } else if (
        !this.readyLock &&
        (newState.status === VoiceConnectionStatus.Connecting || newState.status === VoiceConnectionStatus.Signalling)
      ) {
        /*
          In the Signalling or Connecting states, we set a 20 second time limit for the connection to become ready
          before destroying the voice connection. This stops the voice connection permanently existing in one of these
          states.
        */
        this.readyLock = true;
        try {
          await entersState(this.connection, VoiceConnectionStatus.Ready, 20_000);
        } catch {
          if (this.connection.state.status !== VoiceConnectionStatus.Destroyed) this.connection.destroy();
        } finally {
          this.readyLock = false;
        }
      }
    });
    // Configure audio player
    this.player.on("stateChange", (oldState, newState) => {
      if (newState.status === AudioPlayerStatus.Idle && oldState.status !== AudioPlayerStatus.Idle) {
        // If the Idle state is entered from a non-Idle state, it means that an audio resource has finished playing.
        // The queue is then processed to start playing the next track, if one is available.
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.handler.onFinish(this.currentTrack!);
        void this.processQueue();
      } else if (newState.status === AudioPlayerStatus.Playing) {
        // If the Playing state has been entered, then a new track has started playback.
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.handler.onStart(this.currentTrack!);
      }
    });

    this.player.on('error', this.handler.onError);
    connection.subscribe(this.player);
  }
  /**
 * Stops audio playback and empties the queue
 */
  private stop() {
    this.queueLock = true;
    this.player.stop(true);
    this.queue.clear(this.connection.joinConfig.guildId);
  }
  public destroy() {
    this.connection.destroy();
  }
  public skip() {
    if (this.player.state.status === AudioPlayerStatus.Idle) {
      this.queue.pop(this.connection.joinConfig.guildId);
    } else {
      this.player.stop();
    }
  }
  /**
 * Attempts to play a Track from the queue
 */
  async processQueue(): Promise<void> {
    // If the queue is locked (already being processed), is empty, or the audio player is already playing something, return
    if (this.queueLock || this.player.state.status !== AudioPlayerStatus.Idle) {
      return;
    }
    // Lock the queue to guarantee safe access
    this.queueLock = true;

    // Take the first item from the queue. This is guaranteed to exist due to the non-empty check above.
    const nextTrack = this.queue.pop(this.connection.joinConfig.guildId);
    if (!nextTrack) {
      this.queueLock = false;
      return;
    }
    try {
      // Attempt to convert the Track into an AudioResource (i.e. start streaming the video)
      const stream = await nextTrack.resolveStream();
      if (!stream) {
        // TODO: emit error
        this.queueLock = false;
        return this.processQueue();
      }
      const resource = createAudioResource(stream, {
        inputType: StreamType.WebmOpus,
      });
      this.player.play(resource);
      this.currentTrack = nextTrack;
      this.queueLock = false;
    } catch (error) {
      // If an error occurred, try the next item of the queue instead
      this.handler.onError(error as Error);
      this.queueLock = false;
      return this.processQueue();
    }
  }
  get now_playing() {
    return this.currentTrack;
  }
  get playback_duration() {
    const state = this.player.state;
    if (state.status !== AudioPlayerStatus.Idle) {
      return state.resource.playbackDuration;
    }
    return 0;
  }
}

const language = "ja-JP";
export class AudioService {
  private subscriptions: Map<string, Subscription> = new Map();
  constructor(private processor: VideoProcessor, private queue: Queue<Track>) {

  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async performPlayCommand(message: Message, args: string[], ctx: unknown) {
    if (!message.guild?.available) {
      return;
    }
    const guildId = message.guild.id;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const voiceChannel = message.member!.voice.channel!;
    let subscription = this.subscriptions.get(guildId);
    if (!subscription && !voiceChannel) {
      const embed = i18n(language, "CONNECT_VOICE_CHANNEL_FIRST")();
      await message.channel.send({
        embeds: [embed]
      });
      return;
    }
    if (!args[0]) {
      const embed = i18n(language, "PLAY_COMMAND_TOO_FEW_ARGUMENT")();
      await message.channel.send({
        embeds: [embed]
      });
      return;
    }
    const { embeds, tracks } = await this.processor.process(args[0], {
      language,
      getQueueTrack: () => this.queue.get(guildId, 0) ?? [],
      currentTrackEstTime: () => subscription ? ((subscription.now_playing?.playback_time ?? 0) - subscription.playback_duration) : 0
    });

    if (!tracks.length) {
      await message.channel.send({
        embeds
      });
      return;
    }

    if (subscription) {
      this.queue.push(guildId, tracks);
      await message.channel.send({
        embeds
      });
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const permissions = voiceChannel.permissionsFor(message.guild!.me!);
    if (!permissions.has("VIEW_CHANNEL")) {
      await message.channel.send({
        embeds: [i18n(language, "MISSING_VIEW_CHANNEL_PERMISSION")()]
      });
      return;
    }
    if (!permissions.has("CONNECT")) {
      await message.channel.send({
        embeds: [i18n(language, "MISSING_CONNECT_PERMISSION")()]
      });
      return;
    }
    if (!permissions.has("MOVE_MEMBERS") && voiceChannel.full) {
      await message.channel.send({
        embeds: [i18n(language, "VOICE_CHANNEL_FULL")()]
      });
      return;
    }
    subscription = new Subscription(joinVoiceChannel({
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      adapterCreator: message.guild!.voiceAdapterCreator,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      channelId: voiceChannel.id,
      guildId,
      selfDeaf: true,
      selfMute: false,
    }), this.queue, {
      onError: (err) => logger.warn(err),
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      onFinish: () => { },
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      onStart: () => { },
      onDestroy: () => this.subscriptions.delete(guildId)
    });

    this.subscriptions.set(guildId, subscription);
    this.queue.push(guildId, tracks);
    await subscription.processQueue();
    await message.channel.send({
      embeds
    });
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async performShuffleCommand(message: Message, args: string[], ctx: unknown) {
    if (!message.guild?.available) {
      return;
    }
    this.queue.shuffle(message.guild.id);
    const embeds = [i18n(language, "QUEUE_SHUFFLED")()];
    await message.channel.send({
      embeds
    });
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async performDisconnectCommand(message: Message, args: string[], ctx: unknown) {
    if (!message.guild?.available) {
      return;
    }
    const subscription = this.subscriptions.get(message.guild.id);
    if (subscription) {
      subscription.destroy();
      await message.channel.send({
        embeds: [i18n(language, "DISCONNECTED")()]
      });
      return;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async performQueueCommand(message: Message, args: string[], ctx: unknown) {
    if (!message.guild?.available) {
      return;
    }
    const page = args[0] == null ? 0 : Number.parseInt(args[0]) - 1;
    if (!Number.isSafeInteger(page) || page < 0) {
      await message.channel.send({
        embeds: [i18n(language, "INVALID_PAGE")()]
      });
      return;
    }
    const index = page * PAGE_COUNT;
    const all = this.queue.get(message.guild.id, 0) ?? [];
    const queue = all.slice(index, index + PAGE_COUNT);
    if (!queue?.length) {
      await message.channel.send({
        embeds: [i18n(language, "PAGE_EMPTY")()]
      });
      return;
    }
    const subscription = this.subscriptions.get(message.guild.id);
    const len = all.length;
    const embeds = queue.map((track) => format_track(track));
    const est = all.reduce((a, b) => a + b.playback_time, 0) + (subscription ? ((subscription.now_playing?.playback_time ?? 0) - subscription.playback_duration) : 0);
    await message.channel.send({
      content: [
        `${page + 1}/${Math.floor((len+ 4) / 5)}(${len})`,
        `再生時間:\`${format_playback_time(est)}\``
      ].join("\n"),
      embeds
    });
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async performNowPlayingCommand(message: Message, args: string[], ctx: Context) {
    if (!message.guild?.available) {
      return;
    }
    const subscription = this.subscriptions.get(message.guild.id);
    if (!subscription || !subscription.now_playing) {
      await message.channel.send({
        embeds: [i18n(language, "NOTHING_PLAYING")()]
      });
      return;
    }
    const embed = format_track(subscription.now_playing, subscription.playback_duration);
    await message.channel.send({
      embeds: [embed]
    });
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async performClearCommand(message: Message, args: string[], ctx: Context) {
    if (!message.guild?.available) {
      return;
    }
    this.queue.clear(message.guild.id);
    await message.channel.send({
      embeds: [i18n(language, "QUEUE_CLEARED")()]
    });
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async performSkipCommand(message: Message, args: string[], ctx: Context) {
    if (!message.guild?.available) {
      return;
    }
    const subscription = this.subscriptions.get(message.guild.id);
    if (!subscription || !subscription.now_playing) {
      await message.channel.send({
        embeds: [i18n(language, "NOTHING_PLAYING")()]
      });
      return;
    }
    subscription.skip();
    await message.channel.send({
      embeds: [i18n(language, "TRACK_SKIPPED")()]
    });
  }
}


