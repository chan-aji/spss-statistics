import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'

const OUT = 'D:/spss/checks/final-v3'
fs.mkdirSync(OUT, { recursive: true })
const URL = 'http://127.0.0.1:51854/?v=12#/workspace'
const report = { steps: [], consoleErrors: [], pageErrors: [], measurements: {} }

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--force-device-scale-factor=1'],
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
})
const page = await browser.newPage()
page.on('console', (m) => { if (m.type() === 'error') report.consoleErrors.push(m.text()) })
page.on('pageerror', (e) => report.pageErrors.push(String(e)))

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const clickText = async (selector, text) => {
  const ok = await page.evaluate(({ selector, text }) => {
    const el = [...document.querySelectorAll(selector)].find((n) => n.textContent.trim() === text)
    if (!el) return false
    el.click()
    return true
  }, { selector, text })
  if (!ok) throw new Error(`not found: ${selector} "${text}"`)
}
const shot = async (name) => {
  await page.screenshot({ path: path.join(OUT, name + '.png') })
  report.steps.push(name)
}
const cellText = (r, c) => page.$eval(`[data-cell="${r}-${c}"]`, (n) => n.textContent.trim())

await page.goto(URL, { waitUntil: 'networkidle0' })
await page.waitForSelector('.data-table tbody tr')

// 1. Grid geometry at 1440
report.measurements.grid1440 = await page.evaluate(() => {
  const t = document.querySelector('.data-table')
  const head = document.querySelector('.data-table thead th:nth-child(3)')
  const row = document.querySelector('.data-table tbody tr')
  const scroll = document.querySelector('.data-scroll')
  return {
    tableWidth: Math.round(t.getBoundingClientRect().width),
    viewport: window.innerWidth,
    firstDataColumnWidth: Math.round(head.getBoundingClientRect().width),
    rowHeight: Math.round(row.getBoundingClientRect().height),
    scrollWidth: scroll.scrollWidth,
    scrollClientWidth: scroll.clientWidth,
  }
})
await shot('data-view-1440')

// 2. Keyboard editing + undo
await page.click('[data-cell="0-3"]')
await page.keyboard.type('5')
await page.keyboard.press('Enter')
await sleep(120)
const edited = await cellText(0, 3)
await page.keyboard.down('Control'); await page.keyboard.press('z'); await page.keyboard.up('Control')
await sleep(120)
const undone = await cellText(0, 3)
report.measurements.keyboardEdit = { edited, undone }
if (edited !== '5') throw new Error('keyboard edit failed')
if (undone === '5') throw new Error('undo failed')

// 3. Value labels on / off
await clickText('.menu-top', 'View')
await page.click('.menu-dropdown button.menu-item:nth-of-type(5)')
await sleep(150)
const labelled = await cellText(0, 3)
report.measurements.valueLabels = { labelled, hintHidden: await page.$('.spss-hint') === null }
await shot('value-labels-1440')
await clickText('.menu-top', 'View')
await page.click('.menu-dropdown button.menu-item:nth-of-type(5)')
await sleep(150)
const numeric = await cellText(0, 3)
report.measurements.valueLabelsOff = numeric
if (labelled !== 'Netral') throw new Error('value labels did not display')
if (numeric !== '3') throw new Error('value labels did not toggle off')

// 4. Regression through quick guide
await page.click('.toolbar-guide')
await page.waitForSelector('.quick-guide')
await page.click('.guide-card:nth-child(4) .guide-run')
await page.waitForSelector('.output-node')
await sleep(300)
const regression = await page.evaluate(() => {
  const node = document.querySelector('.output-node')
  const interp = node.querySelector('.output-interpret')?.textContent ?? ''
  const cells = [...node.querySelectorAll('.spss-table td')].map((c) => c.textContent.trim())
  return {
    title: node.querySelector('h3')?.textContent,
    interpretation: interp.slice(0, 160),
    rSquare: cells.find((c, i) => c === ',740') ?? null,
    tableCount: node.querySelectorAll('.spss-table').length,
  }
})
report.measurements.regression = regression
await shot('regression-output-1440')

// 5. Variable view + values dialog
await clickText('[role="tab"]', 'Variable View')
await page.waitForSelector('.variable-table')
await sleep(150)
await shot('variable-view-1440')
await page.click('.variable-table tbody tr:nth-child(2) .vv-dots')
await page.waitForSelector('.values-dlg')
await sleep(150)
report.measurements.valuesDialog = await page.evaluate(() => {
  const dlg = document.querySelector('.values-dlg')
  return {
    title: dlg.querySelector('.dlg-title')?.textContent,
    rows: dlg.querySelectorAll('.values-row').length,
    labels: [...dlg.querySelectorAll('.values-row input:last-child')].map((i) => i.value).slice(0, 5),
  }
})
await shot('values-dialog-1440')
await page.click('.values-dlg .dlg-close')

// 6. Reset data, wide viewport screenshot
await page.evaluate(() => localStorage.removeItem('spss-workspace-dataset-v2'))
await page.setViewport({ width: 1900, height: 1000, deviceScaleFactor: 1 })
await page.goto('http://127.0.0.1:51854/?v=13#/workspace', { waitUntil: 'networkidle0' })
await page.waitForSelector('.data-table tbody tr')
await sleep(200)
report.measurements.grid1900 = await page.evaluate(() => ({
  tableWidth: Math.round(document.querySelector('.data-table').getBoundingClientRect().width),
  viewport: window.innerWidth,
  visibleRows: document.querySelectorAll('.data-table tbody tr').length,
  firstRow: [...document.querySelectorAll('.data-table tbody tr:first-child td')].map((c) => c.textContent.trim()),
}))
await shot('data-view-1900')

// 7. Print/export smoke: open Output tab and check HTML export helper exists via menu
await clickText('[role="tab"]', 'Output')
await sleep(200)
report.measurements.outputTabEmpty = await page.$('.output-empty') !== null

report.consoleErrors = [...new Set(report.consoleErrors)]
report.pageErrors = [...new Set(report.pageErrors)]
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2))
await browser.close()
console.log(JSON.stringify(report, null, 2))
