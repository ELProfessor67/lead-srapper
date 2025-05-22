import * as cheerio from "cheerio";
import puppeteerExtra from "puppeteer-extra";
import stealthPlugin from "puppeteer-extra-plugin-stealth";
import chromium from "@sparticuz/chromium";


export async function searchGoogleMaps(query, leadCount = 10, minReviews = 0) {
  try {
    const start = Date.now();

    puppeteerExtra.use(stealthPlugin());

    const browser = await puppeteerExtra.launch({
      headless: "new",
      executablePath: "", // Add your Chrome/Chromium path here
    });

    const page = await browser.newPage();

    try {
      await page.goto(`https://www.google.com/maps/search/${query.split(" ").join("+")}`);
    } catch (error) {
      console.log("Error going to page:", error.message);
    }

    async function autoScroll(page) {
      await page.evaluate(async () => {
        const wrapper = document.querySelector('div[role="feed"]');

        await new Promise((resolve) => {
          let totalHeight = 0;
          const distance = 1000;
          const scrollDelay = 3000;

          const timer = setInterval(async () => {
            const scrollHeightBefore = wrapper.scrollHeight;
            wrapper.scrollBy(0, distance);
            totalHeight += distance;

            if (totalHeight >= scrollHeightBefore) {
              totalHeight = 0;
              await new Promise((r) => setTimeout(r, scrollDelay));

              const scrollHeightAfter = wrapper.scrollHeight;

              if (scrollHeightAfter > scrollHeightBefore) {
                return;
              } else {
                clearInterval(timer);
                resolve();
              }
            }
          }, 200);
        });
      });
    }

    await autoScroll(page);

    const html = await page.content();
    const pages = await browser.pages();
    await Promise.all(pages.map((p) => p.close()));
    await browser.close();
    console.log("Browser closed");

    const $ = cheerio.load(html);
    const aTags = $("a");
    const parents = [];

    aTags.each((_, el) => {
      const href = $(el).attr("href");
      if (href && href.includes("/maps/place/")) {
        parents.push($(el).parent());
      }
    });

    console.log("Found potential businesses:", parents.length);

    const businesses = [];

    parents.forEach((parent) => {
      const url = parent.find("a").attr("href");
      const website = parent.find('a[data-value="Website"]').attr("href");
      const storeName = parent.find("div.fontHeadlineSmall").text();
      const ratingText = parent.find("span.fontBodyMedium > span").attr("aria-label");

      const bodyDiv = parent.find("div.fontBodyMedium").first();
      const children = bodyDiv.children();
      const lastChild = children.last();
      const firstOfLast = lastChild.children().first();
      const lastOfLast = lastChild.children().last();

      const starsStr = ratingText?.split("stars")?.[0]?.trim();
      const reviewsStr = ratingText?.split("stars")?.[1]?.replace("Reviews", "")?.trim();

      const stars = starsStr ? Number(starsStr) : 0;
      const numberOfReviews = reviewsStr ? Number(reviewsStr) : 0;
      if (stars < minReviews) return;
     

      businesses.push({
        placeId: `ChI${url?.split("?")[0]?.split("ChI")?.[1]}`,
        address: firstOfLast?.text()?.split("·")[1]?.trim(),
        category: firstOfLast?.text()?.split("·")[0]?.trim(),
        phone: lastOfLast?.text()?.split("·")[1]?.trim(),
        googleUrl: url,
        bizWebsite: website,
        storeName,
        ratingText,
        stars,
        numberOfReviews,
      });
    });

    const end = Date.now();
    console.log(`Time taken: ${Math.floor((end - start) / 1000)} seconds`);

    return businesses.slice(0, leadCount);
  } catch (error) {
    console.log("Error in searchGoogleMaps:", error.message);
    return [];
  }
}
