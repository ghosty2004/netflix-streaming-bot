// selectors related to login
export const login = {
  email:
    "#appMountPoint > div > div > div > div.default-ltr-cache-8hdzfz.eoi9e9o0 > div > form > div.default-ltr-cache-z5atxi.e2eu37l0 input",
  password:
    "#appMountPoint > div > div > div > div.default-ltr-cache-8hdzfz.eoi9e9o0 > div > form > div.default-ltr-cache-1qtmpa.e1j9l8n51 input",
  submit:
    "#appMountPoint > div > div > div > div.default-ltr-cache-8hdzfz.eoi9e9o0 > div > form > button.pressable_styles__a6ynkg0.button_styles__1kwr4ym0.default-ltr-cache-1qj5r49.e1ax5wel2",
};

// selectors related to profile selection
export const profileSelect = {
  whosWatching:
    "#appMountPoint > div > div > div > div > div:nth-child(1) > div.bd.dark-background > div.profiles-gate-container > div > div > h1",
  firstProfile:
    "#appMountPoint > div > div > div > div > div:nth-child(1) > div.bd.dark-background > div.profiles-gate-container > div > div > ul > li:nth-child(1) > div > a > div > div",
};

// selectors related to main
export const main = {
  movieSearchBtn: ".searchBox button",
  movieSearchInput: ".searchBox input",

  searchPage: '[data-uia="search-page"]',
  searchVideoGallery: '[data-uia="search-video-gallery"]',
  searchVideoGalleryItem: '[data-uia="search-video-gallery-item"]',
};

// selectors related to privacy
export const privacy = {
  accept: "#onetrust-accept-btn-handler",
};

// selectors related to video player
export const videoPlayer = {
  controlAudioSubtitleBtn: '[data-uia="control-audio-subtitle"]',
  audioSubtitleMenu: '[data-uia="selector-audio-subtitle"]',
  audios:
    '[data-uia="selector-audio-subtitle"] > :nth-child(1) > :nth-child(2) > li',
  subtitles:
    '[data-uia="selector-audio-subtitle"] > :nth-child(2) > :nth-child(2) > li',
};
