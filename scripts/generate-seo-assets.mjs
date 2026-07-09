import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const sourcePath = path.join(rootDir, 'src/app/lib/demoContent.ts');
const publicDir = path.join(rootDir, 'public');
const robotsPath = path.join(publicDir, 'robots.txt');
const sitemapPath = path.join(publicDir, 'sitemap.xml');
const siteUrl = (process.env.SITE_URL || process.env.VITE_SITE_URL || 'http://localhost:4173').replace(/\/+$/, '');

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097F]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function extractSection(content, startToken, endToken) {
  const start = content.indexOf(startToken);
  if (start === -1) {
    return '';
  }

  const end = endToken ? content.indexOf(endToken, start) : -1;
  return content.slice(start, end === -1 ? undefined : end);
}

const source = fs.readFileSync(sourcePath, 'utf8');
const categorySeedBlock = extractSection(source, 'const categorySeed = [', '];\n\nexport const DEMO_CATEGORIES');
const articleBlock = extractSection(source, 'export const DEMO_ARTICLES: PublicArticle[] = Array.from', 'export const DEMO_BREAKING_NEWS');

const categoryNames = Array.from(categorySeedBlock.matchAll(/name:\s*'([^']+)'/g)).map(match => match[1]);
const categorySlugs = new Set(categoryNames.map(slugify).filter(Boolean));
const articleSlugs = new Set(Array.from(articleBlock.matchAll(/slug:\s*'([^']+)'/g)).map(match => match[1]).filter(Boolean));

const urls = [
  '/',
  '/search',
  ...Array.from(categorySlugs).map(slug => `/category/${slug}`),
  ...Array.from(articleSlugs).map(slug => `/article/${slug}`),
];

const now = new Date().toISOString();
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls
    .map(url => `  <url>\n    <loc>${siteUrl}${url}</loc>\n    <lastmod>${now}</lastmod>\n  </url>`)
    .join('\n') +
  '\n</urlset>\n';

const robots = `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`;

fs.mkdirSync(publicDir, { recursive: true });
fs.writeFileSync(robotsPath, robots, 'utf8');
fs.writeFileSync(sitemapPath, sitemap, 'utf8');

console.log(`Wrote ${path.relative(rootDir, robotsPath)} and ${path.relative(rootDir, sitemapPath)}.`);
