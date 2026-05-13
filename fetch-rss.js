import fetch from 'node-fetch';
import { XMLParser } from 'fast-xml-parser';
import fs from 'fs';
import path from 'path';

const NOTE_RSS = 'https://note.com/nocey/rss';
const SITE_TITLE = 'Nose x Note';
const SITE_URL = 'https://nosemami.com';
const NOTE_URL = 'https://note.com/nocey';

// dist フォルダを準備
if (!fs.existsSync('dist')) fs.mkdirSync('dist');

// RSS取得
console.log('Fetching RSS from note...');
let articles = [];

try {
  const res = await fetch(NOTE_RSS, {
    headers: { 'User-Agent': 'nosemami-site/1.0' }
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const xml = await res.text();
  const parser = new XMLParser({ ignoreAttributes: false });
  const result = parser.parse(xml);

  const items = result?.rss?.channel?.item ?? [];
  const rawItems = Array.isArray(items) ? items : [items];

  articles = rawItems.slice(0, 12).map((item, i) => {
    const title = item.title ?? '無題';
    const link  = item.link  ?? NOTE_URL;
    const desc  = item.description
      ? item.description.replace(/<[^>]*>/g, '').slice(0, 100)
      : '';
    const rawDate = item.pubDate ?? item['dc:date'] ?? '';
    const date = rawDate
      ? new Date(rawDate).toLocaleDateString('ja-JP', {
          year: 'numeric', month: 'long', day: 'numeric'
        })
      : '';
    const dateShort = rawDate
      ? new Date(rawDate).toISOString().slice(0, 10).replace(/-/g, '.')
      : '';

    // カテゴリはタグ or デフォルト
    const cats = item.category
      ? Array.isArray(item.category)
        ? item.category
        : [item.category]
      : [];
    const category = cats[0] ?? 'Note';

    return { title, link, desc, date, dateShort, category, image: '', index: i + 1 };
  });

  console.log(`Fetched ${articles.length} articles.`);

  // 最新記事1件だけOGP画像をスクレイピング
  if (articles.length > 0) {
    try {
      console.log(`Fetching OGP image for: ${articles[0].link}`);
      const pageRes = await fetch(articles[0].link, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; nosemami-bot/1.0)' }
      });
      if (pageRes.ok) {
        const pageHtml = await pageRes.text();
        const ogMatch = pageHtml.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
                     ?? pageHtml.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
        if (ogMatch) {
          articles[0].image = ogMatch[1];
          console.log(`OGP image found: ${articles[0].image}`);
        }
      }
    } catch (e) {
      console.warn('OGP fetch failed:', e.message);
    }
  }
} catch (e) {
  console.error('RSS fetch failed:', e.message);
  // フォールバック: 空の状態でサイトは生成する
}

// カード HTML 生成
function articleCards(list) {
  return list.map(a => `
    <a class="card" href="${a.link}" target="_blank" rel="noopener">
      <div class="card-body">
        <div class="card-cat">${a.category}</div>
        <div class="card-title">${a.title}</div>
        <div class="card-excerpt">${a.desc}</div>
        <div class="card-date">${a.dateShort}</div>
      </div>
    </a>`).join('');
}

// ヒーロー
const hero = articles[0] ?? {
  title: '記事を読み込み中...',
  link: NOTE_URL,
  desc: '',
  date: '',
  dateShort: '',
  category: 'Note',
  index: 1
};

const heroWords = hero.title.split('');
// 全角文字で最初の区切りをさがしてアクセントワード設定 (最初の読点/句点までをプレーン、その後をアクセント)
let heroHTML = hero.title;
const splitIdx = Math.floor(hero.title.length / 2);
const h1 = hero.title.slice(0, splitIdx);
const h2 = hero.title.slice(splitIdx);
heroHTML = `${h1}<span class="accent">${h2}</span>`;

const restArticles = articles.slice(1, 7);

// HTML生成
const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${SITE_TITLE}</title>
<meta name="description" content="${SITE_TITLE} — noteの記事を独自ドメインで読む">
<meta property="og:title" content="${SITE_TITLE}">
<meta property="og:url" content="${SITE_URL}">
<meta property="og:type" content="website">
<link rel="canonical" href="${SITE_URL}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@300;400;500;700;900&family=DM+Serif+Display&display=swap" rel="stylesheet">
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --blue: #1565C0;
  --blue-light: #90CAF9;
  --blue-pale: #E3F2FD;
  --blue-bg: #F8FBFF;
  --text: #0d0d0d;
  --text-sub: #444;
  --text-muted: #888;
  --text-faint: #bbb;
  --border: #e8e8e8;
  --font: 'Zen Kaku Gothic New', sans-serif;
  --font-serif: 'DM Serif Display', serif;
}

body {
  font-family: var(--font);
  background: #fff;
  color: var(--text);
  min-height: 100vh;
}

.wrap {
  max-width: 1200px;
  margin: 0 auto;
}

a { text-decoration: none; color: inherit; }

/* ── Header ── */
.hdr {
  padding: 0 48px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 0.5px solid var(--border);
  position: sticky;
  top: 0;
  background: rgba(255,255,255,0.96);
  backdrop-filter: blur(8px);
  z-index: 100;
}

.hdr-logo {
  font-family: var(--font-serif);
  font-size: 20px;
  color: var(--text);
  letter-spacing: 0.02em;
}

.hdr-nav {
  display: flex;
  gap: 32px;
  align-items: center;
}

.hdr-nav a {
  font-size: 11px;
  color: var(--text-muted);
  letter-spacing: 0.08em;
  transition: color 0.15s;
}

.hdr-nav a:hover { color: var(--blue); }

/* ── Hero ── */
.hero {
  display: grid;
  grid-template-columns: 1fr 220px;
  border-bottom: 0.5px solid var(--border);
}

.hero-left {
  padding: 52px 48px 48px;
  border-right: 0.5px solid var(--border);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 300px;
  max-width: 800px;
}

.hero-eyebrow {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.hero-line {
  width: 32px;
  height: 2px;
  background: var(--blue);
  border-radius: 1px;
  flex-shrink: 0;
}

.hero-cat {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.22em;
  color: var(--blue);
  text-transform: uppercase;
}

.hero-title {
  font-size: 48px;
  font-weight: 900;
  line-height: 1.35;
  color: var(--text);
  letter-spacing: -0.02em;
  margin-bottom: 28px;
}

.hero-title .accent {
  color: var(--blue);
}

.hero-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.hero-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 11px;
  color: var(--text-muted);
  flex-wrap: wrap;
}

.tag {
  display: inline-block;
  font-size: 10px;
  padding: 2px 9px;
  border: 1px solid var(--blue-light);
  border-radius: 2px;
  color: var(--blue);
  font-weight: 700;
  letter-spacing: 0.04em;
}

.hero-read {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--blue);
  text-transform: uppercase;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-bottom: 1.5px solid var(--blue);
  padding-bottom: 2px;
  transition: opacity 0.15s;
}

.hero-read:hover { opacity: 0.7; }

.hero-right {
  background: var(--blue);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
}

.hero-right-num {
  font-family: var(--font-serif);
  font-size: 96px;
  color: rgba(255,255,255,0.12);
  line-height: 1;
  letter-spacing: -0.04em;
  user-select: none;
}

.hero-right-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.24em;
  color: rgba(255,255,255,0.45);
  text-transform: uppercase;
  text-align: center;
  margin-top: 10px;
}

.hero-right-date {
  font-size: 11px;
  color: rgba(255,255,255,0.65);
  margin-top: 24px;
  letter-spacing: 0.08em;
  writing-mode: vertical-rl;
}

/* ── Divider ── */
.divider {
  height: 4px;
  background: var(--blue-pale);
  position: relative;
}

.divider::before {
  content: '';
  position: absolute;
  left: 0; top: 0;
  width: 120px; height: 4px;
  background: var(--blue);
}

/* ── Section ── */
.sec-head {
  padding: 24px 48px 0;
  display: flex;
  align-items: center;
  gap: 14px;
}

.sec-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.24em;
  color: var(--blue);
  text-transform: uppercase;
  white-space: nowrap;
}

.sec-line {
  flex: 1;
  height: 0.5px;
  background: var(--border);
}

/* ── Grid ── */
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  padding: 0 0 0 0;
}

@media (max-width: 768px) {
  .grid { grid-template-columns: 1fr; }
  .hero { grid-template-columns: 1fr; }
  .hero-right { display: none; }
  .hdr { padding: 0 20px; }
  .hero-left { padding: 32px 20px; }
  .hero-title { font-size: 28px; }
  .sec-head { padding: 20px 20px 0; }
}

.card {
  display: block;
  border-right: 0.5px solid var(--border);
  border-top: 0.5px solid var(--border);
  cursor: pointer;
  transition: background 0.15s;
  position: relative;
  overflow: hidden;
}

.card::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0;
  width: 100%; height: 3px;
  background: var(--blue);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.22s ease;
}

.card:hover::after { transform: scaleX(1); }
.card:hover { background: var(--blue-bg); }
.card:nth-child(3n) { border-right: none; }

.card-body {
  padding: 20px 24px 24px;
}

.card-cat {
  font-size: 10px;
  color: var(--blue);
  letter-spacing: 0.16em;
  font-weight: 700;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.card-title {
  font-size: 15px;
  font-weight: 700;
  line-height: 1.6;
  color: #111;
  margin-bottom: 10px;
}

.card-excerpt {
  font-size: 12px;
  color: #555;
  line-height: 1.8;
  font-weight: 300;
  margin-bottom: 14px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-date {
  font-size: 10px;
  color: var(--text-faint);
  letter-spacing: 0.06em;
}

/* ── Empty state ── */
.empty {
  grid-column: 1 / -1;
  padding: 60px 48px;
  text-align: center;
  color: var(--text-muted);
  font-size: 14px;
}

/* ── Footer ── */
.footer {
  padding: 20px 48px;
  border-top: 0.5px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--blue-bg);
  flex-wrap: wrap;
  gap: 10px;
}

.footer-l {
  font-size: 11px;
  color: #666;
  letter-spacing: 0.04em;
}

.footer-r {
  font-size: 11px;
  color: var(--blue);
  font-weight: 700;
  letter-spacing: 0.06em;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: opacity 0.15s;
}

.footer-r:hover { opacity: 0.7; }

.updated {
  font-size: 10px;
  color: var(--text-faint);
  text-align: center;
  padding: 10px;
  background: var(--blue-bg);
}
</style>
</head>
<body>

<div class="wrap">
<header class="hdr">
  <a class="hdr-logo" href="/">Nose x Note</a>
  <nav class="hdr-nav">
    <a href="/">記事一覧</a>
    <a href="${NOTE_URL}" target="_blank" rel="noopener">noteを見る</a>
  </nav>
</header>

<main>
  ${articles.length > 0 ? `
  <section class="hero">
    <div class="hero-left">
      <div>
        <div class="hero-eyebrow">
          <div class="hero-line"></div>
          <div class="hero-cat">Latest — ${hero.category}</div>
        </div>
        <a href="${hero.link}" target="_blank" rel="noopener">
          <div class="hero-title">${heroHTML}</div>
        </a>
      </div>
      <div class="hero-bottom">
        <div class="hero-meta">
          <span>${hero.date}</span>
          <span class="tag">${hero.category}</span>
        </div>
        <a class="hero-read" href="${hero.link}" target="_blank" rel="noopener">
          → noteで読む
        </a>
      </div>
    </div>
    <div class="hero-right">
      ${hero.image
        ? `<img src="${hero.image}" alt="${hero.title}" style="width:100%;height:100%;object-fit:cover;display:block;">`
        : `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:0;padding:24px 16px;">
            <div style="font-family:var(--font-serif);font-size:96px;color:rgba(255,255,255,0.12);line-height:1;letter-spacing:-0.04em;user-select:none;">01</div>
            <div style="font-size:9px;font-weight:700;letter-spacing:0.24em;color:rgba(255,255,255,0.45);text-transform:uppercase;text-align:center;margin-top:10px;">Latest<br>Article</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.65);margin-top:24px;letter-spacing:0.08em;writing-mode:vertical-rl;">${hero.dateShort}</div>
           </div>`
      }
    </div>
  </section>

  <div class="divider"></div>

  <div class="sec-head">
    <div class="sec-label">Recent Articles</div>
    <div class="sec-line"></div>
  </div>

  <div class="grid">
    ${restArticles.length > 0
      ? articleCards(restArticles)
      : '<div class="empty">記事は最新1件のみです。noteに投稿すると自動で追加されます。</div>'
    }
  </div>
  ` : `
  <div style="padding:80px 48px;text-align:center;color:#888;">
    <p style="font-size:16px;margin-bottom:8px">記事を読み込んでいます...</p>
    <p style="font-size:12px"><a href="${NOTE_URL}" style="color:#1565C0">noteを直接見る →</a></p>
  </div>
  `}
</main>

<footer class="footer">
  <div class="footer-l">© ${new Date().getFullYear()} Nose x Note</div>
  <a class="footer-r" href="${NOTE_URL}" target="_blank" rel="noopener">
    ↗ noteでもフォロー
  </a>
</footer>
<p class="updated">最終更新: ${new Date().toLocaleString('ja-JP', {timeZone:'Asia/Tokyo'})}</p>
</div>

</body>
</html>`;

fs.writeFileSync('dist/index.html', html, 'utf-8');
console.log('Built dist/index.html');
