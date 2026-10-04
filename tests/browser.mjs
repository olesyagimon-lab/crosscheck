import {chromium} from 'playwright';

import {spawn} from 'node:child_process';import assert from 'node:assert/strict';import fs from 'node:fs';
fs.mkdirSync('tests/output',{recursive:true});
const server=spawn('python3',['-m','http.server','8771','--directory','site']);await new Promise(r=>setTimeout(r,500));
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{})});const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[],external=[],measurements=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!/^(http:\/\/127\.0\.0\.1:8771|blob:|data:)/.test(r.url()))external.push(r.url())});
try{
 await page.goto('http://127.0.0.1:8771/');assert.equal(await page.locator('#load-sample,[data-unit],.demo-trigger').count(),0);
 for(const [document,name,expected]of [['document.png','normal',[3,0,0]],['document.pdf','extra',[2,1,0]],['document.png','wrong',[2,1,0]],['document.pdf','hidden',[2,0,1]]]){
  console.log('upload',document,name);await page.locator('#pdf-input').setInputFiles('tests/fixtures/'+document);await page.waitForFunction(()=>document.getElementById('pdf-files').textContent.includes('document'));
  await page.locator('#photo-input').setInputFiles('tests/fixtures/'+name+'.png');await page.waitForFunction(()=>!document.getElementById('verify').disabled);const start=Date.now();console.log('checking');await page.locator('#verify').click();
  await page.waitForFunction(()=>!document.getElementById('result-view').hidden||!document.getElementById('error').hidden,{},{timeout:95000});
  if(await page.locator('#error').isVisible())throw new Error(await page.locator('#error').textContent());
  const actual=await Promise.all(['confirmed','mismatch','unverified'].map(k=>page.locator('.badge.'+k).count()));assert.deepEqual(actual,expected,name);measurements.push({document,name,ms:Date.now()-start,actual});console.log(name,measurements.at(-1));
  if(name==='normal'){
   await page.locator('.pdf-evidence summary').click();await page.locator('#workspace').screenshot({path:'tests/output/result-desktop.png'});
   for(const width of [768,390]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.locator('#workspace').screenshot({path:`tests/output/result-${width}.png`});}await page.setViewportSize({width:1440,height:1000});
  }
  if(name==='hidden'){await page.locator('[data-row="2"]').click();assert.match(await page.locator('#explanation').textContent(),/does not prove/);}
  await page.locator('#reset').click();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);fs.writeFileSync('tests/output/browser-results.json',JSON.stringify({measurements,errors,external},null,2));console.log('PASS automatic document-photo/PDF + one overview, counts, wrong SKU, no false missing, responsive, local only.');
}finally{await browser.close();server.kill();}
