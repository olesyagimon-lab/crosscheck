// Source files stay in the browser. No external recognition service is called.
export function normalizeCode(s){return String(s).trim().toUpperCase().replace(/[‐‑–—]/g,'-').replace(/\s*[-]\s*/g,'-');}
export function parsePackingRows(items,pageWidth,pageHeight){
 const groups=[];
 for(const item of items){if(!item.str?.trim())continue;const y=item.transform[5],x=item.transform[4];let g=groups.find(g=>Math.abs(g.y-y)<4);if(!g){g={y,items:[]};groups.push(g);}g.items.push({...item,x});}
 const lines=groups.sort((a,b)=>b.y-a.y).map(g=>({text:g.items.sort((a,b)=>a.x-b.x).map(i=>i.str).join(' ').replace(/\s+/g,' ').trim(),g}));
 const rows=[];
 for(const {text,g} of lines){
  const m=text.match(/^(?:(\d+)\s+)?(.+?)\s+([A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)+)\s+(\d+)(?:\s+(?:units?|pcs?))?$/i);
  if(!m||/^order\b/i.test(m[2]))continue;
  const left=Math.min(...g.items.map(i=>i.x)),right=Math.max(...g.items.map(i=>i.x+i.width)),height=Math.max(...g.items.map(i=>Math.abs(i.transform[3])||i.height||12));
  rows.push({row:rows.length+1,name:m[2].trim(),sku:normalizeCode(m[3]),expected:Number(m[4]),source_text:text,source_bbox:[left/pageWidth,(pageHeight-g.y-height)/pageHeight,(right-left)/pageWidth,(height+6)/pageHeight]});
 }
 if(!rows.length)throw new Error('No product rows could be read. Use a one-page text PDF with columns Product, SKU and Quantity. The sample shows a supported layout.');
 if(rows.length>5)throw new Error('This packing list has more than five product types. Please use a smaller delivery.');
 if(rows.some(r=>!Number.isSafeInteger(r.expected)||r.expected<0)||new Set(rows.map(r=>r.sku)).size!==rows.length)throw new Error('The list has repeated product codes or invalid quantities. Please use one row per product code.');
 return rows;
}
export async function readDocument(file){
 const pdfjs=await import('./vendor/pdf/pdf.min.mjs');pdfjs.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdf/pdf.worker.min.mjs',import.meta.url).href;
 const document=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false}).promise;
 try{if(document.numPages!==1)throw new Error('Please use a one-page packing list.');const page=await document.getPage(1);const text=await page.getTextContent();const size=page.getViewport({scale:1});const rows=parsePackingRows(text.items,size.width,size.height);const viewport=page.getViewport({scale:1.35});const canvas=window.document.createElement('canvas');canvas.width=viewport.width;canvas.height=viewport.height;await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;return {rows,preview:canvas.toDataURL('image/jpeg',.9)};}finally{await document.destroy();}
}
function wordsFrom(data){return (data.blocks||[]).flatMap(b=>(b.paragraphs||[]).flatMap(p=>(p.lines||[]).flatMap(l=>l.words||[])));}
function lineCandidates(data){const candidates=[];for(const block of data.blocks||[])for(const p of block.paragraphs||[])for(const line of p.lines||[]){
 const words=line.words||[];for(let i=0;i<words.length;i++){
  const a=words[i];const raw=a.text.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9_-]+$/g,'');let token=raw,bbox=a.bbox,confidence=a.confidence;
  if(/^[A-Za-z0-9]+[-_]$/.test(raw)&&words[i+1]&&/^[A-Za-z0-9]+$/.test(words[i+1].text)){const b=words[i+1];token+=b.text;bbox={x0:a.bbox.x0,y0:Math.min(a.bbox.y0,b.bbox.y0),x1:b.bbox.x1,y1:Math.max(a.bbox.y1,b.bbox.y1)};confidence=Math.min(a.confidence,b.confidence);}
  if(/^[A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)+$/.test(token)&&token.length>=4)candidates.push({sku:normalizeCode(token),bbox,confidence});
 }}
 const words=wordsFrom(data);for(const a of words){if(!/^[A-Za-z0-9]+[-_]$/.test(a.text))continue;const height=a.bbox.y1-a.bbox.y0;const suffix=words.filter(b=>/^[A-Za-z0-9]{1,4}$/.test(b.text)&&b.bbox.x0>=a.bbox.x1-4&&b.bbox.x0-a.bbox.x1<height*3&&Math.abs(b.bbox.y0-a.bbox.y0)<height*2).sort((b,c)=>Math.hypot(b.bbox.x0-a.bbox.x1,b.bbox.y0-a.bbox.y0)-Math.hypot(c.bbox.x0-a.bbox.x1,c.bbox.y0-a.bbox.y0))[0];if(suffix)candidates.push({sku:normalizeCode(a.text+suffix.text),confidence:Math.min(a.confidence,suffix.confidence),bbox:{x0:a.bbox.x0,y0:Math.min(a.bbox.y0,suffix.bbox.y0),x1:suffix.bbox.x1,y1:Math.max(a.bbox.y1,suffix.bbox.y1)}});}
 return candidates;}
export function suggestedReadings(sku,rows){
 const key=s=>normalizeCode(s).replace(/_/g,'-').replace(/[O0]/g,'0').replace(/[I1L]/g,'1').replace(/[S5]/g,'5').replace(/[B8]/g,'8');
 return rows.filter(r=>{if(r.sku===sku)return false;if(key(r.sku)===key(sku))return true;if(r.sku.split('-')[0]!==sku.split('-')[0]||r.sku.length!==sku.length)return false;return [...sku].filter((c,i)=>c!==r.sku[i]).length===1;}).map(r=>r.sku);
}
let workerPromise=null;let reportProgress=()=>{};
async function getReader(progress){
 reportProgress=progress;if(!window.Tesseract)throw new Error('The local reader could not load. Reload the page and try again.');
 if(!workerPromise)workerPromise=window.Tesseract.createWorker('eng',1,{workerPath:new URL('./vendor/ocr/worker.min.js',import.meta.url).href,corePath:new URL('./vendor/ocr/',import.meta.url).href,langPath:new URL('./vendor/ocr/',import.meta.url).href,workerBlobURL:false,cacheMethod:'none',gzip:false,logger:m=>{if(m.status!=='recognizing text')reportProgress('Local reader: '+m.status);else reportProgress(`Reading label text · ${Math.round(m.progress*100)}%`);}}).catch(e=>{workerPromise=null;throw e;});
 return await workerPromise;
}
export async function scanPhoto(url,photoIndex,progress){
 const worker=await getReader(progress);const image=new Image();image.src=url;await image.decode();const width=image.naturalWidth,height=image.naturalHeight;
 await worker.setParameters({tessedit_pageseg_mode:'11',user_defined_dpi:'300'});
 const {data}=await worker.recognize(image,{}, {blocks:true});
 await worker.setParameters({tessedit_pageseg_mode:'6'});const structured=await worker.recognize(image,{}, {blocks:true});
 const candidates=[...lineCandidates(data),...lineCandidates(structured.data)].filter((c,i,a)=>!a.slice(0,i).some(d=>d.sku===c.sku&&Math.abs(d.bbox.x0-c.bbox.x0)<12&&Math.abs(d.bbox.y0-c.bbox.y0)<12));const detections=[];
 // Improve small label text by enlarging automatically detected regions. Not keyed to demo files.
 for(const candidate of candidates.slice(0,18)){
  let best=candidate;const b=candidate.bbox,bw=b.x1-b.x0,bh=b.y1-b.y0;
  const left=Math.max(0,Math.floor(b.x0-bw*.7)),top=Math.max(0,Math.floor(b.y0-bh*4));const cw=Math.min(width-left,Math.ceil(bw*3)),ch=Math.min(height-top,Math.ceil(bh*7));
  const crop=document.createElement('canvas');const scale=Math.min(4,1500/Math.max(cw,ch));crop.width=Math.round(cw*scale);crop.height=Math.round(ch*scale);crop.getContext('2d').drawImage(image,left,top,cw,ch,0,0,crop.width,crop.height);
  const improved=await worker.recognize(crop,{}, {blocks:true});const local=lineCandidates(improved.data);let selected=local.sort((a,b)=>b.confidence-a.confidence)[0];
  if(selected&&selected.confidence>candidate.confidence){best={...selected,bbox:{x0:left+selected.bbox.x0/scale,y0:top+selected.bbox.y0/scale,x1:left+selected.bbox.x1/scale,y1:top+selected.bbox.y1/scale}};}
  if(best.confidence<40)continue;
  const pad=8;const bb=best.bbox;const normalized=[Math.max(0,(bb.x0-pad)/width),Math.max(0,(bb.y0-pad)/height),Math.min(width,bb.x1+pad)/width-Math.max(0,(bb.x0-pad)/width),Math.min(height,bb.y1+pad)/height-Math.max(0,(bb.y0-pad)/height)];
  if(detections.some(d=>d.sku===best.sku&&Math.abs(d.bbox[0]-normalized[0])<.03&&Math.abs(d.bbox[1]-normalized[1])<.03))continue;
  detections.push({sku:best.sku,photo:photoIndex,bbox:normalized,confidence:best.confidence,unit:'',verified:false});
 }
 return {detections,width,height};
}
export async function stopReader(){if(workerPromise){const promise=workerPromise;workerPromise=null;try{await(await promise).terminate();}catch{}}}
// OCR document photographs: reuse the same local worker, preserve row coordinates.
export async function readDocumentPhoto(url,progress){
 const worker=await getReader(progress);const image=new Image();image.src=url;await image.decode();
 await worker.setParameters({tessedit_pageseg_mode:'6',user_defined_dpi:'300'});
 const {data}=await worker.recognize(image,{}, {blocks:true});const items=[];
 for(const block of data.blocks||[])for(const paragraph of block.paragraphs||[])for(const line of paragraph.lines||[]){
  const words=line.words||[];if(!words.length)continue;
  const b=line.bbox;items.push({str:words.map(w=>w.text).join(' '),width:b.x1-b.x0,transform:[1,0,0,b.y1-b.y0,b.x0,image.naturalHeight-b.y1],confidence:Math.min(...words.map(w=>w.confidence))});
 }
 const rows=parsePackingRows(items,image.naturalWidth,image.naturalHeight);
 // Re-read source confidence per extracted row; uncertain rows never auto-confirm.
 for(const r of rows){const item=items.find(i=>i.str.replace(/\s+/g,' ').trim()===r.source_text);r.source_confidence=item?.confidence??0;}
 return {rows,preview:url};
}
function overlap(a,b){const x=Math.max(a[0],b[0]),y=Math.max(a[1],b[1]),right=Math.min(a[0]+a[2],b[0]+b[2]),bottom=Math.min(a[1]+a[3],b[1]+b[3]);const shared=Math.max(0,right-x)*Math.max(0,bottom-y);return shared/Math.min(a[2]*a[3],b[2]*b[3]);}
export function compareOverview(rows,detections){
 // A region is a label, not an inferred physical object. One visible code per unit is the capture convention.
 const unique=[];for(const d of detections){if(!unique.some(e=>e.sku===d.sku&&overlap(e.bbox,d.bbox)>.45))unique.push(d);}
 const strong=unique.filter(d=>d.confidence>=80);
 return rows.map(r=>{
  const exact=strong.filter(d=>d.sku===r.sku);
  const uncertain=unique.filter(d=>(d.sku===r.sku&&d.confidence<80)||(d.sku!==r.sku&&suggestedReadings(d.sku,[r]).includes(r.sku)));
  const wrong=strong.filter(d=>d.sku!==r.sku&&d.sku.split('-')[0]===r.sku.split('-')[0]);
  const sourceCertain=r.source_confidence===undefined||r.source_confidence>=80;
  let status='unverified',explanation,observed=exact.length||null;
  if(!sourceCertain){explanation='The document row is not clear enough to trust. Upload a sharper document photo or a text PDF.';}
  else if(uncertain.length){explanation='A nearby code reading is uncertain. The reader will not silently change it to the ordered code. Replace the overview with a sharper photo.';}
  else if(exact.length>r.expected){status='mismatch';explanation=`${exact.length} separate readable label regions show ${r.sku}; ${r.expected} were ordered. Check the highlighted regions for extra units.`;}
  else if(wrong.length){status='mismatch';explanation=`A readable label shows ${wrong[0].sku}, which differs from ${r.sku}. This does not prove that the ordered item was not delivered.`;}
  else if(exact.length&&exact.length===r.expected){status='confirmed';explanation=`${exact.length} separate readable label region${exact.length===1?'':'s'} match ${r.sku} and the ordered quantity. This checks visible labels only; covered or unlabelled goods cannot be verified.`;}
  else {explanation=exact.length?`Only ${exact.length} readable label region${exact.length===1?'':'s'} show ${r.sku}; ${r.expected} were ordered. This is not proof of a shortage.`:`No readable ${r.sku} label was found. The item may have a hidden or unreadable label; this does not prove it was not delivered.`;}
  const support=[...exact,...uncertain,...wrong];return {...r,status,observed,explanation,clarification:sourceCertain?'Retake the entire delivery with every item separated and its existing code facing the camera. Replace the current overview; do not add a second view.':'Upload a clearer document photo or a one-page text PDF.',evidence:support.length?support.map(d=>({photo:0,bbox:d.bbox})):[{photo:0,bbox:[0,0,1,1]}]};
 });
}
