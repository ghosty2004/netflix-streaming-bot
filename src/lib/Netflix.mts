import { Mixin } from "ts-mixer";
import { endpoints, selectors } from "../constants/index.mts";
import { EventEmitter } from "./EventEmitter.mts";
import type { Frame, Page } from "puppeteer";
import type { ISearchMovie } from "../interfaces/index.mts";

type TEvents = {
  ["login"]: [email: string];
  ["showProfileSelection"]: [];
  ["profileSelected"]: [];
};

export class Netflix extends Mixin(EventEmitter<TEvents>) {
  private readonly page: Page;

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

  async login(email: string, password: string) {
    await this.page.goto(endpoints.login, { waitUntil: "domcontentloaded" });
    await this.page.type(selectors.login.email, email);
    await this.page.type(selectors.login.password, password);
    await this.page.click(selectors.login.submit);

    this.emitEventToSubcribers("login", email);
  }

  async selectFirstProfile() {
    await this.page.waitForSelector(selectors.profileSelect.firstProfile);
    await this.page.click(selectors.profileSelect.firstProfile);
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

          if (!href || !title) return;

          return { href, title };
        })
        .filter(Boolean) as ISearchMovie[];
    }, selectors.main);
  }
}
