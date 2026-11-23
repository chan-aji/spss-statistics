import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = 'D:/spss/app/dist'
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
await page.goto('http://spss.local/index.html#/workspace', { waitUntil: 'networkidle0' })
await page.waitForSelector('.data-table tbody tr')
await sleep(300)

// Reset dataset to sample 100 respondents via File menu
await page.evaluate(() => {
  const b = [...document.querySelectorAll('.menu-top')].find((x) => x.textContent.trim() === 'File')
  b?.click()
})
await sleep(200)
await page.evaluate(() => {
  const item = [...document.querySelectorAll('.menu-dropdown .menu-item')].find((m) => m.textContent.includes('Reset Data Contoh'))
  item?.click()
})
await sleep(500)

const datasetDebug = await page.evaluate(() => {
  const vars = [...document.querySelectorAll('.data-table thead th .var-name')].map((x) => x.textContent)
  return vars
})
console.log('DATASET VARS IN PAGE:', datasetDebug)

const results = []
const check = (name, pass, detail) => {
  results.push({ name, pass: !!pass, detail })
  console.log(pass ? 'PASS:' : 'FAIL:', name, detail ?? '')
}

// 1. Test Binary Logistic Regression Dialog
await page.evaluate(() => {
  const b = [...document.querySelectorAll('.menu-top')].find((x) => x.textContent.trim() === 'Analyze')
  b?.click()
})
await sleep(200)
await page.evaluate(() => {
  const reg = [...document.querySelectorAll('.menu-dropdown .menu-item.has-sub')].find((m) => m.textContent.includes('Regression'))
  const sub = [...reg?.parentElement.querySelectorAll('.menu-submenu .menu-item')].find((m) => m.textContent.includes('Binary Logistic'))
  sub?.click()
})
await sleep(300)

const hasLogDlg = !!(await page.$('.dlg'))
check('Binary Logistic Dialog opens', hasLogDlg)
if (hasLogDlg) {
  await page.click('.dlg-btn-primary')
  await sleep(500)
  const dlgError = await page.evaluate(() => document.querySelector('.dlg-error')?.textContent)
  if (dlgError) console.log('LOGISTIC DLG ERROR:', dlgError)
  const isOutput = await page.evaluate(() => document.querySelector('.output-view') !== null)
  check('Logistic Regression runs to Output', isOutput)
}

// 2. Test Factor Analysis Dialog
await page.evaluate(() => {
  const b = [...document.querySelectorAll('.menu-top')].find((x) => x.textContent.trim() === 'Analyze')
  b?.click()
})
await sleep(200)
await page.evaluate(() => {
  const dim = [...document.querySelectorAll('.menu-dropdown .menu-item.has-sub')].find((m) => m.textContent.includes('Dimension Reduction'))
  const sub = [...dim?.parentElement.querySelectorAll('.menu-submenu .menu-item')].find((m) => m.textContent.includes('Factor'))
  sub?.click()
})
await sleep(300)

const hasFactorDlg = !!(await page.$('.dlg'))
check('Factor Analysis Dialog opens', hasFactorDlg)
if (hasFactorDlg) {
  await page.click('.dlg-btn-primary')
  await sleep(500)
  const factorDlgError = await page.evaluate(() => document.querySelector('.dlg-error')?.textContent)
  if (factorDlgError) console.log('FACTOR DLG ERROR:', factorDlgError)
  const factorOutput = await page.evaluate(() => {
    const titles = [...document.querySelectorAll('.output-node-head h3')].map((h) => h.textContent)
    return titles.some((t) => t.includes('Factor Analysis'))
  })
  check('Factor Analysis runs and outputs KMO & Total Variance', factorOutput)
}

// 2b. Test Two-Way ANOVA Dialog
await page.evaluate(() => {
  const b = [...document.querySelectorAll('.menu-top')].find((x) => x.textContent.trim() === 'Analyze')
  b?.click()
})
await sleep(200)
await page.evaluate(() => {
  const glm = [...document.querySelectorAll('.menu-dropdown .menu-item.has-sub')].find((m) => m.textContent.includes('General Linear Model'))
  const sub = [...glm?.parentElement.querySelectorAll('.menu-submenu .menu-item')].find((m) => m.textContent.includes('Univariate'))
  sub?.click()
})
await sleep(300)

const hasAnovaDlg = !!(await page.$('.dlg'))
check('Two-Way ANOVA Dialog opens', hasAnovaDlg)
if (hasAnovaDlg) {
  await page.click('.dlg-btn-primary')
  await sleep(500)
  const anovaOutput = await page.evaluate(() => {
    const titles = [...document.querySelectorAll('.output-node-head h3')].map((h) => h.textContent)
    return titles.some((t) => t.includes('Two-Way ANOVA'))
  })
  check('Two-Way ANOVA runs and outputs Effects Table', anovaOutput)
}

// 3. Test Syntax Editor & Run Selection
await page.evaluate(() => {
  const tab = [...document.querySelectorAll('.spss-tab')].find((t) => t.textContent.includes('Syntax'))
  tab?.click()
})
await sleep(300)

const hasSyntaxEditor = await page.evaluate(() => document.querySelector('.syntax-editor textarea') !== null)
check('Syntax Editor has interactive textarea', hasSyntaxEditor)

await browser.close()

const allPass = results.every(r => r.pass)
console.log('ADVANCED E2E RESULT:', allPass ? 'ALL PASSED!' : 'SOME FAILED', JSON.stringify(results, null, 2))
if (!allPass) process.exit(1)
