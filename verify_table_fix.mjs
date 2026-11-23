import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = 'D:/spss/app/dist'
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json',
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--force-device-scale-factor=1'],
    defaultViewport: { width: 1360, height: 900 },
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

  await page.goto('http://spss.local/#/workspace')
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  await page.waitForSelector('.data-table tbody tr')
  await sleep(600)

  // Reset demo data
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.menu-top')].find((x) => x.textContent.trim() === 'File')
    b?.click()
  })
  await sleep(200)
  await page.evaluate(() => {
    const item = [...document.querySelectorAll('.menu-item')].find((m) => m.textContent.includes('Reset Data Contoh'))
    item?.click()
  })
  await sleep(500)

  // Open Compare Means > Independent-Samples T Test
  console.log('Opening Compare Means > Independent-Samples T Test...')
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.menu-top')].find((x) => x.textContent.trim() === 'Analyze')
    b?.click()
  })
  await sleep(300)
  const menuInfo = await page.evaluate(() => {
    const hasSubs = [...document.querySelectorAll('.menu-dropdown .menu-item.has-sub')].map((m) => m.textContent.trim())
    const comp = [...document.querySelectorAll('.menu-dropdown .menu-item.has-sub')].find((m) => m.textContent.includes('Compare Means'))
    const sub = comp ? [...comp.parentElement.querySelectorAll('.menu-submenu .menu-item')].find((m) => m.textContent.includes('Independent-Samples T Test')) : null
    if (sub) sub.click()
    return { hasSubs, foundComp: !!comp, foundSub: !!sub }
  })
  console.log('Menu info:', menuInfo)
  await sleep(400)

  // In dialog, click OK
  const hasDlg = await page.evaluate(() => !!document.querySelector('.dlg'))
  console.log('Dialog opened:', hasDlg)
  if (hasDlg) {
    await page.click('.dlg-btn-primary')
    await sleep(600)
  }

  // Switch to Output Viewer tab
  await page.evaluate(() => {
    const tabs = [...document.querySelectorAll('.spss-tab')]
    const out = tabs.find((t) => t.textContent.includes('Output'))
    out?.click()
  })
  await sleep(600)

  // Evaluate the table
  const result = await page.evaluate(() => {
    const tables = [...document.querySelectorAll('.spss-table-block')]
    const indep = tables.find((b) => b.textContent.includes('Independent Samples Test'))
    if (!indep) return { found: false, allTables: tables.map(t => t.querySelector('.spss-table-title')?.textContent) }

    const title = indep.querySelector('.spss-table-title')?.textContent.trim()
    const groups = [...indep.querySelectorAll('thead .group-row th')].map((th) => ({
      text: th.textContent.trim(),
      span: th.getAttribute('colspan'),
    }))
    const columns = [...indep.querySelectorAll('thead tr:last-child th')].map((th) => th.textContent.trim())
    const rows = [...indep.querySelectorAll('tbody tr')].map((tr) =>
      [...tr.querySelectorAll('td')].map((td) => td.textContent.trim())
    )
    const tableEl = indep.querySelector('.spss-table')
    const wrapEl = indep.querySelector('.spss-table-wrap')
    const scrollControls = !!indep.querySelector('.table-scroll-controls')

    return {
      found: true,
      title,
      groups,
      columns,
      rowCount: rows.length,
      firstRow: rows[0],
      tableWidth: tableEl?.offsetWidth,
      wrapWidth: wrapEl?.clientWidth,
      wrapScrollWidth: wrapEl?.scrollWidth,
      scrollControls,
    }
  })

  console.log('Result:', JSON.stringify(result, null, 2))

  // Test at smaller viewport to test scroll controls & responsiveness
  await page.setViewport({ width: 1000, height: 800 })
  await sleep(400)

  const smallViewResult = await page.evaluate(() => {
    const indep = [...document.querySelectorAll('.spss-table-block')].find((b) => b.textContent.includes('Independent Samples Test'))
    if (!indep) return null
    const wrap = indep.querySelector('.spss-table-wrap')
    const scrollControls = !!indep.querySelector('.table-scroll-controls')
    const leftBtn = indep.querySelector('.scroll-table-btn:first-child')
    const rightBtn = indep.querySelector('.scroll-table-btn:last-child')
    return {
      wrapWidth: wrap?.clientWidth,
      wrapScrollWidth: wrap?.scrollWidth,
      scrollControls,
      leftDisabled: leftBtn?.hasAttribute('disabled'),
      rightDisabled: rightBtn?.hasAttribute('disabled'),
    }
  })
  console.log('Narrow Viewport (1000px) Result:', JSON.stringify(smallViewResult, null, 2))

  // Click right scroll button
  await page.evaluate(() => {
    const indep = [...document.querySelectorAll('.spss-table-block')].find((b) => b.textContent.includes('Independent Samples Test'))
    const rightBtn = indep?.querySelectorAll('.scroll-table-btn')[1]
    rightBtn?.click()
  })
  await sleep(400)

  const afterScroll = await page.evaluate(() => {
    const indep = [...document.querySelectorAll('.spss-table-block')].find((b) => b.textContent.includes('Independent Samples Test'))
    const wrap = indep?.querySelector('.spss-table-wrap')
    const leftBtn = indep?.querySelector('.scroll-table-btn:first-child')
    return {
      scrollLeft: wrap?.scrollLeft,
      leftDisabled: leftBtn?.hasAttribute('disabled'),
    }
  })
  console.log('After Scrolling Right:', JSON.stringify(afterScroll, null, 2))

  // Capture screenshot of Output Viewer at 1000px
  await page.screenshot({ path: 'D:/spss/app/screenshot_table_responsive.png', fullPage: false })
  console.log('Responsive screenshot saved to D:/spss/app/screenshot_table_responsive.png')

  await browser.close()
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
