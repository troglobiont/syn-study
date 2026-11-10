import test from 'node:test';
import assert from 'node:assert/strict';
import {CHAPTERS,PRACTICE,TEST,BY_ID} from '../dist/content.js';
import {fresh,normalise,startTest,finishTest,testResult,orderedOptions,exportText,importText} from '../dist/core.js';
import {normaliseModels,riemann,directional,sectorArea,advancedModelOutput} from '../dist/models.js';
const near=(a,b,tol=1e-8)=>assert.ok(Math.abs(a-b)<tol,`${a} vs ${b}`);
test('real 1.0.1 history and unfinished test retain ten-question scope through save, export, finish and restart',()=>{
 const old={schemaVersion:1,contentVersion:'1.0.1',records:{'l1-2':{draft:{a:'0'},events:[{kind:'submit',answer:{a:'0'}}],pinned:true}},chapters:{one:{stage:'practice',index:3,visited:['meaning'],collected:true}},labs:{preset:'branch',input:2.25},test:{draft:{seed:'old',index:9,answers:{'t-8':{a:'3,-3'}},hints:[]},runs:[{seed:'old-run',answers:{'t-1':{a:['0','1']},'t-8':{a:'3,-3'}},hints:[],completedAt:'2026-11-10'}]}};
 const n=normalise(old);assert.equal(Object.keys(n.chapters).length,6);assert.equal(n.chapters.one.index,3);assert.equal(n.chapters.one.collected,true);assert.equal(n.records['l1-2'].pinned,true);
 assert.equal(testResult(n.test.runs[0]).length,10);assert.equal(testResult(n.test.runs[0]).filter(q=>q.correct).length,2);
 assert.equal(n.test.draft.questionIds.length,10);finishTest(n);assert.equal(testResult(n.test.runs.at(-1)).length,10);
 const restored=importText(exportText(n));assert.deepEqual(restored,n);startTest(restored);assert.equal(restored.test.draft.questionIds.length,30);
});
test('six complete chapters, all controls and sanitized persistent model state',()=>{
 assert.equal(CHAPTERS.length,6);for(const c of CHAPTERS){assert.equal(PRACTICE.filter(q=>q.chapter===c.id).length,5);if(Number(c.number)>2){assert.ok(c.theory.length>=8);assert.ok(c.workedExamples.length>=3);assert.ok(c.sources.length);assert.ok(advancedModelOutput(c.id,normaliseModels()).includes('<svg'));}}
 const s=fresh();s.models={angle:90,n:40,b:.5,method:'right',power:12,inner:.5,sector:8,evil:'x'};assert.deepEqual(importText(exportText(s)).models,normaliseModels(s.models));assert.equal(normaliseModels(s.models).evil,undefined);
 assert.equal(normaliseModels({n:Infinity,b:-4,method:'<script>'}).n,8);assert.equal(normaliseModels({b:-4}).b,.1);
});
test('legacy shuffle is unchanged after adding practice before test',()=>{
 for(const id of ['l1-2','l2-3','t-2','t-10']){const q=BY_ID[id],part=q.parts[0];let hash=2166136261;for(const ch of 'legacy-seed')hash=Math.imul(hash^ch.charCodeAt(0),16777619)>>>0;const ordinal=id.startsWith('t-')?10+Number(id.slice(2))-1:id.startsWith('l1')?Number(id.slice(3))-1:5+Number(id.slice(3))-1;const shift=(hash+ordinal)%part.options.length;assert.deepEqual(orderedOptions(q,part,'legacy-seed'),part.options.slice(shift).concat(part.options.slice(0,shift)));}
});
test('numerical sums bracket integral, midpoint error decreases and selected directions match finite differences',()=>{
 for(const n of [2,4,8,16,40]){assert.ok(riemann(n,'left')<1/3);assert.ok(riemann(n,'right')>1/3);near(riemann(n,'mid'),1/3-1/(12*n*n));}
 assert.ok(Math.abs(riemann(40,'mid')-1/3)<Math.abs(riemann(4,'mid')-1/3));
 const f=(x,y)=>x*x+2*y*y,h=1e-5;
 for(const deg of [0,45,90,180,270]){const a=deg*Math.PI/180,x=Math.cos(a),y=Math.sin(a);near(directional(deg),(f(1+h*x,1+h*y)-f(1-h*x,1-h*y))/(2*h),1e-8);}
 near(sectorArea(0,8),4*Math.PI);near(sectorArea(1,8),3*Math.PI);near(sectorArea(0,2),Math.PI);
});
test('independent integration and derivatives validate new numerical answers',()=>{
 const integrate=(f,a,b)=>{const n=20000,h=(b-a)/n;let sum=0;for(let i=0;i<n;i++)sum+=f(a+(i+.5)*h)*h;return sum;};
 near(integrate(x=>3*x*x,0,2),8,1e-7);near(integrate(x=>x*Math.exp(x),0,1),1,1e-8);near(integrate(x=>2*x/(1+x*x),0,1),Math.log(2),1e-8);
 near(integrate(x=>x*Math.sin(x)/Math.PI,-Math.PI,Math.PI),2,1e-8);near(integrate(x=>Math.cos(x)**2,-Math.PI,Math.PI),Math.PI,1e-8);
 const f=(x,y)=>x*x*y+3*y*y,h=1e-5;near((f(1+h,2)-f(1-h,2))/(2*h),4);near((f(1,2+h)-f(1,2-h))/(2*h),13);
 near((Math.sqrt(25-(3+h)**2)-Math.sqrt(25-(3-h)**2))/(2*h),-.75);
 assert.equal(TEST.length,30);
});
