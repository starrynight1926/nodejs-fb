import fs from "fs";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

/* ================= COOKIE ================= */
async function loadCookies(page) {
  try {
    const raw = fs.readFileSync("cookie_clean.json", "utf8");
    const cookies = JSON.parse(raw);
    await page.setCookie(...cookies);
    console.error("🍪 Cookie loaded OK");
  } catch (e) {
    console.error("⚠️ Không load được cookie:", e.message);
  }
}

/* ============== JSON WALKER =============== */
function extractMedia(obj, results = []) {
  if (!obj || typeof obj !== "object") return results;

  if (Array.isArray(obj)) {
    obj.forEach(i => extractMedia(i, results));
    return results;
  }

  if (typeof obj.base_url === "string" && obj.base_url.includes(".mp4")) {
    results.push({ type: "video", url: obj.base_url });
  }

  if (typeof obj.playable_url === "string" && obj.playable_url.includes(".mp4")) {
    results.push({ type: "video", url: obj.playable_url });
  }

  if (
    typeof obj.uri === "string" &&
    /\.(jpg|jpeg|png|webp)(\?|$)/i.test(obj.uri)
  ) {
    results.push({ type: "image", url: obj.uri });
  }

  for (const k of Object.keys(obj)) {
    extractMedia(obj[k], results);
  }

  return results;
}

/* ================= MAIN ================= */
async function main() {
  const url = process.argv[2];
  if (!url) {
    console.log(JSON.stringify({
      success: false,
      error: "Missing Facebook URL"
    }));
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    executablePath:
      process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath()
  });

  let media = [];

  try {
    const page = await browser.newPage();
    await loadCookies(page);

    console.error("🌐 Đang mở:", url);
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
    await new Promise(r => setTimeout(r, 6000));

    let scripts = await page.$$eval("script", els =>
      els.map(e => e.innerText).filter(t =>
        t && (
          t.includes("base_url") ||
          t.includes("playable_url") ||
          t.includes("__bbox")
        )
      )
    );

    const nextData = await page
      .$eval("#__NEXT_DATA__", el => el.innerText)
      .catch(() => null);

    if (nextData) scripts.push(nextData);

    for (const s of scripts) {
      try {
        const json = JSON.parse(s);
        extractMedia(json, media);
      } catch {}
    }

    media = [...new Map(media.map(m => [m.url, m])).values()];

  } catch (e) {
    console.log(JSON.stringify({
      success: false,
      error: e.message
    }));
    return;
  } finally {
    await browser.close();
  }

  /* ======= JSON OUTPUT DUY NHẤT ======= */
  console.log(JSON.stringify({
    success: true,
    count: {
      videos: media.filter(m => m.type === "video").length,
      images: media.filter(m => m.type === "image").length,
      total: media.length
    },
    media
  }));
}

main();
