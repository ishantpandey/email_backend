const axios = require("axios");
const cheerio = require("cheerio");

/**
 * Extract readable text from a website.
 *
 * @param {string} url
 * @returns {Promise<Object>}
 *
 * Response:
 * {
 *   success: true,
 *   title: "...",
 *   text: "...",
 *   url: "..."
 * }
 */
const extractWebsiteText = async (url) => {
  try {
    // Validate URL
    if (!url) {
      throw new Error("Website URL is required.");
    }

    /**
     * Download webpage
     */
    const { data } = await axios.get(url, {
      timeout: 15000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    /**
     * Load HTML
     */
    const $ = cheerio.load(data);

    /**
     * Remove unnecessary elements
     */
    $(
      "script, style, noscript, svg, img, iframe, footer, nav, header, aside, form"
    ).remove();

    /**
     * Extract page title
     */
    const title = $("title").text().trim();

    /**
     * Try to get main content first
     */
    let text =
      $("main").text() ||
      $("article").text() ||
      $("body").text();

    /**
     * Clean text
     */
    text = text
      .replace(/\r/g, "")
      .replace(/\n+/g, "\n")
      .replace(/\t/g, " ")
      .replace(/[ ]+/g, " ")
      .trim();

    return {
      success: true,
      title,
      url,
      text,
    };
  } catch (error) {
    console.error("Website Extraction Error:", error.message);

    throw new Error(error.message);
  }
};

module.exports = {
  extractWebsiteText,
};