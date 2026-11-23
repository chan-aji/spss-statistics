import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'

const OUT_DIR = 'D:/spss/checks/chrome-audit'
fs.rmSync(OUT_DIR, { recursive: true, force: true })
fs.mkdirSync(OUT_DIR, { recursive: true })

async function audit() {
  const issues = []
  const successes = []
  const consoleLogs = { error: [], warn: [], info: [] }

  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--force-device-scale-factor=1'],
    defaultViewport: { width: 1366, height: 768 },
  })

  const page = await browser.newPage()

  page.on('console', (msg) => {
    const text = msg.text()
    if (msg.type() === 'error') {
      consoleLogs.error.push(text)
      issues.push({ category: 'Console Error', detail: text })
    } else if (msg.type() === 'warn') {
      consoleLogs.warn.push(text)
    }
  })

  page.on('pageerror', (err) => {
    issues.push({ category: 'Runtime Error', detail: String(err) })
  })

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

  console.log('--- 1. Navigasi & Load Performance ---')
  const startTime = Date.now()
  await page.goto('http://localhost:4173/#/workspace', { waitUntil: 'networkidle0' })
  const loadDuration = Date.now() - startTime
  console.log(`Halaman dimuat dalam ${loadDuration}ms`)
  if (loadDuration > 3000) {
    issues.push({ category: 'Performance', detail: `Load time lambat: ${loadDuration}ms` })
  } else {
    successes.push(`Load time cepat: ${loadDuration}ms (< 3s)`)
  }

  await sleep(400)
  await page.screenshot({ path: path.join(OUT_DIR, '01_initial_workspace.png') })

  console.log('--- 2. Audit Menu Bar & Placeholders ---')
  const menuAudit = await page.evaluate(() => {
    const menus = [...document.querySelectorAll('.menu-top')].map((m) => m.textContent.trim())
    return menus
  })
  console.log('Menu bar items:', menuAudit)

  // Klik setiap menu utama dan hitung jumlah submenu, aktif vs placeholder
  const menuStats = []
  for (const menuName of menuAudit) {
    await page.evaluate((name) => {
      const b = [...document.querySelectorAll('.menu-top')].find((x) => x.textContent.trim() === name)
      b?.click()
    }, menuName)
    await sleep(200)

    const stats = await page.evaluate((name) => {
      const items = [...document.querySelectorAll('.menu-dropdown .menu-item')]
      const total = items.length
      const disabled = items.filter((it) => it.hasAttribute('disabled') || it.classList.contains('disabled')).length
      const labels = items.map((it) => it.textContent.trim())
      return { menu: name, total, disabled, sampleLabels: labels.slice(0, 5) }
    }, menuName)
    menuStats.push(stats)

    // Tutup menu dengan klik di luar
    await page.evaluate(() => {
      document.body.click()
    })
    await sleep(150)
  }
  console.log('Menu Stats:', JSON.stringify(menuStats, null, 2))

  console.log('--- 3. Audit Tab Switching & Views ---')
  // Tab Data View
  const dataViewOk = await page.evaluate(() => {
    const table = document.querySelector('.data-table')
    const rows = table?.querySelectorAll('tbody tr').length ?? 0
    const cols = table?.querySelectorAll('thead th').length ?? 0
    return { hasTable: !!table, rows, cols }
  })
  if (dataViewOk.rows > 0) {
    successes.push(`Data View berfungsi normal (${dataViewOk.rows} baris, ${dataViewOk.cols} kolom)`)
  } else {
    issues.push({ category: 'Data View', detail: 'Tabel Data View kosong atau tidak ditemukan' })
  }

  // Switch to Variable View
  await page.evaluate(() => {
    const tabs = [...document.querySelectorAll('.spss-tab')]
    const tab = tabs.find((t) => t.textContent.includes('Variable View'))
    tab?.click()
  })
  await sleep(400)
  await page.screenshot({ path: path.join(OUT_DIR, '02_variable_view.png') })

  const varViewOk = await page.evaluate(() => {
    const table = document.querySelector('.variable-table')
    const rows = table?.querySelectorAll('tbody tr').length ?? 0
    return { hasTable: !!table, rows }
  })
  if (varViewOk.rows > 0) {
    successes.push(`Variable View berfungsi normal (${varViewOk.rows} variabel terdefinisi)`)
  } else {
    issues.push({ category: 'Variable View', detail: 'Tabel Variable View kosong' })
  }

  // Switch to Syntax Editor
  await page.evaluate(() => {
    const tabs = [...document.querySelectorAll('.spss-tab')]
    const tab = tabs.find((t) => t.textContent.includes('Syntax'))
    tab?.click()
  })
  await sleep(400)
  const syntaxOk = await page.evaluate(() => {
    const editor = document.querySelector('.syntax-textarea') || document.querySelector('.syntax-editor')
    return !!editor
  })
  if (syntaxOk) {
    successes.push('Syntax Editor aktif dan interaktif')
  } else {
    issues.push({ category: 'Syntax Editor', detail: 'Syntax Editor tidak ditemukan' })
  }

  console.log('--- 4. Audit Menjalankan Analisis & Output Viewer ---')
  // Jalankan analisis via Quick Guide atau Menu
  await page.evaluate(() => {
    const tabs = [...document.querySelectorAll('.spss-tab')]
    const tab = tabs.find((t) => t.textContent.includes('Data View'))
    tab?.click()
  })
  await sleep(300)

  // Buka Panduan Cepat
  await page.evaluate(() => {
    const btn = document.querySelector('.toolbar-guide')
    btn?.click()
  })
  await sleep(400)
  await page.screenshot({ path: path.join(OUT_DIR, '03_quick_guide.png') })

  // Klik jalankan Regresi Berganda di Panduan Cepat
  const runRegressionSuccess = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.guide-card, .guide-extra-card')]
    const regCard = cards.find((c) => c.textContent.includes('Regresi linear'))
    const runBtn = regCard?.querySelector('.guide-run')
    if (runBtn) {
      runBtn.click()
      return true
    }
    return false
  })
  console.log('Jalankan Regresi Berganda:', runRegressionSuccess)
  await sleep(600)

  // Switch to Output Viewer
  await page.evaluate(() => {
    const tabs = [...document.querySelectorAll('.spss-tab')]
    const tab = tabs.find((t) => t.textContent.includes('Output'))
    tab?.click()
  })
  await sleep(600)
  await page.screenshot({ path: path.join(OUT_DIR, '04_output_regression.png') })

  // Audit Output Tables
  const outputAudit = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll('.output-node')]
    const tables = [...document.querySelectorAll('.spss-table')]
    const charts = [...document.querySelectorAll('.spss-chart')]
    const copyBtns = [...document.querySelectorAll('.copy-table-btn')]
    const interpretBoxes = [...document.querySelectorAll('.output-interpret')]

    // Cek apakah ada tabel yang terpotong secara visual atau meluap
    const tableOverflows = tables.map((tbl) => {
      const parent = tbl.parentElement
      return {
        tableWidth: tbl.offsetWidth,
        parentWidth: parent?.clientWidth,
        isOverflowing: tbl.offsetWidth > (parent?.clientWidth ?? 0),
        hasBorders: getComputedStyle(tbl).borderCollapse === 'collapse',
      }
    })

    return {
      nodeCount: nodes.length,
      tableCount: tables.length,
      chartCount: charts.length,
      copyBtnCount: copyBtns.length,
      interpretCount: interpretBoxes.length,
      tableOverflows,
    }
  })
  console.log('Output Viewer Audit:', JSON.stringify(outputAudit, null, 2))

  if (outputAudit.tableCount > 0 && outputAudit.interpretCount > 0) {
    successes.push(`Output Viewer menghasilkan ${outputAudit.tableCount} tabel lengkap dengan interpretasi Bab IV`)
  } else {
    issues.push({ category: 'Output Viewer', detail: 'Tabel atau interpretasi output tidak muncul' })
  }

  console.log('--- 5. Audit Aksesibilitas (A11y) & Visual Layout ---')
  const a11yAudit = await page.evaluate(() => {
    const buttonsWithoutLabel = [...document.querySelectorAll('button')].filter((b) => {
      return !b.textContent.trim() && !b.getAttribute('aria-label') && !b.getAttribute('title')
    }).length

    const dialogs = [...document.querySelectorAll('.dlg')]
    const dialogsWithoutTitle = dialogs.filter((d) => !d.querySelector('.dlg-title')).length

    const contrastIssues = []
    const statusbar = document.querySelector('.spss-statusbar')
    if (statusbar) {
      const bg = getComputedStyle(statusbar).backgroundColor
      const color = getComputedStyle(statusbar).color
      // normal check
    }

    return {
      buttonsWithoutLabel,
      dialogsWithoutTitle,
    }
  })
  console.log('A11y Audit:', a11yAudit)
  if (a11yAudit.buttonsWithoutLabel === 0) {
    successes.push('Semua tombol memiliki teks, title, atau aria-label yang memadai')
  } else {
    issues.push({ category: 'Accessibility', detail: `${a11yAudit.buttonsWithoutLabel} tombol tidak memiliki label aksesibilitas` })
  }

  console.log('--- 6. Audit Uji Asumsi Klasik & P-P Plot ---')
  // Jalankan Uji Asumsi Klasik via Quick Guide
  await page.evaluate(() => {
    const btn = document.querySelector('.toolbar-guide')
    btn?.click()
  })
  await sleep(400)
  await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.guide-extra-card, .guide-card')]
    const assCard = cards.find((c) => c.textContent.includes('Uji Asumsi Klasik'))
    const runBtn = assCard?.querySelector('.guide-run')
    runBtn?.click()
  })
  await sleep(600)

  // Periksa apakah P-P Plot SVG dirender
  const ppPlotRendered = await page.evaluate(() => {
    const ppplot = document.querySelector('.ppplot-chart svg')
    const circles = ppplot?.querySelectorAll('circle').length ?? 0
    return { hasSvg: !!ppplot, circleCount: circles }
  })
  console.log('P-P Plot Rendered:', ppPlotRendered)
  if (ppPlotRendered.hasSvg && ppPlotRendered.circleCount > 10) {
    successes.push(`P-P Plot residual normalitas ter-render sempurna dengan ${ppPlotRendered.circleCount} titik responden`)
  } else {
    issues.push({ category: 'Graphics', detail: 'P-P Plot tidak ter-render atau tidak memiliki titik residual' })
  }
  await page.screenshot({ path: path.join(OUT_DIR, '05_ppplot_assumptions.png') })

  console.log('--- 7. Audit Keyboard Shortcut & Dialogs ---')
  // Buka Find (Ctrl+F)
  await page.keyboard.down('Control')
  await page.keyboard.press('KeyF')
  await page.keyboard.up('Control')
  await sleep(300)
  const findDlgOpen = await page.evaluate(() => !!document.querySelector('.dlg'))
  if (findDlgOpen) {
    successes.push('Shortcut Ctrl+F (Find Dialog) berfungsi')
    await page.keyboard.press('Escape')
    await sleep(200)
  } else {
    issues.push({ category: 'Shortcuts', detail: 'Shortcut Ctrl+F tidak membuka Find Dialog' })
  }

  // Buka Replace (Ctrl+H)
  await page.keyboard.down('Control')
  await page.keyboard.press('KeyH')
  await page.keyboard.up('Control')
  await sleep(300)
  const replaceDlgOpen = await page.evaluate(() => !!document.querySelector('.dlg'))
  if (replaceDlgOpen) {
    successes.push('Shortcut Ctrl+H (Replace Dialog) berfungsi')
    await page.keyboard.press('Escape')
    await sleep(200)
  } else {
    issues.push({ category: 'Shortcuts', detail: 'Shortcut Ctrl+H tidak membuka Replace Dialog' })
  }

  console.log('--- 8. Audit Responsive Viewports ---')
  const viewports = [
    { width: 1440, height: 900, name: 'Desktop Full' },
    { width: 1200, height: 800, name: 'Laptop Standard' },
    { width: 1024, height: 768, name: 'Small Laptop / Tablet' },
  ]
  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height })
    await sleep(300)
    const vpAudit = await page.evaluate(() => {
      const scrollX = document.documentElement.scrollWidth > window.innerWidth
      return { scrollX, bodyWidth: document.body.clientWidth }
    })
    if (!vpAudit.scrollX) {
      successes.push(`Viewport ${vp.name} (${vp.width}px): Tidak ada kebocoran horizontal halaman`)
    } else {
      issues.push({ category: 'Responsiveness', detail: `Viewport ${vp.name} (${vp.width}px): Terjadi horizontal scroll halaman utama` })
    }
  }

  await browser.close()

  console.log('\n=======================================')
  console.log('AUDIT COMPLETED')
  console.log('Successes:', successes.length)
  console.log('Issues found:', issues.length)
  console.log('Console Errors:', consoleLogs.error.length)
  console.log('=======================================')

  const reportData = {
    timestamp: new Date().toISOString(),
    successes,
    issues,
    consoleLogs,
    menuStats,
  }
  fs.writeFileSync(path.join(OUT_DIR, 'audit_report.json'), JSON.stringify(reportData, null, 2))
  return reportData
}

audit().then((r) => {
  console.log('Report saved to D:/spss/checks/chrome-audit/audit_report.json')
}).catch((e) => {
  console.error('Audit failed:', e)
  process.exit(1)
})
