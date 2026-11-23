import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const OUT='D:/spss/checks/final-continue'
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
const b=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',userDataDir:'D:/spss/app/.chrome-qa',args:['--no-sandbox','--disable-gpu','--force-device-scale-factor=1'],defaultViewport:{width:1440,height:900,deviceScaleFactor:1}})
const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(String(e))); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())})
await p.goto('http://127.0.0.1:62650/?v=40#/workspace',{waitUntil:'networkidle0'})
await p.evaluate(()=>localStorage.clear()); await p.reload({waitUntil:'networkidle0'}); await p.waitForSelector('.data-table tbody tr'); await sleep(300)
// run descriptives via guide
await p.evaluate(()=>document.querySelector('.toolbar-guide')?.click()); await sleep(300)
await p.evaluate(()=>document.querySelector('.guide-card:nth-child(1) .guide-run')?.click()); await sleep(500)
const desc=await p.evaluate(()=>{const n=document.querySelector('.output-node');return {title:n?.querySelector('h3')?.textContent,rows:[...n.querySelectorAll('.spss-table tbody tr')].map(r=>[...r.querySelectorAll('td')].map(c=>c.textContent.trim())),headers:[...n.querySelectorAll('.spss-table thead th')].map(c=>c.textContent.trim()),help:!!document.querySelector('.reading-help')}})
console.log(JSON.stringify(desc,null,2))
await p.screenshot({path:OUT+'/descriptives-1440.png'})
// frequencies
await p.evaluate(()=>{const top=[...document.querySelectorAll('.menu-top')].find(x=>x.textContent.trim()==='Analyze');top?.click()}); await sleep(150)
await p.evaluate(()=>{const it=[...document.querySelectorAll('.menu-dropdown .menu-item')].find(x=>x.textContent.trim().startsWith('Frequencies'));it?.click()}); await sleep(250)
await p.evaluate(()=>document.querySelector('.dlg-btn-primary')?.click()); await sleep(500)
const freq=await p.evaluate(()=>{const n=document.querySelector('.output-node');return {title:n?.querySelector('h3')?.textContent,tables:n.querySelectorAll('.spss-table').length,chart:!!n.querySelector('.spss-chart')}})
console.log(JSON.stringify(freq,null,2))
await p.screenshot({path:OUT+'/frequencies-1440.png'})
console.log('errors',JSON.stringify(errs))
await b.close()
