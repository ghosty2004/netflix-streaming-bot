import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { Client, Message, WebEmbed } from "discord.js-selfbot-v13";
import { Streamer, streamLivestreamVideo } from "@dank074/discord-video-stream";
import { launch, getStream } from "puppeteer-stream";
import { DiscordCommand, Netflix } from "./lib/index.mts";
import { executeFnWithRetryPolicy } from "./utils/index.mts";
import type { ISearchMovie } from "./interfaces/index.mts";
import type { Transform } from "stream";

// @ts-ignore
puppeteer.use(StealthPlugin());

const browser = await launch(puppeteer, {
  // @ts-ignore
  headless: "new",
  defaultViewport: {
    width: 1920,
    height: 1080,
  },
  args: ["--no-sandbox"],
});

// get the first page which is automatically created by puppeter
const page = await browser.pages().then(([page]) => page);

// read some env variables
const credentials = {
  token: process.env.TOKEN,
  email: process.env.EMAIL,
  password: process.env.PASSWORD,
};

if (!credentials.token) throw new Error("Missing token in credentials.");
if (!credentials.email) throw new Error("Missing email in credentials.");
if (!credentials.password) throw new Error("Missing password in credentials.");

// initialize some classes...
const netflix = new Netflix(page as any);
const client = new Client();
const discordCommand = new DiscordCommand(client);
const streamer = new Streamer(client);

client.login(credentials.token);

client.on("ready", (client) => {
  console.log(`Logged in as ${client.user.username}`);
});

const lastMovieSearches = new Map<string, [Message, ISearchMovie[]]>();
let currentStream: Transform | null = null;

const MAX_ITEMS_PER_PAGE = 10;

const showSearchPage = async (authorId: string, pageNo: number) => {
  const lastMovieSearchForAuthor = lastMovieSearches.get(authorId);
  if (!lastMovieSearchForAuthor) return;

  const [sentMessage, movies] = lastMovieSearchForAuthor;

  const start = (pageNo - 1) * MAX_ITEMS_PER_PAGE;
  const end = start + MAX_ITEMS_PER_PAGE;

  const moviesOnPage = movies.slice(start, end);

  const embed = new WebEmbed()
    .setTitle(`Page ${pageNo}/${Math.ceil(movies.length / MAX_ITEMS_PER_PAGE)}`)
    .setDescription(
      moviesOnPage
        .map((movie, index) => `${pageNo - 1 + index + 1}. ${movie.title}`)
        .join("\n")
    );

  await sentMessage.edit({
    content: `${WebEmbed.hiddenEmbed}${embed}`,
  });
};

discordCommand.add("help", (message) => {
  const embed = new WebEmbed().setTitle("Commands").setDescription(
    `
    !startstream - Start streaming Netflix to voice channel
    !stopstream - Stop streaming Netflix
    !search <movie name> - Search for a movie
    !page <page no> - Show a page of search results
    !play <movie no> - Play a movie
    !togglespace - Toggle space (on keyboard)
    !currentplaying - Show currently playing movie
    !audiosubtitle - Show available audio/subtitle
    !setaudio <audio no> - Set audio
    !setsubtitle <subtitle no> - Set subtitle
    !home - Go to home
  `
  );

  message.reply({
    content: `${WebEmbed.hiddenEmbed}${embed}`,
  });
});

discordCommand.add("startstream", async (message) => {
  if (currentStream) return message.reply("Already streaming.");

  if (!message.member?.voice.channelId)
    return message.reply("Join a voice channel first.");

  currentStream = await getStream(page, {
    audio: true,
    video: true,
    mimeType: "video/WEBM;codecs=VP8,OPUS",
    videoBitsPerSecond: 1000000,
    audioBitsPerSecond: 64000,
  });

  await streamer.joinVoice(message.guild.id, message.member.voice.channelId, {
    videoCodec: "VP8",
    width: 1920,
    height: 1080,
    fps: 60,
    bitrateKbps: 1000,
    hardwareAcceleratedDecoding: true,
    minimizeLatency: true,
  });

  const udpStream = await streamer.createStream();
  udpStream.mediaConnection.setSpeaking(true);
  udpStream.mediaConnection.setVideoStatus(true);

  await streamLivestreamVideo(currentStream, udpStream, true);

  await message.reply("Started streaming.");
});

discordCommand.add("stopstream", async (message) => {
  netflix.goHomeAndResetCurrentPlayingMovie().then(() => {
    streamer.stopStream();
    streamer.leaveVoice();
    currentStream?.end?.();
    currentStream = null;
    message.reply("Stopped streaming.");
  });
});

discordCommand.add("search", async (message, ...fullStr) => {
  const movieName = fullStr.join(" ");

  const embed = new WebEmbed().setDescription(`Searching for ${movieName}...`);

  const sentMessage = await message.channel.send({
    content: `${WebEmbed.hiddenEmbed}${embed}`,
  });

  const result = await netflix.searchMovie(movieName);

  lastMovieSearches.set(message.author.id, [sentMessage, result]);

  await showSearchPage(message.author.id, 1);
});

discordCommand.add("fixprofileselect", async (message) => {
  await netflix.selectFirstProfile();
  message.reply("Fixed profile select.");
});

discordCommand.add("page", async (message, pageNo) => {
  const lastSearchForAuthor = lastMovieSearches.get(message.author.id);

  if (!lastSearchForAuthor)
    return message.reply("You need to search for a movie first.");

  if (!pageNo) return message.reply("You need to provide a page no.");

  const pageNoInt = parseInt(pageNo);

  if (isNaN(pageNoInt)) return message.reply("Page no must be a number.");

  await showSearchPage(message.author.id, pageNoInt);
});

discordCommand.add("play", async (message, movieNo) => {
  const lastMovieSearchForAuthor = lastMovieSearches.get(message.author.id);

  if (!lastMovieSearchForAuthor)
    return message.reply("You need to search for a movie first.");

  if (!movieNo) return message.reply("You need to provide a movie no.");

  const [_, movies] = lastMovieSearchForAuthor;

  const movieIndex = parseInt(movieNo) - 1;

  if (isNaN(movieIndex)) return message.reply("Movie no must be a number.");

  const movie = movies[movieIndex];

  if (!movie) return message.reply("Invalid movie no.");

  await netflix.playMovie(movie);

  const embed = new WebEmbed()
    .setTitle(`Playing ${movie.title}`)
    .setImage(movie.imageUrl);

  message.reply({
    content: `${WebEmbed.hiddenEmbed}${embed}`,
  });
});

discordCommand.add("togglespace", (message) => {
  netflix
    .toggleSpace()
    .then(() => {
      message.reply("Toggled space.");
    })
    .catch(() => {
      message.reply("Failed to toggle space. (Maybe no movie is playing?)");
    });
});

discordCommand.add("currentplaying", (message) => {
  const movie = netflix.getCurrentPlayingMovie();
  if (!movie) return message.reply("No movie is currently playing.");
  message.reply(`Currently playing: ${movie.title}`);
});

discordCommand.add("audiosubtitle", async (message) => {
  netflix
    .getCurrentPlayingMovieAvailableAudioSubtitle()
    .then(({ audios, subtitles }) => {
      const audiosStr = audios
        .map((audio, idx) => `${++idx} - ${audio}`)
        .join("\n");

      const subtitlesStr = subtitles
        .map((subtitle, idx) => `${++idx} - ${subtitle}`)
        .join("\n");

      message.reply({
        content: `\`\`\`Audios:\n${audiosStr}\n\nSubtitles:\n${subtitlesStr}\`\`\``,
      });
    })
    .catch(() => {
      message.reply(
        "Failed to get audio/subtitle. (Maybe no movie is playing?)"
      );
    });
});

discordCommand.add("setaudio", (message, audioNo) => {
  const audioNoInt = parseInt(audioNo);
  if (isNaN(audioNoInt)) return message.reply("Audio no must be a number.");
  netflix
    .setCurrentMovieAudioSubtitle("audio", audioNoInt)
    .then((name) => {
      message.reply(`Set audio to ${name}`);
    })
    .catch(() => {
      message.reply("Failed to set audio (Maybe no movie is playing?)");
    });
});

discordCommand.add("setsubtitle", (message, subtitleNo) => {
  const subtitleNoInt = parseInt(subtitleNo);
  if (isNaN(subtitleNoInt))
    return message.reply("Subtitle no must be a number.");
  netflix
    .setCurrentMovieAudioSubtitle("subtitle", subtitleNoInt)
    .then((name) => {
      message.reply(`Set subtitle to ${name}`);
    })
    .catch(() => {
      message.reply("Failed to set subtitle (Maybe no movie is playing?)");
    });
});

discordCommand.add("home", (message) => {
  netflix
    .goHomeAndResetCurrentPlayingMovie()
    .then(() => {
      message.reply("Went to home.");
    })
    .catch(() => {
      message.reply("Failed to go home.");
    });
});

await netflix.login(credentials.email, credentials.password);

await netflix.acceptPrivacy();

netflix.subscribeToEvent("login", async (username) => {
  console.log(`Logged in as ${username}`);
});

netflix.subscribeToEvent("showProfileSelection", async () => {
  console.log(
    `We are on the profile selection page, selecting the first profile...`
  );

  executeFnWithRetryPolicy(netflix.selectFirstProfile.bind(netflix), [])
    .then(() => {
      console.log("Profile was successfully selected.");
    })
    .catch(() => {
      console.log("Failed to select profile.");
    });
});

netflix.subscribeToEvent("profileSelected", () => {
  console.log("Profile was successfully selected.");
});
