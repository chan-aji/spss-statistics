import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'

const publicDir = 'D:/spss/app/public'
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true })
}

const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#125bc4"/>
      <stop offset="100%" stop-color="#053075"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-opacity="0.3"/>
    </filter>
  </defs>
  <!-- Background with rounded corners -->
  <rect width="512" height="512" rx="104" fill="url(#bg)"/>
  <!-- SPSS statistical emblem bars -->
  <g filter="url(#shadow)">
    <rect x="100" y="240" width="60" height="170" rx="8" fill="#ffffff" opacity="0.95"/>
    <rect x="190" y="170" width="60" height="240" rx="8" fill="#ffffff" opacity="0.95"/>
    <rect x="280" y="100" width="60" height="310" rx="8" fill="#ffffff" opacity="0.95"/>
    <!-- Ascending trend arrow or curve -->
    <path d="M 130 220 Q 230 140 370 80" stroke="#4589ff" stroke-width="14" stroke-linecap="round" fill="none"/>
    <polygon points="370,65 395,85 365,100" fill="#4589ff"/>
  </g>
  <!-- Text Label -->
  <text x="256" y="468" font-family="Arial, Helvetica, sans-serif" font-size="44" font-weight="bold" fill="#ffffff" text-anchor="middle" letter-spacing="2">SPSS</text>
</svg>
`

async function generate() {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu'],
  })

  const page = await browser.newPage()
  await page.setContent(`<!doctype html><html><body style="margin:0;background:transparent;display:flex;align-items:center;justify-content:center;">${svgContent}</body></html>`)

  // Render 512x512
  await page.setViewport({ width: 512, height: 512, deviceScaleFactor: 1 })
  await page.screenshot({ path: path.join(publicDir, 'icon-512.png'), omitBackground: true })
  console.log('Generated icon-512.png')

  // Render 192x192
  await page.setViewport({ width: 192, height: 192, deviceScaleFactor: 1 })
  await page.screenshot({ path: path.join(publicDir, 'icon-192.png'), omitBackground: true })
  console.log('Generated icon-192.png')

  // Also save favicon.svg
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent.trim())
  console.log('Generated favicon.svg')

  await browser.close()
}

generate().catch(console.error)
