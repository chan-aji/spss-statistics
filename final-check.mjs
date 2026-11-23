import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'

const OUT='D:/spss/checks/final-continue'
fs.rmSync(OUT,{recursive:true,force:true}); fs.mkdirSync(OUT,{recursive:true})
const DL=path.join(OUT,'downloads'); fs.mkdirSync(DL)
const BASE='http://127.0.0.1:62650/?v=31'
const report={checks:[],consoleErrors:[],pageErrors:[]}
const ok=(n,p,d)=>{report.checks.push({name:n,pass:!!p,detail:d}); if(!p) console.log('FAIL',n,d??'')}
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',userDataDir:'D:/spss/app/.chrome-qa',args:['--no-sandbox','--disable-gpu','--force-device-scale-factor=1','--disable-dev-shm-usage'],defaultViewport:{width:1440,height:900,deviceScaleFactor:1}})
const page=await browser.newPage()
page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text())})
page.on('pageerror',e=>report.pageErrors.push(String(e)))
const shot=async(n,full=false)=>{await page.screenshot({path:path.join(OUT,n+'.png'),fullPage:full})}
const openMenu=async(label)=>{await page.evaluate((l)=>{const b=[...document.querySelectorAll('.menu-top')].find(x=>x.textContent.trim()===l); b?.click()},label); await sleep(150)}
const clickItem=async(text)=>{const r=await page.evaluate((t)=>{const b=[...document.querySelectorAll('.menu-dropdown .menu-item')].find(x=>x.textContent.trim().startsWith(t)); if(!b)return false; b.click(); return true},text); await sleep(300); return r}

// landing
await page.goto(BASE,{waitUntil:'networkidle0'})
await page.evaluate(()=>localStorage.clear())
await page.reload({waitUntil:'networkidle0'})
await page.waitForSelector('.hero h1'); await sleep(400)
const landing=await page.evaluate(()=>({h1:document.querySelector('.hero h1')?.innerText,sections:[...document.querySelectorAll('main section[id]')].map(s=>s.id),facts:[...document.querySelectorAll('.hero-facts dt')].map(x=>x.textContent),overflow:document.documentElement.scrollWidth-innerWidth,height:document.documentElement.scrollHeight}))
report.landing=landing
ok('landing sections',landing.sections.length>=5,landing.sections.join(','))
ok('landing facts show 8 tests',landing.facts.includes('8'),landing.facts.join(','))
ok('landing no overflow 1440',landing.overflow<=0,landing.overflow)
await shot('landing-1440',true)

// workspace
await page.goto(BASE+'#/workspace',{waitUntil:'networkidle0'})
await page.waitForSelector('.data-table tbody tr'); await sleep(300)
const ws=await page.evaluate(()=>({rows:document.querySelectorAll('.data-table tbody tr').length,cols:document.querySelectorAll('.data-table thead th').length,title:document.querySelector('.spss-title-text')?.textContent,overflow:document.documentElement.scrollWidth-innerWidth,hint:document.querySelector('.spss-hint')?.innerText}))
report.workspace=ws
ok('workspace 100 cases + add row',ws.rows===101,ws.rows)
ok('workspace 7 variables',ws.cols===8,ws.cols)
ok('workspace no overflow',ws.overflow<=0,ws.overflow)
await shot('workspace-1440')

// quick guide + regression
await page.evaluate(()=>document.querySelector('.toolbar-guide')?.click()); await sleep(350)
ok('quick guide opens',!!(await page.$('.quick-guide')))
await shot('quick-guide-1440')
await page.evaluate(()=>document.querySelector('.guide-card:nth-child(4) .guide-run')?.click()); await sleep(600)
const reg=await page.evaluate(()=>{
  const n=document.querySelector('.output-node')
  const cells=[...n.querySelectorAll('.spss-table td')].map(c=>c.textContent.trim())
  return {title:n?.querySelector('h3')?.textContent,tables:n.querySelectorAll('.spss-table').length,r2:cells.includes('0,740'),f:cells.includes('91,083'),interp:n.querySelector('.output-interpret p')?.textContent?.slice(0,120),tree:document.querySelectorAll('.tree-node').length}
})
report.regression=reg
ok('regression output 4 tables',reg.tables===4,reg.tables)
ok('regression R square',reg.r2,reg.title)
ok('regression F',reg.f)
ok('output tree shows node',reg.tree>=1,reg.tree)
await shot('regression-output-1440')

// all analyses
const runKinds=[['Frequencies','Frequencies…'],['Crosstabs','Crosstabs…'],['One-Sample','One-Sample T Test…'],['Independent','Independent-Samples T Test…'],['Reliability','Reliability Analysis…'],['Descriptives','Descriptives…']]
const results=[]
for(const [name,item] of runKinds){
  const before=await page.evaluate(()=>document.querySelectorAll('.output-node').length)
  await openMenu('Analyze')
  const clicked=await clickItem(item)
  const dlg=!!(await page.$('.dlg'))
  if(dlg) await page.click('.dlg-btn-primary')
  await sleep(300)
  const after=await page.evaluate(()=>document.querySelectorAll('.output-node').length)
  results.push({name,clicked,dlg,added:after-before})
  ok('analysis runs: '+name,dlg&&after>before,JSON.stringify({clicked,dlg,added:after-before}))
}
// correlation submenu
{
  const before=await page.evaluate(()=>document.querySelectorAll('.output-node').length)
  await openMenu('Analyze')
  const sub=await page.evaluate(()=>{
    const el=[...document.querySelectorAll('.menu-dropdown .menu-item.has-sub')].find(x=>x.textContent.includes('Correlate'))
    if(!el) return false
    el.parentElement.querySelector('.menu-submenu .menu-item')?.click(); return true
  })
  await sleep(300)
  const dlg=!!(await page.$('.dlg'))
  if(dlg) await page.click('.dlg-btn-primary')
  await sleep(300)
  const after=await page.evaluate(()=>document.querySelectorAll('.output-node').length)
  results.push({name:'Correlation',sub,dlg,added:after-before})
  ok('analysis runs: Correlation',dlg&&after>before,JSON.stringify({sub,dlg,added:after-before}))
}
report.analyses=results
await shot('all-outputs-1440')

// variable view + values dialog
await page.evaluate(()=>{const b=[...document.querySelectorAll('.spss-tab')].find(x=>x.textContent.includes('Variable View')); b?.click()})
await page.waitForSelector('.variable-table'); await sleep(200)
await shot('variable-view-1440')
await page.click('.variable-table tbody tr:nth-child(2) .vv-dots'); await sleep(250)
ok('values dialog opens',!!(await page.$('.values-dlg')))
await shot('values-dialog-1440')
await page.evaluate(()=>document.querySelector('.values-dlg .dlg-close')?.click()); await sleep(150)

// regression dialog
await page.evaluate(()=>{const b=[...document.querySelectorAll('.spss-tab')].find(x=>x.textContent.includes('Data View')); b?.click()}); await sleep(150)
await openMenu('Analyze')
await page.evaluate(()=>{
  const sub=[...document.querySelectorAll('.menu-dropdown .menu-item.has-sub')].find(x=>x.textContent.includes('Regression'))
  sub?.parentElement.querySelector('.menu-submenu .menu-item')?.click()
}); await sleep(300)
await shot('regression-dialog-1440')
await page.evaluate(()=>document.querySelector('.dlg-btn:not(.dlg-btn-primary)')?.click()); await sleep(150)

// CSV import + dynamic hint + imported-data one-click analyses
const csv='ID,Skor_A,Skor_B\n1,3,4\n2,4,5\n3,2,3\n4,5,5\n5,4,4\n'
fs.writeFileSync(path.join(OUT,'contoh.csv'),csv)
const input=await page.$('input[type=file]'); await input.uploadFile(path.join(OUT,'contoh.csv')); await sleep(700)
const imported=await page.evaluate(()=>({name:document.querySelector('.spss-dataset')?.textContent,headers:[...document.querySelectorAll('.data-table thead th .var-name')].map(x=>x.textContent),rows:document.querySelectorAll('.data-table tbody tr').length,hint:document.querySelector('.spss-hint')?.innerText}))
report.imported=imported
ok('CSV import works',imported.rows===6&&imported.headers.join(',')==='ID,Skor_A,Skor_B',JSON.stringify(imported))
await shot('csv-import-1440')
// run descriptives with imported data via quick guide
await page.evaluate(()=>document.querySelector('.toolbar-guide')?.click()); await sleep(300)
await page.evaluate(()=>document.querySelector('.guide-card:nth-child(1) .guide-run')?.click()); await sleep(500)
const importedRun=await page.evaluate(()=>{
  const n=document.querySelector('.output-node')
  return n?{title:n.querySelector('h3')?.textContent,tables:n.querySelectorAll('.spss-table').length}:null
})
report.importedRun=importedRun
ok('one-click works on imported data',importedRun&&importedRun.tables>0,JSON.stringify(importedRun))
await shot('imported-descriptives-1440')

// export
const client=await page.target().createCDPSession(); await client.send('Page.setDownloadBehavior',{behavior:'allow',downloadPath:DL})
await page.evaluate(()=>{const b=[...document.querySelectorAll('.spss-tab')].find(x=>x.textContent.includes('Output')); b?.click()}); await sleep(250)
await page.evaluate(()=>{const b=[...document.querySelectorAll('.spss-tool-btn')].find(x=>x.textContent.includes('Ekspor')); b?.click()}); await sleep(1200)
const files=fs.readdirSync(DL)
ok('export downloads HTML',files.some(f=>f.endsWith('.html')),files.join(','))
if(files.some(f=>f.endsWith('.html'))){const html=fs.readFileSync(path.join(DL,files.find(f=>f.endsWith('.html'))),'utf8'); ok('export has tables',html.includes('<table'),html.length)}

// mobile (fresh sample)
await page.evaluate(()=>localStorage.clear())
await page.setViewport({width:390,height:844,deviceScaleFactor:1})
await page.goto(BASE+'m#/workspace',{waitUntil:'networkidle0'}); await page.waitForSelector('.data-table tbody tr'); await sleep(300)
const mob=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,rows:document.querySelectorAll('.data-table tbody tr').length}))
report.mobile=mob
ok('mobile no page overflow',mob.overflow<=1,JSON.stringify(mob))
await shot('workspace-390')
await page.evaluate(()=>document.querySelector('.toolbar-guide')?.click()); await sleep(300)
await shot('guide-390')
await page.evaluate(()=>document.querySelector('.guide-card:nth-child(1) .guide-run')?.click()); await sleep(600)
await shot('output-390')
ok('mobile output visible',!!(await page.$('.output-node')))

// 1900
await page.setViewport({width:1900,height:1000,deviceScaleFactor:1})
await page.goto(BASE+'w#/workspace',{waitUntil:'networkidle0'}); await page.waitForSelector('.data-table tbody tr'); await sleep(250)
const wide=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,grid:Math.round(document.querySelector('.data-table').getBoundingClientRect().width),viewport:innerWidth}))
report.wide=wide
ok('1900 no overflow',wide.overflow<=0,JSON.stringify(wide))
await shot('workspace-1900')

report.consoleErrors=[...new Set(report.consoleErrors)]; report.pageErrors=[...new Set(report.pageErrors)]
ok('no console errors',report.consoleErrors.length===0,report.consoleErrors.join(' | '))
ok('no page errors',report.pageErrors.length===0,report.pageErrors.join(' | '))
fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2))
console.log(JSON.stringify({fails:report.checks.filter(c=>!c.pass),consoleErrors:report.consoleErrors,pageErrors:report.pageErrors,checks:report.checks.length},null,2))
await browser.close()
