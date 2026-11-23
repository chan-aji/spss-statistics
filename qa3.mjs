import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const OUT='D:/spss/checks/continue-qa3'; fs.mkdirSync(OUT,{recursive:true})
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',userDataDir:'D:/spss/app/.chrome-qa',args:['--no-sandbox','--disable-gpu','--force-device-scale-factor=1'],defaultViewport:{width:1440,height:900,deviceScaleFactor:1}})
const page=await browser.newPage()
await page.goto('http://127.0.0.1:62650/?v=23',{waitUntil:'networkidle0'})
await page.waitForSelector('.hero h1')
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
await sleep(400)
const sections=[['hero','.hero'],['usecases','#kegunaan'],['case','#contoh'],['products','#produk'],['workflow','#cara-kerja'],['compare','#perbandingan'],['footer','.footer']]
for(const [name,sel] of sections){
  const el=await page.$(sel); if(!el){console.log('missing',sel);continue}
  await el.screenshot({path:OUT+'/'+name+'.png'})
  console.log('shot',name)
}
const metrics=await page.evaluate(()=>({height:document.documentElement.scrollHeight,width:innerWidth,overflow:document.documentElement.scrollWidth-innerWidth}))
console.log(JSON.stringify(metrics))
await browser.close()
