const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

async function loadCookies(page) {
  try {
    const cookiePath = path.join(__dirname, 'cookie_clean.json');
    const raw = fs.readFileSync(cookiePath, 'utf8');
    const cookies = JSON.parse(raw);
    await page.setCookie(...cookies);
    console.log('🍪 Cookie loaded OK');
  } catch (e) {
    console.log('⚠️ Không load được cookie:', e.message);
  }
}

function extractMedia(obj, results = []) {
  if (!obj || typeof obj !== 'object') return results;

  if (Array.isArray(obj)) {
    obj.forEach(i => extractMedia(i, results));
    return results;
  }

  if (typeof obj.base_url === 'string' && obj.base_url.includes('.mp4')) {
    results.push({ type: 'video', url: obj.base_url });
  }

  if (typeof obj.playable_url === 'string' && obj.playable_url.includes('.mp4')) {
    results.push({ type: 'video', url: obj.playable_url });
  }

  if (
    typeof obj.uri === 'string' &&
    /\.(jpg|jpeg|png|webp)(\?|$)/i.test(obj.uri)
  ) {
    results.push({ type: 'image', url: obj.uri });
  }

  for (const k of Object.keys(obj)) {
    extractMedia(obj[k], results);
  }

  return results;
}

async function fbDownload(url) {
  if (!url) {
    throw new Error('Missing Facebook URL');
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath:
      process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath()
  });

  try {
    const page = await browser.newPage();
    await loadCookies(page);

    console.log('🌐 Đang mở:', url);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    await new Promise(r => setTimeout(r, 6000));

    let scripts = await page.$$eval('script', els =>
      els
        .map(e => e.innerText)
        .filter(
          t =>
            t &&
            (t.includes('base_url') ||
              t.includes('playable_url') ||
              t.includes('__bbox') ||
              t.includes('dash_manifest'))
        )
    );

    const nextData = await page
      .$eval('#__NEXT_DATA__', el => el.innerText)
      .catch(() => null);

    if (nextData) scripts.push(nextData);

    let media = [];
    for (const s of scripts) {
      try {
        extractMedia(JSON.parse(s), media);
      } catch {}
    }

    media = [...new Map(media.map(m => [m.url, m])).values()];

    const videos = media.filter(m => m.type === 'video');
    const images = media.filter(m => m.type === 'image');

    // ✅ RETURN RÕ RÀNG
    return {
      count: {
        videos: videos.length,
        images: images.length,
        total: media.length
      },
      media: {
        videos,
        images
      }
    };
  } finally {
    await browser.close();
  }
}

module.exports = fbDownload;
