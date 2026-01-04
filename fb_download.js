const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

/* ================= COOKIE ================= */
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

/* ============== JSON WALKER =============== */
function extractMedia(obj, results = []) {
  if (!obj || typeof obj !== 'object') return results;

  if (Array.isArray(obj)) {
    obj.forEach(i => extractMedia(i, results));
    return results;
  }

  // video
  if (typeof obj.base_url === 'string' && obj.base_url.includes('.mp4')) {
    results.push({ type: 'video', url: obj.base_url });
  }

  if (typeof obj.playable_url === 'string' && obj.playable_url.includes('.mp4')) {
    results.push({ type: 'video', url: obj.playable_url });
  }

  // image
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

/* ================= CORE FUNCTION ================= */
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

    // chờ FB render
    await new Promise(r => setTimeout(r, 6000));

    // lấy script chứa json
    let scripts = await page.$$eval('script', els =>
      els
        .map(e => e.innerText)
        .filter(
          t =>
            t &&
            (t.includes('base_url') ||
              t.includes('playable_url') ||
              t.includes('__bbox'))
        )
    );

    // NEXT DATA (reel / story)
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

    // dedupe theo url
    media = [...new Map(media.map(m => [m.url, m])).values()];

    const videos = media.filter(m => m.type === 'video').map(v => v.url);
    const images = media.filter(m => m.type === 'image').map(i => i.url);

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

/* ================= EXPORT ================= */
module.exports = fbDownload;

/* ================= CLI RUNNER ================= */
/* QUAN TRỌNG: đoạn này giúp stdout KHÔNG BAO GIỜ RỖNG */
if (require.main === module) {
  const url = process.argv[2];

  fbDownload(url)
    .then(result => {
      console.log(JSON.stringify({
        success: true,
        ...result
      }));
    })
    .catch(err => {
      console.error(JSON.stringify({
        success: false,
        error: err.message
      }, null, 2));
      process.exit(1);
    });
}
