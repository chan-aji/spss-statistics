import puppeteer from 'puppeteer-core'
const b=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',userDataDir:'D:/spss/app/.chrome-qa',args:['--no-sandbox','--disable-gpu'],defaultViewport:{width:1440,height:900,deviceScaleFactor:1}})
const p=await b.newPage(); await p.goto('http://127.0.0.1:62650/?v=24',{waitUntil:'networkidle0'}); await p.waitForSelector('.hero h1')
const m=await p.evaluate(()=>{
  const box=s=>{const e=document.querySelector(s); if(!e)return null; const r=e.getBoundingClientRect(); const cs=getComputedStyle(e); return {x:Math.round(r.x),w:Math.round(r.width),padL:cs.paddingLeft,padR:cs.paddingRight,maxW:cs.maxWidth,ml:cs.marginLeft,mr:cs.marginRight}}
  return {brand:box('.masthead-inner'), hero:box('.hero-grid'), heroH1:box('.hero h1'), useSection:box('#kegunaan'), useHead:box('#kegunaan .section-head'), h2:box('#kegunaan h2'), table:box('.use-table'), products:box('.product-grid'), footer:box('.footer-grid'), page:box('.page')}
})
console.log(JSON.stringify(m,null,2)); await b.close()
