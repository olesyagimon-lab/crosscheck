import {readDocument,readDocumentPhoto,scanPhoto,compareOverview,stopReader} from './local-engine.js';
const $=id=>document.getElementById(id);
const state={documentFile:null,photo:null,document:null,results:null,selected:0,busy:false,preparing:0,generation:0};
const labels={confirmed:'Visible match',mismatch:'Mismatch',unverified:'Unverified'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function error(s){$('error').textContent=s;$('error').hidden=!s;}
function view(which){for(const x of ['upload','loading','result'])$(x+'-view').hidden=x!==which;}
function reset(){state.generation++;stopReader();for(const item of [state.documentFile,state.photo])if(item)URL.revokeObjectURL(item.url);Object.assign(state,{documentFile:null,photo:null,document:null,results:null,selected:0,busy:false,preparing:0});view('upload');error('');renderFiles();}
function renderFiles(){
 const d=state.documentFile,p=state.photo;
 $('pdf-files').innerHTML=d?`<div class="file-item">${d.isPDF?'':`<img class="document-thumb" src="${esc(d.url)}" alt="Uploaded document">`}<span>${esc(d.name)}</span><button class="remove" id="remove-document" aria-label="Remove document">×</button></div>`:'';
 $('remove-document')?.addEventListener('click',()=>{URL.revokeObjectURL(d.url);state.documentFile=null;renderFiles();});
 $('photo-files').innerHTML=p?`<div class="thumb"><img src="${esc(p.url)}" alt="Entire delivery photo"><button class="remove" id="remove-photo" aria-label="Remove delivery photo">×</button><span>${esc(p.name)}</span></div>`:'';
 $('remove-photo')?.addEventListener('click',()=>{URL.revokeObjectURL(p.url);state.photo=null;renderFiles();});
 $('verify').disabled=!(d&&p)||state.busy||state.preparing>0;
 $('readiness').textContent=state.preparing?'Preparing your upload…':!d&&!p?'Add your document and one delivery photo.':!d?'Delivery photo added. Add a document photo or PDF.':!p?'Document added. Add one photo of all delivered items.':'Both files are ready. Select “Check delivery”.';
}
async function preparePhoto(file){
 if(file.size>20*1024*1024)throw new Error('This photo is larger than 20 MB. Please export a smaller image.');
 if(!/\.(jpe?g|png|webp|avif)$/i.test(file.name)&&!['image/jpeg','image/png','image/webp','image/avif'].includes(file.type))throw new Error('Please use JPG, PNG, WEBP or AVIF. For iPhone HEIC photos, export as JPG first.');
 const url=URL.createObjectURL(file);try{
  const img=new Image();img.src=url;await img.decode();if(!img.naturalWidth||!img.naturalHeight)throw new Error('empty');
  // Uniform resizing keeps evidence coordinates aligned with the preview.
  const scale=Math.min(1,2560/Math.max(img.naturalWidth,img.naturalHeight));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.94));if(!blob||blob.size>5*1024*1024)throw new Error('size');
  return new File([blob],file.name.replace(/\.[^.]+$/,'')+'.jpg',{type:'image/jpeg'});
 }catch{throw new Error('This image could not be opened. Please export it as JPG or PNG and try again.');}finally{URL.revokeObjectURL(url);}
}
async function setInput(files,kind){
 const list=Array.from(files);if(list.length!==1)return error(kind==='documentFile'?'Choose one document photo or PDF.':'Choose one overview photo containing all items.');
 if(state.busy||state.preparing)return error('Please wait while the current file is prepared.');
 const original=list[0],isPDF=kind==='documentFile'&&(/\.pdf$/i.test(original.name)||original.type==='application/pdf');
 const generation=state.generation;state.preparing++;error('');renderFiles();
 try{if(isPDF&&original.size>5*1024*1024)throw new Error('Please use a PDF up to 5 MB.');const file=isPDF?original:await preparePhoto(original);if(generation!==state.generation)return;
  if(state[kind])URL.revokeObjectURL(state[kind].url);state[kind]={file,url:URL.createObjectURL(file),name:original.name,isPDF};
 }catch(e){if(generation===state.generation)error(e.message);}finally{if(generation===state.generation){state.preparing--;renderFiles();}}
}
$('pdf-input').onchange=e=>{setInput(e.target.files,'documentFile');e.target.value='';};$('photo-input').onchange=e=>{setInput(e.target.files,'photo');e.target.value='';};
for(const [id,kind]of [['pdf-drop','documentFile'],['photo-drop','photo']]){const el=$(id);el.ondragover=e=>{e.preventDefault();el.classList.add('dragover');};el.ondragleave=()=>el.classList.remove('dragover');el.ondrop=e=>{e.preventDefault();el.classList.remove('dragover');setInput(e.dataTransfer.files,kind);};}
async function timed(operation){let timer;try{return await Promise.race([operation,new Promise((_,reject)=>{timer=setTimeout(()=>{stopReader();reject(new Error('Reading took too long. Try smaller, sharper photos. Your files are still here.'));},90000);})]);}finally{clearTimeout(timer);}}
async function verify(){
 if(state.busy||state.preparing||!state.documentFile||!state.photo)return;
 const generation=state.generation;state.busy=true;const start=performance.now();error('');view('loading');
 const progress=message=>{if(generation===state.generation)$('loading-message').textContent=message;};
 try{
  progress('Reading product codes and quantities from your document…');
  state.document=await timed(state.documentFile.isPDF?readDocument(state.documentFile.file):readDocumentPhoto(state.documentFile.url,progress));
  if(generation!==state.generation)return;progress('Reading visible product labels in the delivery photo…');
  const result=await timed(scanPhoto(state.photo.url,0,progress));if(generation!==state.generation)return;
  state.results={findings:compareOverview(state.document.rows,result.detections),duration:performance.now()-start};state.selected=0;renderResults();
 }catch(e){if(generation===state.generation){view('upload');error(e.message||'The reader could not finish. Please try sharper photos.');}}
 finally{if(generation===state.generation){state.busy=false;renderFiles();}}
}
function renderResults(){
 view('result');const rows=state.results.findings;const counts={confirmed:0,mismatch:0,unverified:0};rows.forEach(r=>counts[r.status]++);
 $('result-title').textContent=counts.mismatch?'Visible differences found':counts.unverified?'Some items need a clearer view':'Visible quantities match';
 $('result-note').textContent='Automatic comparison of readable printed codes. Hidden labels and unlabelled goods cannot be checked. A visible match is not a guarantee of complete delivery.';
 $('summary').innerHTML=[['confirmed','Visible matches'],['mismatch','Mismatches'],['unverified','Unverified']].map(([k,s])=>`<div><strong>${counts[k]}</strong><span>${s}</span></div>`).join('');
 $('findings').innerHTML=rows.map((r,i)=>`<button class="finding ${state.selected===i?'selected':''}" data-row="${i}" aria-pressed="${state.selected===i}"><strong>${esc(r.name)}</strong><span class="sku">${esc(r.sku)} · Row ${r.row}</span><span class="badge ${r.status}">${labels[r.status]}</span><p>Ordered: ${r.expected} · Readable labels: ${r.observed===null?'unknown':r.observed}</p></button>`).join('');
 document.querySelectorAll('[data-row]').forEach(b=>b.onclick=()=>{state.selected=Number(b.dataset.row);renderResults();});
 $('metrics').textContent=`Time to result: ${(state.results.duration/1000).toFixed(1)} s · Recognition API cost: $0 · Hosting excluded`;
 showEvidence(0);
}
function showEvidence(index){
 const r=state.results.findings[state.selected],ev=r.evidence[index];$('source-row').textContent=`Row ${r.row}: ${r.source_text}`;$('explanation').textContent=r.explanation;
 $('pdf-link').href=state.documentFile.url;$('document-preview').src=state.document.preview;const db=r.source_bbox;Object.assign($('document-bbox').style,{left:db[0]*100+'%',top:db[1]*100+'%',width:db[2]*100+'%',height:db[3]*100+'%'});
 $('clarify').hidden=r.status!=='unverified';$('clarify-text').textContent=r.clarification;
 $('evidence-tabs').innerHTML=r.evidence.length>1?r.evidence.map((_,i)=>`<button data-evidence="${i}">Label ${i+1}</button>`).join(''):'';
 document.querySelectorAll('[data-evidence]').forEach(b=>b.onclick=()=>showEvidence(Number(b.dataset.evidence)));
 $('evidence-photo').src=state.photo.url;$('photo-number').textContent='Delivery overview';const[x,y,w,h]=ev.bbox;Object.assign($('bbox').style,{left:x*100+'%',top:y*100+'%',width:w*100+'%',height:h*100+'%'});
}
$('verify').onclick=verify;$('reset').onclick=reset;
$('cancel-check').onclick=()=>{state.generation++;state.busy=false;stopReader();view('upload');renderFiles();error('Checking stopped. Your files are still here.');};
$('clarify-button').onclick=()=>{view('upload');renderFiles();error('Replace the document if its text is unclear, or replace the delivery overview with a sharper photo of all items.');};
const backgroundVideo=$('background-video');if(backgroundVideo){const motion=window.matchMedia('(prefers-reduced-motion: reduce)');const updateMotion=()=>{if(motion.matches)backgroundVideo.pause();else backgroundVideo.play().catch(()=>{});};motion.addEventListener?.('change',updateMotion);updateMotion();document.addEventListener('visibilitychange',()=>{if(document.hidden)backgroundVideo.pause();else updateMotion();});}
renderFiles();
