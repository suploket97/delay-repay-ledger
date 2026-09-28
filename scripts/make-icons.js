// Renders the PNG icons from the SVG sources. Run: node scripts/make-icons.js (needs Playwright)
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path");
const jobs = [
  ["icon.svg", "icon-192.png", 192], ["icon.svg", "icon-512.png", 512],
  ["icon-square.svg", "maskable-512.png", 512], ["icon-square.svg", "apple-touch-icon.png", 180]
];
(async () => {
  const b = await chromium.launch();
  for (const [src, out, size] of jobs) {
    const svg = fs.readFileSync(path.join(__dirname, src), "utf8");
    const p = await b.newPage({ viewport: { width: size, height: size } });
    await p.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`);
    await p.screenshot({ path: path.join(__dirname, "..", "icons", out), omitBackground: true });
    await p.close();
  }
  await b.close();
  console.log("icons written");
})();
