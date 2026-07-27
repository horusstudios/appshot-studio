import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { renderFrame, CANVAS_CSS } from '../core/render.js';
import { googleFontsHref } from '../core/fonts.js';
import { getDevice } from '../core/devices.js';
import { ROOT, projectDir, loadProject } from '../server/store.js';
import { startServer } from '../server/index.js';
import { parseFrameSelector } from '../core/project.js';
import { localizedFrame, baseLocale } from '../core/l10n.js';

// Find a Chromium/Chrome binary already on this machine.
export function findChromium() {
  if (process.env.APPSHOT_CHROME && fs.existsSync(process.env.APPSHOT_CHROME)) {
    return process.env.APPSHOT_CHROME;
  }
  const candidates = [];
  const pwCache = path.join(os.homedir(), 'Library/Caches/ms-playwright');
  const pwCacheLinux = path.join(os.homedir(), '.cache/ms-playwright');
  for (const cache of [pwCache, pwCacheLinux]) {
    if (!fs.existsSync(cache)) continue;
    const dirs = fs
      .readdirSync(cache)
      .filter((d) => d.startsWith('chromium-'))
      .sort((a, b) => parseInt(b.split('-')[1] || 0) - parseInt(a.split('-')[1] || 0));
    for (const d of dirs) {
      candidates.push(
        path.join(cache, d, 'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
        path.join(cache, d, 'chrome-mac/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
        path.join(cache, d, 'chrome-mac-arm64/Chromium.app/Contents/MacOS/Chromium'),
        path.join(cache, d, 'chrome-linux/chrome')
      );
    }
  }
  candidates.push(
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium'
  );
  const found = candidates.find((c) => fs.existsSync(c));
  if (!found) {
    throw new Error(
      'No Chromium found. Install one with:  npx playwright install chromium\n' +
        'or point APPSHOT_CHROME at a Chrome binary.'
    );
  }
  return found;
}

function pageHTML({ project, deviceId, frames, orientation, offline, locale }) {
  const bodies = frames
    .map((f) => renderFrame({ frame: f, project, deviceId, orientation, locale }).html)
    .join('\n');
  return `<!doctype html>
<html><head><meta charset="utf-8">
${offline ? '' : `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${googleFontsHref()}">`}
<style>
  html,body{margin:0;padding:0;background:#000;}
  body{display:flex;flex-direction:column;align-items:flex-start;}
  ${CANVAS_CSS}
</style>
</head><body>${bodies}</body></html>`;
}

const slug = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

/**
 * Render a project to PNG/JPEG files.
 * @returns {Promise<{outDir:string, files:string[]}>}
 */
export async function renderProject(name, opts = {}) {
  const project = loadProject(name);
  const devices = opts.devices && opts.devices.length ? opts.devices : project.devices;
  const orientation = opts.orientation || project.orientation || 'portrait';
  const format = opts.format === 'jpg' || opts.format === 'jpeg' ? 'jpeg' : 'png';
  const outRoot = opts.out
    ? path.resolve(opts.out)
    : path.join(ROOT, 'out', name);

  const allFrames = project.frames;
  if (!allFrames.length) throw new Error(`Project "${name}" has no frames yet.`);
  const picks = parseFrameSelector(opts.frames, allFrames.length);
  const frames = picks.map((i) => allFrames[i]);

  const srv = await startServer({ port: 0 });
  const browser = await chromium.launch({
    executablePath: findChromium(),
    args: ['--force-color-profile=srgb', '--font-render-hinting=none', '--disable-lcd-text'],
  });

  const locales = opts.locales && opts.locales.length
    ? opts.locales
    : project.locales && project.locales.length
    ? project.locales
    : [null];
  const multiLocale = locales.length > 1;

  const written = [];
  try {
    for (const locale of locales) {
    for (const deviceId of devices) {
      const dev = getDevice(deviceId);
      const w = orientation === 'landscape' ? dev.height : dev.width;
      const h = orientation === 'landscape' ? dev.width : dev.height;

      const html = pageHTML({ project, deviceId, frames, orientation, offline: opts.offline, locale });
      const htmlPath = path.join(projectDir(name), `.render-${deviceId}.html`);
      fs.writeFileSync(htmlPath, html);

      const page = await browser.newPage({
        viewport: { width: Math.min(w, 2400), height: 1400 },
        deviceScaleFactor: 1,
      });
      await page.goto(
        `${srv.url}/projects/${encodeURIComponent(name)}/.render-${deviceId}.html`,
        { waitUntil: 'load' }
      );
      await page
        .evaluate(() => document.fonts && document.fonts.ready)
        .catch(() => {});
      await page.evaluate(async () => {
        const imgs = [...document.images];
        await Promise.all(
          imgs.map((i) =>
            i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; })
          )
        );
      });
      await page.waitForTimeout(opts.settle ?? 250);

      // Tek dilli projelerde yol değişmesin diye dil klasörü sadece çok dilde açılır.
      const outDir = multiLocale
        ? path.join(outRoot, locale, deviceId)
        : path.join(outRoot, deviceId);
      fs.mkdirSync(outDir, { recursive: true });

      const handles = await page.$$('.ash-canvas');
      for (let i = 0; i < handles.length; i++) {
        const frame = localizedFrame(frames[i], locale, baseLocale(project));
        const n = String(picks[i] + 1).padStart(2, '0');
        const label = slug(frame.title) || `frame-${n}`;
        const file = path.join(outDir, `${n}-${label}.${format === 'jpeg' ? 'jpg' : 'png'}`);
        await handles[i].screenshot({
          path: file,
          type: format,
          ...(format === 'jpeg' ? { quality: opts.quality ?? 92 } : {}),
          scale: 'css',
        });
        written.push(file);
        if (opts.onProgress) opts.onProgress({ deviceId, index: i, file, total: handles.length });
      }
      await page.close();
      fs.unlinkSync(htmlPath);

      // Safety net: confirm the exported size matches what the store expects.
      if (opts.verify !== false && written.length) {
        const last = written[written.length - 1];
        const dims = pngSize(last);
        if (dims && (dims.w !== w || dims.h !== h)) {
          console.warn(
            `  ! ${path.basename(last)} is ${dims.w}x${dims.h}, expected ${w}x${h}`
          );
        }
      }
    }
    }
  } finally {
    await browser.close();
    srv.close();
  }

  return { outDir: outRoot, files: written };
}

function pngSize(file) {
  try {
    const fd = fs.openSync(file, 'r');
    const buf = Buffer.alloc(24);
    fs.readSync(fd, buf, 0, 24, 0);
    fs.closeSync(fd);
    if (buf.slice(1, 4).toString() !== 'PNG') return null;
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  } catch {
    return null;
  }
}
