import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = 'D:/spss/app/dist'
const OUT = 'D:/spss/checks/sav-e2e'
fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(OUT, { recursive: true })
const DL = path.join(OUT, 'downloads')
fs.mkdirSync(DL)

const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json',
  '.sav': 'application/x-spss-sav',
}

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  userDataDir: 'D:/spss/app/.chrome-verify',
  args: ['--no-sandbox', '--disable-gpu', '--force-device-scale-factor=1', '--disable-dev-shm-usage'],
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
})

const page = await browser.newPage()
const client = await page.target().createCDPSession()
await client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: DL })

await page.setRequestInterception(true)
page.on('request', (req) => {
  const url = new URL(req.url())
  if (url.hostname !== 'spss.local') return req.abort()
  let p = decodeURIComponent(url.pathname)
  if (p === '/' || p === '') p = '/index.html'
  const file = path.join(ROOT, p)
  if (fs.existsSync(file) && fs.statSync(file).isFile()) {
    req.respond({ status: 200, contentType: types[path.extname(file)] ?? 'application/octet-stream', body: fs.readFileSync(file) })
  } else {
    req.respond({ status: 404, contentType: 'text/plain', body: 'not found' })
  }
})

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const results = []
const check = (name, pass, detail) => {
  results.push({ name, pass: !!pass, detail })
  console.log(pass ? 'PASS:' : 'FAIL:', name, detail ?? '')
}

await page.goto('http://spss.local/index.html#/workspace', { waitUntil: 'networkidle0' })
await page.waitForSelector('.data-table tbody tr')
await sleep(300)

// 1. Open File menu and inspect items
await page.evaluate(() => {
  const b = [...document.querySelectorAll('.menu-top')].find((x) => x.textContent.trim() === 'File')
  b?.click()
})
await sleep(200)

const fileMenuItems = await page.evaluate(() => {
  return [...document.querySelectorAll('.menu-dropdown .menu-item')].map((m) => m.textContent.trim())
})
check('File menu items expanded', fileMenuItems.length >= 10, fileMenuItems.join(' | '))

// 2. Open Save Data As dialog
await page.evaluate(() => {
  const item = [...document.querySelectorAll('.menu-dropdown .menu-item')].find((m) => m.textContent.includes('Save As…'))
  item?.click()
})
await sleep(300)

const hasSaveAsDlg = !!(await page.$('.dlg'))
check('Save As dialog opens', hasSaveAsDlg)

// Fill filename and save
await page.type('.dlg-input', 'data_skripsi_kuantitatif')
await page.screenshot({ path: path.join(OUT, 'save-as-dialog.png') })
await page.click('.dlg-btn-primary')
await sleep(1000)

const downloaded = fs.readdirSync(DL)
check('Save As downloads file', downloaded.length > 0, downloaded.join(','))

// Dismiss SaveLocationModal if present
const confirmModalBtn = await page.$('.dlg-btn-primary')
if (confirmModalBtn) {
  await confirmModalBtn.click()
  await sleep(300)
}

// 3. Test Working File Dictionary Dialog
await page.evaluate(() => {
  const b = [...document.querySelectorAll('.menu-top')].find((x) => x.textContent.trim() === 'File')
  b?.click()
})
await sleep(200)
await page.evaluate(() => {
  const parent = [...document.querySelectorAll('.menu-dropdown .menu-item.has-sub')].find((m) => m.textContent.includes('Display Data File Information'))
  const sub = parent?.parentElement.querySelector('.menu-submenu .menu-item')
  sub?.click()
})
await sleep(300)

const hasInfoDlg = !!(await page.$('.dlg'))
check('Data File Information dialog opens', hasInfoDlg)
if (hasInfoDlg) {
  const infoTitle = await page.$eval('.dlg-title', el => el.textContent)
  check('Data File Information title correct', infoTitle.includes('File Information'), infoTitle)
  await page.screenshot({ path: path.join(OUT, 'file-info-dialog.png') })
  await page.click('.dlg-btn-primary')
  await sleep(200)
}

// 4. Test uploading a real .sav file
const downloadedFile = fs.readdirSync(DL).find(f => f.endsWith('.sav'))
const savPath = path.join(DL, downloadedFile)
const input = await page.$('input[type=file]')
await input.uploadFile(savPath)
await sleep(600)

const afterSav = await page.evaluate(() => ({
  title: document.querySelector('.spss-title-text')?.textContent,
  vars: [...document.querySelectorAll('.data-table thead th .var-name')].map((x) => x.textContent),
  rows: document.querySelectorAll('.data-table tbody tr').length,
}))
check('Native .sav upload parses correctly', afterSav.rows >= 50 && afterSav.vars.includes('X1_Harga'), JSON.stringify(afterSav))
await page.screenshot({ path: path.join(OUT, 'sav-loaded.png') })

await browser.close()

const allPass = results.every(r => r.pass)
console.log('SAV E2E RESULT:', allPass ? 'ALL PASSED!' : 'SOME FAILED', JSON.stringify(results, null, 2))
if (!allPass) process.exit(1)
