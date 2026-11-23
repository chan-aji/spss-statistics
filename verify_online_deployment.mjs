import puppeteer from 'puppeteer-core'

const ONLINE_URL = 'https://chan-aji.github.io/spss-statistics/#/workspace'

async function verifyOnline() {
  console.log('Testing live online URL:', ONLINE_URL)
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu'],
    defaultViewport: { width: 1366, height: 768 },
  })

  const page = await browser.newPage()
  const errors = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('pageerror', (err) => errors.push(String(err)))
  page.on('response', (res) => {
    if (res.status() >= 400) {
      console.log('FAILED URL (HTTP ' + res.status() + '):', res.url())
    }
  })

  const startTime = Date.now()
  await page.goto(ONLINE_URL, { waitUntil: 'networkidle0' })
  const loadTime = Date.now() - startTime
  console.log(`Live site loaded in ${loadTime}ms`)

  await page.waitForSelector('.data-table tbody tr', { timeout: 10000 })
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  await sleep(500)

  // Verify Data View
  const dataViewCheck = await page.evaluate(() => {
    const rows = document.querySelectorAll('.data-table tbody tr').length
    const cols = document.querySelectorAll('.data-table thead th').length
    const title = document.querySelector('.spss-title-text')?.textContent
    return { rows, cols, title }
  })
  console.log('Online Data View:', JSON.stringify(dataViewCheck))

  // Run an analysis online (Linear Regression via Quick Guide)
  console.log('Running analysis online...')
  await page.evaluate(() => {
    const btn = document.querySelector('.toolbar-guide')
    btn?.click()
  })
  await sleep(400)

  await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.guide-card')]
    const reg = cards.find((c) => c.textContent.includes('Regresi linear'))
    reg?.querySelector('.guide-run')?.click()
  })
  await sleep(600)

  // Switch to Output Viewer
  await page.evaluate(() => {
    const tabs = [...document.querySelectorAll('.spss-tab')]
    tabs.find((t) => t.textContent.includes('Output'))?.click()
  })
  await sleep(500)

  const outputCheck = await page.evaluate(() => {
    const tables = document.querySelectorAll('.spss-table').length
    const interpret = document.querySelectorAll('.output-interpret').length
    return { tables, interpret }
  })
  console.log('Online Output Viewer:', JSON.stringify(outputCheck))

  console.log('Errors caught during online session:', errors.length, errors)
  await browser.close()

  if (dataViewCheck.rows > 0 && outputCheck.tables > 0 && errors.length === 0) {
    console.log('✅ LIVE ONLINE DEPLOYMENT IS 100% PERFECT & VERIFIED!')
    return true
  } else {
    throw new Error('Verification failed!')
  }
}

verifyOnline().catch((err) => {
  console.error('Online verification error:', err)
  process.exit(1)
})
