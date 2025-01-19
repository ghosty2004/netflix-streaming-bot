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
