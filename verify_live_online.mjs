import puppeteer from 'puppeteer-core'

console.log('--- Testing Live Online GitHub Pages Deployment ---')
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  userDataDir: 'D:/spss/app/.chrome-verify-live',
  args: ['--no-sandbox', '--disable-gpu', '--force-device-scale-factor=1', '--disable-dev-shm-usage'],
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
})

const page = await browser.newPage()
const errors = []
page.on('console', (msg) => {
  if (msg.type() === 'error') {
    errors.push(msg.text())
    console.error('[LIVE BROWSER ERROR]', msg.text())
  }
})

const liveUrl = 'https://chan-aji.github.io/spss-statistics/#/workspace'
console.log(`Navigating to ${liveUrl}...`)
await page.goto(liveUrl, { waitUntil: 'networkidle2', timeout: 30000 })
await new Promise((r) => setTimeout(r, 2000))

const liveCheck = await page.evaluate(() => {
  return {
    title: document.title,
    hasAgentApi: typeof window.__SPSS_AGENT_API__ !== 'undefined',
    rowCount: window.__SPSS_AGENT_API__?.getDataset()?.rows?.length,
    hasAiBtn: document.querySelector('.tool-ai-btn') !== null,
  }
})

console.log('Live Online Check Result:', liveCheck)

// Open AI Agent panel
console.log('Opening AI Agent panel on live page...')
await page.click('button.tool-ai-btn')
await new Promise((r) => setTimeout(r, 800))

const panelVisible = await page.evaluate(() => {
  const el = document.querySelector('.spss-ai-agent-panel')
  return el !== null && el.offsetWidth > 0
})
console.log('Live AI Panel visible:', panelVisible)

// Execute quick test
console.log('Executing live analysis instruction...')
const liveExec = await page.evaluate(() => {
  return window.__SPSS_AGENT_API__.executeInstruction('Uji regresi berganda')
})
console.log('Live execution result:', liveExec)

console.log('Live console errors caught:', errors.length)
await browser.close()

if (liveCheck.hasAgentApi && panelVisible && liveExec.success && errors.length === 0) {
  console.log('\n🚀 LIVE DEPLOYMENT 100% ONLINE AND WORKING PERFECTLY! 🚀')
  process.exit(0)
} else {
  console.error('Some live checks need attention:', { liveCheck, panelVisible, liveExec, errors })
  process.exit(1)
}
