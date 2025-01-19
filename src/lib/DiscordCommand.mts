import { Client, Message } from "discord.js-selfbot-v13";

type TCommandListener = (message: Message<true>, ...args: any[]) => void;

export class DiscordCommand {
  private readonly client: Client;
  private readonly registry = new Map<string, TCommandListener>();
  private prefix = "!";

  constructor(client: Client) {
    this.client = client;

    this.client.on("messageCreate", this.handleOnMessageCreate.bind(this));
  }

  private handleOnMessageCreate(message: Message) {
    if (!message.content.startsWith(this.prefix)) return;

    const [command, ...args] = message.content
      .slice(this.prefix.length)
      .split(" ");

    const listenerFn = this.registry.get(command);

    if (!listenerFn) return;

    listenerFn(message as Message<true>, args);
  }

  add(command: string, listener: TCommandListener) {
    this.registry.set(command, listener);
  }
}
