import assert from 'node:assert/strict';
import {compareDelivery,parsePackingRows,normalizeCode,suggestedReadings} from '../site/local-engine.js';
const rows=[{row:1,name:'Mug',sku:'CUP-01',expected:1,source_text:'Mug CUP-01 1'},{row:2,name:'Small towel',sku:'TOW-S',expected:1,source_text:'Small towel TOW-S 1'}];
const d=(sku,unit,photo=0,verified=true)=>({sku,unit,photo,verified,bbox:[.1,.1,.2,.2]});
const options={complete:true,coverage:true,photoCount:2};
let r=compareDelivery(rows,[d('CUP-01','A'),d('TOW-S','B')],options);assert.deepEqual(r.map(x=>x.status),['confirmed','confirmed']);
r=compareDelivery(rows,[d('CUP-01','A',0),d('CUP-01','A',1),d('TOW-S','B')],options);assert.equal(r[0].observed,1);assert.equal(r[0].evidence.length,2);
r=compareDelivery(rows,[d('CUP-01','A'),d('CUP-01','C'),d('TOW-S','B')],options);assert.equal(r[0].status,'mismatch');assert.equal(r[0].observed,2);
r=compareDelivery(rows,[d('CUP-01','A'),d('TOW-L','B')],options);assert.equal(r[1].status,'mismatch');assert.ok(r[1].explanation.includes('does not prove'));
r=compareDelivery(rows,[d('CUP-01','A'),d('TOW-S','')],options);assert.equal(r[1].status,'unverified');assert.equal(r[1].observed,null);
r=compareDelivery(rows,[],options);assert.ok(r.every(x=>x.status==='unverified'&&x.observed===null));assert.ok(r.every(x=>x.evidence.length===2));
r=compareDelivery(rows,[d('CUP-01','A'),d('TOW-S','A')],options);assert.ok(r.every(x=>x.status==='unverified'));
r=compareDelivery(rows,[d('CUP-01','A'),d('TOW-S','B')],{complete:false,coverage:true});assert.ok(r.every(x=>x.status==='unverified'));
r=compareDelivery(rows,[d('CUP-O1','A')],options);assert.equal(r[0].status,'mismatch');assert.equal(normalizeCode('CUP-O1'),'CUP-O1');
const items=[['1',10],['Small towel',40],['TOW-S',180],['1',240]].map(([str,x])=>({str,transform:[12,0,0,12,x,600],width:str.length*6}));r=parsePackingRows(items,300,800);assert.equal(r[0].sku,'TOW-S');assert.equal(r[0].name,'Small towel');assert.ok(r[0].source_bbox[1]>0);assert.throws(()=>parsePackingRows([],300,800));
console.log('PASS: exact identity, distinct counts, repeated-view deduplication, wrong similar SKU, hidden/missing-view uncertainty, conflicting unit IDs, coverage and source row parsing.');

assert.notEqual(normalizeCode("CUP_01"),normalizeCode("CUP-01"));assert.deepEqual(suggestedReadings("CUP-O1",rows),["CUP-01"]);
