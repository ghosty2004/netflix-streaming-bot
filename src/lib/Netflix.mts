import { Mixin } from "ts-mixer";
import { endpoints, selectors } from "../constants/index.mts";
import { EventEmitter } from "./EventEmitter.mts";
import type { Page, Frame } from "puppeteer-core";
import type { ISearchMovie } from "../interfaces/index.mts";

type TEvents = {
  ["login"]: [email: string];
  ["showProfileSelection"]: [];
  ["profileSelected"]: [];
  ["moviePlayed"]: [movie: ISearchMovie];
  ["moviePaused"]: [];
};

export class Netflix extends Mixin(EventEmitter<TEvents>) {
  private readonly page: Page;

  private playingMovie: ISearchMovie | null = null;

  constructor(page: Page) {
    super();
    this.page = page;

    this.page.on("framenavigated", this.handleFrameNavigation.bind(this));
  }

  private async handleFrameNavigation(frame: Frame) {
    const url = frame.url();

    const urlHandlers: Record<string, () => Promise<void>> = {
      ["https://www.netflix.com/browse"]: async () => {
        // let's check if we are on the profile selection page
        const whosWatchingElement = await this.page.$(
          selectors.profileSelect.whosWatching
        );

        if (whosWatchingElement) {
          this.emitEventToSubcribers("showProfileSelection");
        }
      },
    };

    await urlHandlers?.[url]?.();
  }

  async acceptPrivacy() {
    await this.page.waitForSelector(selectors.privacy.accept);
    await this.page.click(selectors.privacy.accept);
  }

  async login(email: string, password: string) {
    await this.page.goto(endpoints.login, { waitUntil: "domcontentloaded" });
    await this.page.type(selectors.login.email, email);
    await this.page.type(selectors.login.password, password);
    await this.page.click(selectors.login.submit);

    this.emitEventToSubcribers("login", email);
  }

  async selectFirstProfile() {
    await this.page.waitForSelector(selectors.profileSelect.whosWatching);
    const firstProfile = await this.page.$(
      selectors.profileSelect.firstProfile
    );
    if (!firstProfile) return Promise.reject();
    await firstProfile.click();
    this.emitEventToSubcribers("profileSelected");
  }

  async searchMovie(movieName: string) {
    await this.page.waitForSelector(selectors.main.movieSearchBtn);
    await this.page.click(selectors.main.movieSearchBtn);

    await this.page.waitForSelector(selectors.main.movieSearchInput);
    await this.page.type(selectors.main.movieSearchInput, movieName);

    await this.page.waitForSelector(selectors.main.searchPage);

    return this.page.evaluate((mainSelectors) => {
      const items = document.querySelectorAll(
        mainSelectors.searchVideoGalleryItem
      );

      return [...items]
        .map((item) => {
          const href = item.querySelector("a")?.getAttribute("href");
          const title = item.querySelector(".fallback-text")?.textContent;
          const imageUrl = item.querySelector("img")?.getAttribute("src");

          if (!href || !title || !imageUrl) return;

          return { href, title, imageUrl };
        })
        .filter(Boolean) as ISearchMovie[];
    }, selectors.main);
  }

  async playMovie(movie: ISearchMovie) {
    await this.page.goto(`https://www.netflix.com${movie.href}`);
    this.playingMovie = movie;
  }

  async goHomeAndResetCurrentPlayingMovie() {
    await this.page.goto("https://www.netflix.com/browse").then(() => {
      this.playingMovie = null;
    });
  }

  getCurrentPlayingMovie() {
    return this.playingMovie;
  }

  private async moveMouseRandomly() {
    const maxWidth = await this.page.evaluate(() => window.innerWidth);
    const maxHeight = await this.page.evaluate(() => window.innerHeight);

    await this.page.mouse.move(
      Math.random() * maxWidth,
      Math.random() * maxHeight
    );
  }

  async getCurrentPlayingMovieAvailableAudioSubtitle() {
    if (!this.playingMovie) return Promise.reject();

    await this.moveMouseRandomly();

    const controlAudioSubtitleBtn = await this.page.$(
      selectors.videoPlayer.controlAudioSubtitleBtn
    );

    if (!controlAudioSubtitleBtn)
      return Promise.resolve({ audios: [], subtitles: [] });

    await controlAudioSubtitleBtn.click();

    try {
      const result = await this.page.evaluate((videoPlayerSelectors) => {
        const audios = [
          ...document.querySelectorAll(videoPlayerSelectors.audios),
        ].map((audio) => audio.textContent);

        const subtitles = [
          ...document.querySelectorAll(videoPlayerSelectors.subtitles),
        ].map((subtitle) => subtitle.textContent);

        return {
          audios,
          subtitles,
        };
      }, selectors.videoPlayer);

      return result;
    } catch (err) {
      console.log("Error received", err);
      return Promise.reject();
    } finally {
      await this.page.mouse.move(0, 0);
    }
  }

  async setCurrentMovieAudioSubtitle(type: "audio" | "subtitle", no: number) {
    if (!this.playingMovie) return Promise.reject();

    await this.moveMouseRandomly();

    const controlAudioSubtitleBtn = await this.page.$(
      selectors.videoPlayer.controlAudioSubtitleBtn
    );

    if (!controlAudioSubtitleBtn) return Promise.reject();

    await controlAudioSubtitleBtn.click();

    try {
      await this.page.waitForSelector(selectors.videoPlayer.audioSubtitleMenu);

      const selector =
        type === "audio"
          ? selectors.videoPlayer.audios
          : selectors.videoPlayer.subtitles;

      await this.page.waitForSelector(`${selector}:nth-child(${no})`);

      const name = await this.page.evaluate(
        (selector, no) => {
          const audio = document.querySelector(`${selector}:nth-child(${no})`);

          if (audio) {
            (audio as HTMLButtonElement).click();
            return audio.textContent;
          }

          return null;
        },
        selector,
        no
      );

      if (!name) return Promise.reject();

      return name;
    } catch (err) {
      console.log("Error received", err);
      return Promise.reject();
    } finally {
      await this.page.mouse.move(0, 0);
    }
  }

  async toggleSpace() {
    if (!this.playingMovie) return Promise.reject();
    this.page.keyboard.press("Space");
    return Promise.resolve();
  }
}
