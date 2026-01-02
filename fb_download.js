const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

/* ================= COOKIE ================= */
async function loadCookies(page) {
  try {
    const raw = fs.readFileSync('cookie_clean.json', 'utf8');
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

/* ============== HTML RESULT =============== */
function generateHTML(media) {
  const videos = media.filter(m => m.type === 'video');
  const images = media.filter(m => m.type === 'image');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>FB Result</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/css/bootstrap.min.css">
<style>
video { width: 100%; max-height: 500px; margin-bottom: 15px; }
img { width: 100%; margin-bottom: 15px; }
</style>
</head>
<body>
<div class="container mt-4">

<h3>🎬 Videos</h3>
${videos.map(v => `
  <video controls src="${v.url}"></video>
  <p><a href="${v.url}" target="_blank">${v.url}</a></p>
`).join('')}

<hr>

<h3>🖼 Images</h3>
<div class="row">
${images.map(i => `
  <div class="col-md-3">
    <a href="${i.url}" target="_blank">
      <img src="${i.url}">
    </a>
  </div>
`).join('')}
</div>

</div>
</body>
</html>`;
}

/* ================= MAIN ================= */
async function main() {
  const url = process.argv[2];
  if (!url) {
    console.log('❌ Thiếu link Facebook');
    process.exit(1);
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

    // sleep thay waitForTimeout
    await new Promise(r => setTimeout(r, 6000));

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

    // STORY / NEXT DATA
    const nextData = await page
      .$eval('#__NEXT_DATA__', el => el.innerText)
      .catch(() => null);
    if (nextData) scripts.push(nextData);

    let media = [];
    for (const s of scripts) {
      try {
        const json = JSON.parse(s);
        extractMedia(json, media);
      } catch {}
    }

    // unique theo url
    media = [...new Map(media.map(m => [m.url, m])).values()];

    if (media.length === 0) {
      console.log('❌ Không tìm thấy media');
      return;
    }

    const html = generateHTML(media);
    fs.writeFileSync('result.html', html, 'utf8');
    console.log('✅ Đã tạo: result.html');
  } catch (e) {
    console.error('❌ Lỗi:', e.message);
  } finally {
    await browser.close();
  }
}

main();
