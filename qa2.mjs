import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'

const OUT = 'D:/spss/checks/continue-qa2'
fs.mkdirSync(OUT, { recursive: true })
const DL = path.join(OUT, 'downloads')
fs.rmSync(DL, { recursive: true, force: true }); fs.mkdirSync(DL, { recursive: true })
const BASE = 'http://127.0.0.1:62650/?v=22'
const report = { checks: [], consoleErrors: [], pageErrors: [] }
const ok = (name, pass, detail) => { report.checks.push({ name, pass: !!pass, detail }); if(!pass) console.log('FAIL', name, detail ?? '') }
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  userDataDir: 'D:/spss/app/.chrome-qa',
  args: ['--no-sandbox','--disable-gpu','--force-device-scale-factor=1','--disable-dev-shm-usage'],
  defaultViewport: { width: 390, height: 844, deviceScaleFactor: 1 },
})
const page = await browser.newPage()
page.on('console', m => { if (m.type()==='error') report.consoleErrors.push(m.text()) })
page.on('pageerror', e => report.pageErrors.push(String(e)))
const shot = async (name, full=false) => { await page.screenshot({path: path.join(OUT, name+'.png'), fullPage: full}); }

await page.goto(BASE + '#/workspace', { waitUntil: 'networkidle0' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle0' })
await page.waitForSelector('.data-table tbody tr')

// quick guide on mobile
await page.evaluate(() => document.querySelector('.toolbar-guide')?.click())
await sleep(300)
ok('guide opens on mobile', !!(await page.$('.quick-guide')))
await shot('mobile-guide')
const guideOverflow = await page.evaluate(() => ({w: document.documentElement.scrollWidth - window.innerWidth, gw: document.querySelector('.quick-guide')?.getBoundingClientRect().width}))
report.guideOverflow = guideOverflow
await page.evaluate(() => document.querySelector('.guide-close')?.click())
await sleep(200)

// menus reachable by scrolling
const menuInfo = await page.evaluate(() => {
  const bar = document.querySelector('.spss-menubar')
  const before = bar.scrollLeft
  bar.scrollLeft = bar.scrollWidth
  const after = bar.scrollLeft
  return { scrollWidth: bar.scrollWidth, clientWidth: bar.clientWidth, before, after, labels: [...document.querySelectorAll('.menu-top')].map(b=>b.textContent) }
})
report.menuInfo = menuInfo
ok('menubar scrolls to Help', menuInfo.after > 0, JSON.stringify({w:menuInfo.scrollWidth,c:menuInfo.clientWidth,a:menuInfo.after}))
ok('all 10 menus present', menuInfo.labels.length === 10, menuInfo.labels.join(','))

// open Descriptives on mobile
await page.evaluate(() => { const b=[...document.querySelectorAll('.menu-top')].find(x=>x.textContent.trim()==='Analyze'); b?.click() })
await sleep(120)
await page.evaluate(() => { const b=[...document.querySelectorAll('.menu-dropdown .menu-item')].find(x=>x.textContent.trim().startsWith('Descriptives')); b?.click() })
await sleep(250)
ok('descriptives dialog mobile', !!(await page.$('.dlg')))
await shot('mobile-descriptives-dialog')
const dlgBox = await page.evaluate(() => { const d=document.querySelector('.dlg'); const r=d.getBoundingClientRect(); return {w:Math.round(r.width),h:Math.round(r.height),vw:innerWidth,vh:innerHeight} })
report.dlgBox = dlgBox
ok('dialog fits mobile viewport', dlgBox.w <= 390 && dlgBox.h <= 844, JSON.stringify(dlgBox))
await page.evaluate(() => document.querySelector('.dlg-btn-primary')?.click())
await sleep(300)
await shot('mobile-descriptives-output')
ok('analysis output on mobile', !!(await page.$('.output-node')))

// correlation one-tailed label
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await page.evaluate(() => { const b=[...document.querySelectorAll('.menu-top')].find(x=>x.textContent.trim()==='Analyze'); b?.click() })
await sleep(100)
await page.evaluate(() => {
  const sub=[...document.querySelectorAll('.menu-dropdown .menu-item.has-sub')].find(x=>x.textContent.includes('Correlate'))
  sub?.parentElement.querySelector('.menu-submenu .menu-item')?.click()
})
await sleep(250)
const radio = await page.evaluate(() => {
  const r=[...document.querySelectorAll('.dlg-check')].find(x=>x.textContent.trim()==='One-tailed')
  r?.querySelector('input')?.click(); return !!r
})
ok('one-tailed option exists', radio)
await page.evaluate(() => document.querySelector('.dlg-btn-primary')?.click())
await sleep(300)
const corr = await page.evaluate(() => {
  const n=document.querySelector('.output-node')
  return { title:n?.querySelector('h3')?.textContent, headers:[...n.querySelectorAll('.spss-table th')].map(x=>x.textContent.trim()), notes:[...n.querySelectorAll('.spss-notes p')].map(x=>x.textContent.trim()) }
})
report.correlation = corr
ok('one-tailed header shown', corr.headers.includes('Sig. (1-tailed)'), corr.headers.join('|'))
ok('one-tailed note shown', corr.notes.some(x=>x.includes('1-tailed')), corr.notes.join('|'))
await shot('correlation-onetailed-1440')

// CSV import (numeric)
const csv = 'ID,Skor_A,Skor_B\n1,3,4\n2,4,5\n3,2,3\n4,5,5\n5,4,4\n'
fs.writeFileSync(path.join(OUT, 'contoh.csv'), csv)
const input = await page.$('input[type=file]')
await input.uploadFile(path.join(OUT, 'contoh.csv'))
await sleep(600)
// ensure data view
await page.evaluate(() => { const b=[...document.querySelectorAll('.spss-tab')].find(x=>x.textContent.includes('Data View')); b?.click() })
await sleep(250)
const imported = await page.evaluate(() => ({
  name: document.querySelector('.spss-dataset')?.textContent,
  headers: [...document.querySelectorAll('.data-table thead th .var-name')].map(x=>x.textContent),
  rows: document.querySelectorAll('.data-table tbody tr').length,
  info: document.querySelector('.dlg-title')?.textContent,
}))
report.imported = imported
ok('CSV import loads 5 rows + new row', imported.rows === 6, JSON.stringify(imported))
ok('CSV import names variables', imported.headers.join(',') === 'ID,Skor_A,Skor_B', imported.headers.join(','))
await shot('csv-import-1440')

// export download
const client = await page.target().createCDPSession()
await client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: DL })
await page.evaluate(() => { const b=[...document.querySelectorAll('.spss-tab')].find(x=>x.textContent.includes('Output')); b?.click() })
await sleep(200)
await page.evaluate(() => { const b=[...document.querySelectorAll('.spss-tool-btn')].find(x=>x.textContent.includes('Ekspor')); b?.click() })
await sleep(1200)
const files = fs.readdirSync(DL)
report.downloads = files
ok('export downloads HTML', files.some(f=>f.endsWith('.html')), files.join(','))
if (files.some(f=>f.endsWith('.html'))) {
  const html = fs.readFileSync(path.join(DL, files.find(f=>f.endsWith('.html'))), 'utf8')
  ok('export contains tables', html.includes('<table') && html.includes('Correlations'), html.length)
}

// 1900 wide fresh
await page.setViewport({ width: 1900, height: 1000, deviceScaleFactor: 1 })
await page.goto(BASE + 'b#/workspace', { waitUntil: 'networkidle0' })
await page.waitForSelector('.data-table tbody tr')
await sleep(250)
const wide = await page.evaluate(() => ({
  overflow: document.documentElement.scrollWidth - innerWidth,
  grid: Math.round(document.querySelector('.data-table')?.getBoundingClientRect().width),
  viewport: innerWidth,
}))
report.wide = wide
ok('no overflow 1900', wide.overflow <= 0, JSON.stringify(wide))
await shot('workspace-1900')

report.consoleErrors=[...new Set(report.consoleErrors)]
report.pageErrors=[...new Set(report.pageErrors)]
ok('no console errors', report.consoleErrors.length===0, report.consoleErrors.join(' | '))
ok('no page errors', report.pageErrors.length===0, report.pageErrors.join(' | '))
fs.writeFileSync(path.join(OUT,'report.json'), JSON.stringify(report,null,2))
console.log(JSON.stringify({fails:report.checks.filter(c=>!c.pass), consoleErrors:report.consoleErrors, pageErrors:report.pageErrors, checks:report.checks.length}, null, 2))
await browser.close()
