import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'

const OUT = 'D:/spss/checks/continue-qa'
fs.mkdirSync(OUT, { recursive: true })
const BASE = 'http://127.0.0.1:62650/'
const report = { steps: [], consoleErrors: [], pageErrors: [], checks: [] }
const ok = (name, pass, detail) => { report.checks.push({ name, pass: !!pass, detail }); if(!pass) console.log('FAIL', name, detail ?? '') }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  userDataDir: 'D:/spss/app/.chrome-qa',
  args: ['--no-sandbox','--disable-gpu','--force-device-scale-factor=1','--disable-dev-shm-usage'],
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
})
const page = await browser.newPage()
page.on('console', (m) => { if (m.type() === 'error') report.consoleErrors.push(m.text()) })
page.on('pageerror', (e) => report.pageErrors.push(String(e)))
const shot = async (name, fullPage = false) => { await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage }); report.steps.push(name) }

// landing
await page.goto(BASE, { waitUntil: 'networkidle0' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle0' })
await page.waitForSelector('.hero h1')
const landing = await page.evaluate(() => ({
  title: document.title,
  h1: document.querySelector('.hero h1')?.innerText,
  sections: [...document.querySelectorAll('main section[id]')].map(s => s.id),
  useRows: document.querySelectorAll('.use-row').length,
  products: document.querySelectorAll('.product-card').length,
  steps: document.querySelectorAll('.step-card').length,
  overflow: document.documentElement.scrollWidth - window.innerWidth,
  height: document.documentElement.scrollHeight,
}))
report.landing = landing
ok('landing sections', landing.sections.length >= 5, landing.sections.join(','))
ok('no horizontal overflow 1440', landing.overflow <= 0, landing.overflow)
await shot('landing-1440', true)

// nav scroll
await page.evaluate(() => { [...document.querySelectorAll('.nav-link')].find(b => b.textContent.trim()==='Kegunaan')?.click() })
await sleep(700)
const scrolled = await page.evaluate(() => window.scrollY)
ok('nav scrolls to kegunaan', scrolled > 300, scrolled)

// mobile landing
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 })
await page.goto(BASE, { waitUntil: 'networkidle0' })
await sleep(300)
const mobile = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth - window.innerWidth, h1: document.querySelector('.hero h1')?.innerText }))
report.mobileLanding = mobile
ok('no horizontal overflow 390', mobile.overflow <= 1, mobile.overflow)
await shot('landing-390', true)

// workspace
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await page.goto(BASE + '#/workspace', { waitUntil: 'networkidle0' })
await page.waitForSelector('.data-table tbody tr')
await sleep(300)
const ws = await page.evaluate(() => ({
  rows: document.querySelectorAll('.data-table tbody tr').length,
  cols: document.querySelectorAll('.data-table thead th').length,
  title: document.querySelector('.spss-title-text')?.textContent,
  overflow: document.documentElement.scrollWidth - window.innerWidth,
  hint: !!document.querySelector('.spss-hint'),
  firstRow: [...document.querySelectorAll('.data-table tbody tr:first-child td')].map(c=>c.textContent.trim()),
}))
report.workspace = ws
ok('workspace 100 rows', ws.rows === 100, ws.rows)
ok('workspace no overflow', ws.overflow <= 0, ws.overflow)
ok('workspace title', /Data Editor/.test(ws.title||''), ws.title)
await shot('workspace-1440')

// helper to open menu item
const clickMenuItem = async (top, item) => {
  const found = await page.evaluate(({top,item}) => {
    const btn = [...document.querySelectorAll('.menu-top')].find(b => b.textContent.trim() === top)
    if (!btn) return 'no-top'
    btn.click()
    return 'opened'
  }, {top,item})
  if (found !== 'opened') return found
  await sleep(80)
  const res = await page.evaluate(({item}) => {
    const el = [...document.querySelectorAll('.menu-dropdown .menu-item')].find(b => b.textContent.trim().startsWith(item))
    if (!el) return 'no-item'
    el.click()
    return 'clicked'
  }, {item})
  await sleep(120)
  return res
}

// open and run each analysis via menus
const analyses = [
  ['Descriptives…', 'Descriptives'],
  ['Frequencies…', 'Frequencies'],
  ['Crosstabs…', 'Crosstabs'],
  ['One-Sample T Test…', 'One-Sample T Test'],
  ['Independent-Samples T Test…', 'Independent-Samples T Test'],
  ['Reliability Analysis…', 'Reliability Analysis'],
]
const dialogTitles = []
for (const [label] of analyses) {
  const r1 = await clickMenuItem('Analyze', label)
  await sleep(150)
  const has = await page.$('.dlg')
  const title = has ? await page.$eval('.dlg-title', n=>n.textContent.trim()) : null
  dialogTitles.push({label, opened: !!has, title, r1})
  ok('dialog opens: '+label, has, r1)
  if (has) {
    await page.click('.dlg-btn-primary')
    await sleep(250)
    const node = await page.evaluate(() => {
      const n = document.querySelector('.output-node')
      return n ? { title: n.querySelector('h3')?.textContent, tables: n.querySelectorAll('.spss-table').length } : null
    })
    ok('analysis runs: '+label, node && node.tables > 0, JSON.stringify(node))
  }
}
report.dialogTitles = dialogTitles

// correlation via submenu
const corr = await clickMenuItem('Analyze', 'Correlate')
if (corr === 'clicked') {
  // hover to open submenu then click
  const opened = await page.evaluate(() => {
    const el = [...document.querySelectorAll('.menu-dropdown .menu-item.has-sub')].find(b=>b.textContent.includes('Correlate'))
    if(!el) return false
    el.parentElement.querySelector('.menu-submenu .menu-item')?.click()
    return true
  })
  ok('correlation submenu opens', opened)
  await sleep(200)
  const has = await page.$('.dlg')
  ok('correlation dialog opens', has)
  if (has) { await page.click('.dlg-btn-primary'); await sleep(250) }
}
// regression via submenu
const regTop = await page.evaluate(() => {
  const btn = [...document.querySelectorAll('.menu-top')].find(b=>b.textContent.trim()==='Analyze'); btn?.click(); return !!btn
})
await sleep(80)
const reg = await page.evaluate(() => {
  const el = [...document.querySelectorAll('.menu-dropdown .menu-item.has-sub')].find(b=>b.textContent.includes('Regression'))
  if(!el) return false
  el.parentElement.querySelector('.menu-submenu .menu-item')?.click()
  return true
})
await sleep(200)
ok('regression dialog opens', !!(await page.$('.dlg')), reg)
if (await page.$('.dlg')) {
  const pre = await page.evaluate(() => ({ dep: document.querySelector('#dep-var')?.value, indeps: [...document.querySelectorAll('.transfer-side:nth-child(3) .transfer-name')].map(n=>n.textContent) }))
  report.regressionDefaults = pre
  await page.click('.dlg-btn-primary'); await sleep(350)
  const node = await page.evaluate(() => {
    const n = document.querySelector('.output-node')
    const cells = [...n.querySelectorAll('.spss-table td')].map(c=>c.textContent.trim())
    return { title: n.querySelector('h3')?.textContent, tables: n.querySelectorAll('.spss-table').length, hasR2: cells.includes(',740'), hasF: cells.includes('91,083') }
  })
  report.regression = node
  ok('regression output correct', node.tables >= 4 && node.hasR2 && node.hasF, JSON.stringify(node))
  await shot('regression-1440')
}

// output count + tree
const outInfo = await page.evaluate(() => ({
  nodes: document.querySelectorAll('.output-node').length,
  treeItems: document.querySelectorAll('.out-tree-item').length,
  tabCount: document.querySelector('.tab-count')?.textContent,
}))
report.output = outInfo
ok('output nodes accumulate', outInfo.nodes >= 7, outInfo.nodes)
await shot('output-list-1440')

// data view edit + undo
await page.evaluate(() => { [...document.querySelectorAll('.spss-tab')].find(b=>b.textContent.includes('Data View'))?.click() })
await page.waitForSelector('[data-cell="0-3"]')
const before = await page.$eval('[data-cell="0-3"]', n=>n.textContent.trim())
await page.click('[data-cell="0-3"]')
await page.keyboard.press('Backspace')
await page.keyboard.type('5')
await page.keyboard.press('Enter')
await sleep(150)
const after = await page.$eval('[data-cell="0-3"]', n=>n.textContent.trim())
ok('cell edits to 5', after === '5', before + '->' + after)
await page.keyboard.down('Control'); await page.keyboard.press('z'); await page.keyboard.up('Control')
await sleep(150)
const undone = await page.$eval('[data-cell="0-3"]', n=>n.textContent.trim())
ok('undo restores', undone === before, before + ' / ' + undone)

// value labels
await clickMenuItem('View','Value Labels')
await sleep(200)
const labelled = await page.$eval('[data-cell="0-3"]', n=>n.textContent.trim())
ok('value labels on', labelled !== before, labelled)
await shot('value-labels-1440')
await clickMenuItem('View','Value Labels')
await sleep(150)

// add case
const rowsBefore = await page.$$eval('.data-table tbody tr', r=>r.length)
const addRes = await clickMenuItem('Data','Insert Case')
await sleep(200)
const rowsAfter = await page.$$eval('.data-table tbody tr', r=>r.length)
ok('insert case adds row', rowsAfter === rowsBefore + 1, rowsBefore + '->' + rowsAfter)
await page.keyboard.down('Control'); await page.keyboard.press('z'); await page.keyboard.up('Control')
await sleep(150)

// variable view
await page.evaluate(() => { [...document.querySelectorAll('.spss-tab')].find(b=>b.textContent.includes('Variable View'))?.click() })
await page.waitForSelector('.variable-table')
await sleep(200)
const varInfo = await page.evaluate(() => ({ rows: document.querySelectorAll('.variable-table tbody tr').length, cols: document.querySelectorAll('.variable-table thead th').length }))
report.variableView = varInfo
ok('variable view 7 vars', varInfo.rows === 7, JSON.stringify(varInfo))
await shot('variable-view-1440')
// values dialog
await page.click('.variable-table tbody tr:nth-child(2) .vv-dots')
await sleep(200)
ok('values dialog opens', !!(await page.$('.values-dlg')))
await shot('values-dialog-1440')
if (await page.$('.values-dlg')) await page.click('.values-dlg .dlg-close')

// syntax
await page.evaluate(() => { [...document.querySelectorAll('.spss-tab')].find(b=>b.textContent.includes('Syntax'))?.click() })
await sleep(200)
const syntax = await page.evaluate(() => ({ lines: document.querySelectorAll('.syntax-gutter span').length, text: document.querySelector('.syntax-editor pre')?.textContent?.slice(0,200) }))
report.syntax = syntax
ok('syntax has content', syntax.lines > 2, syntax.lines)
await shot('syntax-1440')

// persistence after reload
await page.reload({ waitUntil: 'networkidle0' })
await page.waitForSelector('.data-table tbody tr')
const persisted = await page.evaluate(() => ({ rows: document.querySelectorAll('.data-table tbody tr').length, name: document.querySelector('.spss-dataset')?.textContent }))
report.persisted = persisted
ok('dataset persists', persisted.rows === 100, JSON.stringify(persisted))

// workspace mobile overflow
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 })
await page.goto(BASE + '#/workspace', { waitUntil: 'networkidle0' })
await page.waitForSelector('.data-table tbody tr')
await sleep(250)
const wsMobile = await page.evaluate(() => ({
  docOverflow: document.documentElement.scrollWidth - window.innerWidth,
  gridScroll: (() => { const s=document.querySelector('.data-scroll'); return s ? s.scrollWidth - s.clientWidth : null })(),
  toolbar: document.querySelector('.spss-toolbar')?.getBoundingClientRect().height,
}))
report.workspaceMobile = wsMobile
ok('workspace no page overflow 390', wsMobile.docOverflow <= 1, wsMobile.docOverflow)
await shot('workspace-390')

report.consoleErrors = [...new Set(report.consoleErrors)]
report.pageErrors = [...new Set(report.pageErrors)]
ok('no console errors', report.consoleErrors.length === 0, report.consoleErrors.join(' | '))
ok('no page errors', report.pageErrors.length === 0, report.pageErrors.join(' | '))
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2))
console.log(JSON.stringify({ fails: report.checks.filter(c=>!c.pass), consoleErrors: report.consoleErrors, pageErrors: report.pageErrors, checks: report.checks.length }, null, 2))
await browser.close()
