import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = 'D:/spss/app/dist'
const OUT = 'D:/spss/checks/final-round'
fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(OUT, { recursive: true })
const DL = path.join(OUT, 'downloads')
fs.mkdirSync(DL)

const report = { checks: [], consoleErrors: [], pageErrors: [] }
const ok = (name, pass, detail) => {
  report.checks.push({ name, pass: !!pass, detail })
  if (!pass) console.log('FAIL', name, detail ?? '')
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  userDataDir: 'D:/spss/app/.chrome-verify',
  args: ['--no-sandbox', '--disable-gpu', '--force-device-scale-factor=1', '--disable-dev-shm-usage'],
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
})
const page = await browser.newPage()
page.on('console', (m) => { if (m.type() === 'error') report.consoleErrors.push(m.text()) })
page.on('pageerror', (e) => report.pageErrors.push(String(e)))

const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json',
}
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

const shot = async (name, full = false) => page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: full })
const clickText = async (selector, text) => page.evaluate(({ selector, text }) => {
  const el = [...document.querySelectorAll(selector)].find((n) => n.textContent.trim() === text)
  if (!el) return false
  el.click(); return true
}, { selector, text })
const openMenu = async (label) => {
  await page.evaluate((l) => {
    const b = [...document.querySelectorAll('.menu-top')].find((x) => x.textContent.trim() === l)
    b?.click()
  }, label)
  await sleep(150)
}
const clickItem = async (text) => {
  const r = await page.evaluate((t) => {
    const b = [...document.querySelectorAll('.menu-dropdown .menu-item')].find((x) => x.textContent.trim().startsWith(t))
    if (!b) return false
    b.click(); return true
  }, text)
  await sleep(300)
  return r
}

// ---- landing ----
await page.goto('http://spss.local/index.html#/', { waitUntil: 'networkidle0' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle0' })
await page.waitForSelector('.hero h1')
await sleep(500)
const landing = await page.evaluate(() => ({
  h1: document.querySelector('.hero h1')?.innerText,
  sections: [...document.querySelectorAll('main section[id]')].map((s) => s.id),
  h2s: [...document.querySelectorAll('h2')].map((h) => h.textContent.trim()),
  facts: [...document.querySelectorAll('.hero-facts dt')].map((x) => x.textContent),
  overflow: document.documentElement.scrollWidth - innerWidth,
  height: document.documentElement.scrollHeight,
}))
report.landing = landing
ok('landing sections', landing.sections.length >= 6, landing.sections.join(','))
ok('landing facts', landing.facts.join(',') === '100,7,8', landing.facts.join(','))
ok('landing SPSS heading', landing.h2s.some((h) => h.includes('Apakah SPSS penting')), landing.h2s.join(' | '))
ok('landing no overflow 1440', landing.overflow <= 0, landing.overflow)
await shot('landing-1440', true)

// ---- workspace ----
await page.goto('http://spss.local/index.html#/workspace', { waitUntil: 'networkidle0' })
await page.waitForSelector('.data-table tbody tr')
await sleep(300)
const ws = await page.evaluate(() => ({
  rows: document.querySelectorAll('.data-table tbody tr').length,
  cols: document.querySelectorAll('.data-table thead th').length,
  title: document.querySelector('.spss-title-text')?.textContent,
  overflow: document.documentElement.scrollWidth - innerWidth,
  firstRow: [...document.querySelectorAll('.data-table tbody tr:first-child td')].map((c) => c.textContent.trim()),
}))
report.workspace = ws
ok('workspace 100 cases + add row', ws.rows === 101, ws.rows)
ok('workspace 7 variables', ws.cols === 8, ws.cols)
ok('workspace no overflow', ws.overflow <= 0, ws.overflow)
await shot('workspace-1440')

// keyboard edit + undo
await page.click('[data-cell="0-3"]')
await page.keyboard.type('5')
await page.keyboard.press('Enter')
await sleep(150)
const edited = await page.$eval('[data-cell="0-3"]', (n) => n.textContent.trim())
await page.keyboard.down('Control'); await page.keyboard.press('z'); await page.keyboard.up('Control')
await sleep(150)
const undone = await page.$eval('[data-cell="0-3"]', (n) => n.textContent.trim())
ok('cell edit + undo', edited === '5' && undone !== '5', JSON.stringify({ edited, undone }))

// ---- quick guide: 8 cards, run all 8 ----
await page.evaluate(() => document.querySelector('.toolbar-guide')?.click())
await page.waitForSelector('.quick-guide')
const guide = await page.evaluate(() => ({
  cards: document.querySelectorAll('.guide-card').length,
  titles: [...document.querySelectorAll('.guide-card strong')].map((x) => x.textContent),
}))
report.guide = guide
ok('quick guide has 8 analyses', guide.cards === 8, guide.cards)
await shot('quick-guide-1440')

const guideKinds = ['descriptives', 'reliability', 'correlation', 'regression', 'frequencies', 'onesample', 'independent', 'crosstabs']
const guideResults = []
for (let i = 0; i < guideKinds.length; i++) {
  const before = await page.evaluate(() => document.querySelectorAll('.output-node').length)
  if (!(await page.$('.quick-guide'))) {
    await page.evaluate(() => document.querySelector('.toolbar-guide')?.click())
    await page.waitForSelector('.quick-guide')
    await sleep(200)
  }
  await page.evaluate((idx) => {
    const card = document.querySelectorAll('.guide-card')[idx]
    card?.querySelector('.guide-run')?.click()
  }, i)
  await sleep(500)
  const after = await page.evaluate(() => ({
    nodes: document.querySelectorAll('.output-node').length,
    title: document.querySelector('.output-node h3')?.textContent,
    tables: document.querySelectorAll('.output-node .spss-table').length,
  }))
  guideResults.push({ kind: guideKinds[i], added: after.nodes - before, title: after.title, tables: after.tables })
  ok('guide runs ' + guideKinds[i], after.nodes > before && after.tables > 0, JSON.stringify(after))
  if (i === 0) await shot('descriptives-output-1440')
  if (i === 3) await shot('regression-output-1440')
  if (i === 4) await shot('frequencies-output-1440')
  if (i === 6) await shot('ttest-output-1440')
  if (i === 7) await shot('crosstabs-output-1440')
}
report.guideResults = guideResults
await shot('all-outputs-1440')

// ---- menu dialogs for each analysis ----
const runKinds = [
  ['Frequencies', 'Frequencies…'], ['Crosstabs', 'Crosstabs…'],
  ['One-Sample', 'One-Sample T Test…'], ['Independent', 'Independent-Samples T Test…'],
  ['Reliability', 'Reliability Analysis…'], ['Descriptives', 'Descriptives…'],
]
const menuResults = []
for (const [name, item] of runKinds) {
  const before = await page.evaluate(() => document.querySelectorAll('.output-node').length)
  await openMenu('Analyze')
  const clicked = await clickItem(item)
  const dlg = !!(await page.$('.dlg'))
  if (dlg) await page.click('.dlg-btn-primary')
  await sleep(400)
  const after = await page.evaluate(() => document.querySelectorAll('.output-node').length)
  menuResults.push({ name, clicked, dlg, added: after - before })
  ok('menu runs ' + name, dlg && after > before, JSON.stringify({ clicked, dlg, added: after - before }))
}
{
  const before = await page.evaluate(() => document.querySelectorAll('.output-node').length)
  await openMenu('Analyze')
  const sub = await page.evaluate(() => {
    const el = [...document.querySelectorAll('.menu-dropdown .menu-item.has-sub')].find((x) => x.textContent.includes('Correlate'))
    if (!el) return false
    el.parentElement.querySelector('.menu-submenu .menu-item')?.click(); return true
  })
  await sleep(300)
  const dlg = !!(await page.$('.dlg'))
  if (dlg) await page.click('.dlg-btn-primary')
  await sleep(400)
  const after = await page.evaluate(() => document.querySelectorAll('.output-node').length)
  menuResults.push({ name: 'Correlation', sub, dlg, added: after - before })
  ok('menu runs Correlation', sub && dlg && after > before, JSON.stringify({ sub, dlg, added: after - before }))
}
report.menuResults = menuResults

// ---- variable view + values ----
await page.evaluate(() => {
  const b = [...document.querySelectorAll('.spss-tab')].find((x) => x.textContent.includes('Variable View'))
  b?.click()
})
await page.waitForSelector('.variable-table')
await sleep(200)
const vv = await page.evaluate(() => ({
  rows: document.querySelectorAll('.variable-table tbody tr').length,
  headers: [...document.querySelectorAll('.variable-table thead th')].map((h) => h.textContent.trim()),
}))
report.variableView = vv
ok('variable view 7 variables + add row', vv.rows === 8, vv.rows)
await shot('variable-view-1440')
await page.click('.variable-table tbody tr:nth-child(2) .vv-dots')
await sleep(250)
ok('values dialog opens', !!(await page.$('.values-dlg')))
await shot('values-dialog-1440')
await page.evaluate(() => document.querySelector('.values-dlg .dlg-close')?.click())
await sleep(150)

// ---- CSV import ----
const csv = 'ID,Skor_A,Skor_B\n1,3,4\n2,4,5\n3,2,3\n4,5,5\n5,4,4\n'
fs.writeFileSync(path.join(OUT, 'contoh.csv'), csv)
await page.evaluate(() => {
  const b = [...document.querySelectorAll('.spss-tab')].find((x) => x.textContent.includes('Data View'))
  b?.click()
})
await sleep(150)
const input = await page.$('input[type=file]')
await input.uploadFile(path.join(OUT, 'contoh.csv'))
await sleep(700)
const imported = await page.evaluate(() => ({
  name: document.querySelector('.spss-dataset')?.textContent,
  headers: [...document.querySelectorAll('.data-table thead th .var-name')].map((x) => x.textContent),
  rows: document.querySelectorAll('.data-table tbody tr').length,
}))
report.imported = imported
ok('CSV import works', imported.rows === 6 && imported.headers.join(',') === 'ID,Skor_A,Skor_B', JSON.stringify(imported))
await shot('csv-import-1440')

// ---- export ----
const client = await page.target().createCDPSession()
await client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: DL })
await page.evaluate(() => {
  const b = [...document.querySelectorAll('.spss-tab')].find((x) => x.textContent.includes('Output'))
  b?.click()
})
await sleep(250)
await page.evaluate(() => {
  const b = [...document.querySelectorAll('.spss-tool-btn')].find((x) => x.textContent.includes('Ekspor'))
  b?.click()
})
await sleep(1200)
const files = fs.readdirSync(DL)
ok('export downloads HTML', files.some((f) => f.endsWith('.html')), files.join(','))
if (files.some((f) => f.endsWith('.html'))) {
  const html = fs.readFileSync(path.join(DL, files.find((f) => f.endsWith('.html'))), 'utf8')
  ok('export has tables', html.includes('<table'), html.length)
}

// ---- mobile ----
await page.evaluate(() => localStorage.clear())
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 })
await page.goto('http://spss.local/index.html?m=1#/workspace', { waitUntil: 'networkidle0' })
await page.waitForSelector('.data-table tbody tr')
await sleep(300)
const mob = await page.evaluate(() => ({
  overflow: document.documentElement.scrollWidth - innerWidth,
  rows: document.querySelectorAll('.data-table tbody tr').length,
}))
report.mobile = mob
ok('mobile no page overflow', mob.overflow <= 1, JSON.stringify(mob))
await shot('workspace-390')
await page.evaluate(() => document.querySelector('.toolbar-guide')?.click())
await sleep(300)
const mobGuide = await page.evaluate(() => ({
  cards: document.querySelectorAll('.guide-card').length,
  overflow: document.documentElement.scrollWidth - innerWidth,
  guideWidth: Math.round(document.querySelector('.quick-guide')?.getBoundingClientRect().width ?? 0),
}))
report.mobileGuide = mobGuide
ok('mobile guide usable', mobGuide.cards === 8 && mobGuide.overflow <= 1, JSON.stringify(mobGuide))
await shot('quick-guide-390')

// ---- wide ----
await page.setViewport({ width: 1900, height: 1000, deviceScaleFactor: 1 })
await page.goto('http://spss.local/index.html?w=1#/workspace', { waitUntil: 'networkidle0' })
await page.waitForSelector('.data-table tbody tr')
await sleep(250)
const wide = await page.evaluate(() => ({
  overflow: document.documentElement.scrollWidth - innerWidth,
  grid: Math.round(document.querySelector('.data-table').getBoundingClientRect().width),
  viewport: innerWidth,
}))
report.wide = wide
ok('1900 no overflow', wide.overflow <= 0, JSON.stringify(wide))
await shot('workspace-1900')

// ---- landing mobile ----
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 })
await page.goto('http://spss.local/index.html?lm=1#/', { waitUntil: 'networkidle0' })
await page.waitForSelector('.hero h1')
await sleep(300)
const landingMob = await page.evaluate(() => ({
  overflow: document.documentElement.scrollWidth - innerWidth,
  sections: [...document.querySelectorAll('main section[id]')].map((s) => s.id).length,
  tables: [...document.querySelectorAll('.use-row, .compare-row')].length,
}))
report.landingMobile = landingMob
ok('landing mobile no overflow', landingMob.overflow <= 1, JSON.stringify(landingMob))
await shot('landing-390', true)

report.consoleErrors = [...new Set(report.consoleErrors)]
report.pageErrors = [...new Set(report.pageErrors)]
ok('no console errors', report.consoleErrors.length === 0, report.consoleErrors.join(' | '))
ok('no page errors', report.pageErrors.length === 0, report.pageErrors.join(' | '))
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2))
console.log(JSON.stringify({
  passed: report.checks.filter((c) => c.pass).length,
  total: report.checks.length,
  fails: report.checks.filter((c) => !c.pass),
  consoleErrors: report.consoleErrors,
  pageErrors: report.pageErrors,
}, null, 2))
await browser.close()
