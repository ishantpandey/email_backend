const { chromium } = require("playwright");

const loadWebsite = async (url) => {
  const browser = await chromium.launch({
    headless: true,
  });

  const page = await browser.newPage();

  await page.goto(url, {
    waitUntil: "networkidle",
  });

  const text = await page.evaluate(() => {
    return document.body.innerText;
  });

  await browser.close();

  return [
    {
      pageContent: text,
      metadata: {},
    },
  ];
};

module.exports = {
  loadWebsite,
};