import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { Netflix } from "./lib/index.mts";

puppeteer.use(StealthPlugin());

const browser = await puppeteer.launch({
  headless: false,
});

// get the first page which is automatically created by puppeter
const page = await browser.pages().then(([page]) => page);

// read some env variables
const credentials = {
  email: process.env.EMAIL,
  password: process.env.PASSWORD,
};

const netflix = new Netflix(page);

if (!credentials.email) throw new Error("Missing email in credentials.");

if (!credentials.password) throw new Error("Missing password in credentials.");

await netflix.login(credentials.email, credentials.password);

netflix.subscribeToEvent("login", async (username) => {
  console.log(`Logged in as ${username}`);
});

netflix.subscribeToEvent("showProfileSelection", async () => {
  console.log(
    `We are on the profile selection page, selecting the first profile...`
  );
  await netflix.selectFirstProfile();
});

netflix.subscribeToEvent("profileSelected", () => {
  console.log("Profile was successfully selected.");
});
