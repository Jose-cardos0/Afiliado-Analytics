/**
 * Standalone Shopee scraper using puppeteer-extra + stealth.
 * Usage: node scripts/shopee-scraper.cjs <url>
 * Outputs JSON: { productName, media: [{ url, type, label }] }
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const VIDEO_RE = /\.(mp4|m3u8|webm)(\?|$)/i;
const CDN_RE = /susercontent\.com|cv\.shopee|cvf\.shopee|down-.*\.img|down-.*\.vod/i;

function fullSizeUrl(url) {
  return url.replace(/@resize_w\d+[^.]*/g, '').replace(/_tn(\.\w+)$/, '$1');
}

async function scrape(url) {
  const videos = new Set();
  const images = new Set();
  const apiVideoUrls = [];

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,800'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setRequestInterception(true);

    // Intercept network requests
    page.on('request', (req) => {
      const u = req.url();
      const t = req.resourceType();
      if (t === 'font') { req.abort(); return; }

      if (CDN_RE.test(u)) {
        if (VIDEO_RE.test(u) || t === 'media') {
          videos.add(u);
        } else if (u.includes('/file/') && /\.(jpg|jpeg|png|webp|gif)/i.test(u) && !u.includes('icon') && !u.includes('favicon')) {
          images.add(fullSizeUrl(u));
        }
      }
      req.continue();
    });

    // Intercept API responses for video URLs
    page.on('response', async (response) => {
      const u = response.url();
      if (u.includes('v4/item/get') || u.includes('pdp/get')) {
        try {
          const json = await response.json();
          const data = json.data || json;
          if (data.video_info_list) {
            for (const vi of data.video_info_list) {
              const vUrl = vi.default_format?.url || vi.video_url || '';
              if (vUrl) apiVideoUrls.push(vUrl.startsWith('//') ? 'https:' + vUrl : vUrl);
              const thumbUrl = vi.thumb_url || vi.cover || '';
              if (thumbUrl) images.add(fullSizeUrl(thumbUrl.startsWith('//') ? 'https:' + thumbUrl : thumbUrl));
            }
          }
          if (data.images) {
            for (const imgHash of data.images) {
              const imgUrl = `https://down-br.img.susercontent.com/file/${imgHash}`;
              images.add(imgUrl);
            }
          }
        } catch { /* response wasn't JSON */ }
      }
    });

    // Navigate
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });
    } catch { /* partial load ok */ }

    // Wait for images to render
    try {
      await page.waitForSelector('img[src*="susercontent"]', { timeout: 10000 });
    } catch { /* best effort */ }

    // Click on thumbnails to trigger video loading
    await page.evaluate(() => {
      // Click first carousel thumbnail (video thumb is usually first)
      const allImgs = Array.from(document.querySelectorAll('img[src*="susercontent"]'));
      if (allImgs.length > 0) allImgs[0].click();
    });
    await new Promise(r => setTimeout(r, 2000));

    // Try clicking play button / video element
    await page.evaluate(() => {
      const playElements = document.querySelectorAll('video, [class*="play"], [class*="video-player"], [aria-label*="video"], [aria-label*="play"]');
      playElements.forEach(el => { try { el.click(); } catch {} });
      const svgs = document.querySelectorAll('svg');
      svgs.forEach(svg => {
        if (svg.closest('[class*="video"]') || svg.closest('[class*="play"]')) {
          try { svg.click(); svg.parentElement?.click(); } catch {}
        }
      });
    });
    await new Promise(r => setTimeout(r, 4000));

    // Gather DOM images
    const domImgs = await page.evaluate(() =>
      Array.from(document.querySelectorAll('img[src*="susercontent"]'))
        .map(i => i.src)
        .filter(s => s.includes('/file/'))
    );
    for (const img of domImgs) images.add(fullSizeUrl(img));

    // Gather DOM video sources
    const domVids = await page.evaluate(() =>
      Array.from(document.querySelectorAll('video, video source'))
        .map(el => el.src || el.getAttribute('src'))
        .filter(s => s && !s.startsWith('blob:'))
    );
    for (const v of domVids) videos.add(v);

    // Add API-found videos
    for (const v of apiVideoUrls) videos.add(v);

    // Product name
    const productName = await page.evaluate(() => {
      for (const sel of ['[data-sqe="name"]', 'h1', '[class*="AttrsTitle"]', '[class*="product-title"]']) {
        const el = document.querySelector(sel);
        if (el?.textContent && el.textContent.trim().length > 3) return el.textContent.trim();
      }
      return '';
    });

    // Build result
    const media = [];
    [...videos].forEach((u, i) => media.push({ url: u, type: 'video', label: `Vídeo ${i + 1}` }));
    [...images].slice(0, 20).forEach((u, i) => media.push({ url: u, type: 'image', label: `Imagem ${i + 1}` }));

    return { productName: productName || 'Produto Shopee', media };
  } finally {
    await browser.close();
  }
}

const url = process.argv[2];
if (!url) {
  process.stdout.write(JSON.stringify({ error: 'URL required' }));
  process.exit(1);
}

scrape(url)
  .then(r => { process.stdout.write(JSON.stringify(r)); process.exit(0); })
  .catch(e => { process.stdout.write(JSON.stringify({ error: e.message || 'Falha' })); process.exit(0); });
