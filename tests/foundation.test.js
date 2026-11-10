import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CHAPTERS,PRACTICE,TEST,BY_ID,VERSION} from '../dist/content.js';
import {SYLLABUS} from '../dist/syllabus.js';
import {fresh,normalise,exportText,importText,startTest,finishTest,testResult,grade} from '../dist/core.js';
import {normaliseFoundation,foundationOutput} from '../dist/foundation-models.js';
test('all eleven syllabus sections occur in order, with two explicitly separate extensions',()=>{
 assert.deepEqual(SYLLABUS.map(s=>s.id),['I','II','III','IV','V','VI','VII','VIII','IX','X','XI']);
 assert.deepEqual(CHAPTERS.filter(c=>c.program).map(c=>c.id),SYLLABUS.flatMap(s=>s.chapters));
 assert.deepEqual(CHAPTERS.filter(c=>!c.program).map(c=>c.id),['five','six']);
 assert.equal(CHAPTERS.filter(c=>c.semester===1).length,6);assert.equal(CHAPTERS.filter(c=>c.semester===2).length,7);
 for(const c of CHAPTERS)assert.equal(PRACTICE.filter(q=>q.chapter===c.id).length,5);
 const ranks=TEST.map(q=>CHAPTERS.findIndex(c=>c.id===q.chapter));assert.deepEqual(ranks,[...ranks].sort((a,b)=>a-b));
});
test('all sixty legacy question identities, options and answer keys survive the reordered course',()=>{
 const legacy=JSON.parse(readFileSync(new URL('./fixtures/answers-1.1.0.json',import.meta.url),'utf8'));
 assert.equal(legacy.length,60);for(const q of legacy){const current=BY_ID[q.id];assert.equal(current.chapter,q.chapter);assert.deepEqual(current.parts.map(({label,...p})=>p),q.parts,q.id);}
});
test('1.1.0 history and drafts retain thirty IDs even when old scope metadata is missing',()=>{
 const old=fresh();old.contentVersion='1.1.0';old.chapters={one:old.chapters.one,two:old.chapters.two,three:old.chapters.three,four:old.chapters.four,five:old.chapters.five,six:old.chapters.six};
 old.test={draft:{seed:'old30',index:29,answers:{'t-30':{a:'1'}},hints:[]},runs:[{seed:'complete30',answers:{'t-30':{a:'1'}},hints:[],completedAt:''}]};
 const n=normalise(old);assert.equal(n.contentVersion,VERSION);assert.equal(Object.keys(n.chapters).length,15);
 assert.deepEqual(n.test.draft.questionIds,Array.from({length:30},(_,i)=>'t-'+(i+1)));assert.equal(n.test.draft.index,29);
 assert.equal(testResult(n.test.runs[0]).length,30);finishTest(n);assert.equal(testResult(n.test.runs.at(-1)).length,30);
 const again=importText(exportText(n));assert.deepEqual(again,n);startTest(again);assert.equal(again.test.draft.questionIds.length,75);
});
test('epsilon-N and epsilon-delta choices satisfy strict inequalities including threshold failures',()=>{
 for(const eps of [.5,.2,.1,.05,.01]){const N=Math.floor(Number((1/eps).toFixed(8)));for(let n=N+1;n<N+100;n++)assert.ok(1/n<eps);assert.ok(1/N>=eps);}
 for(const eps of [.2,.3,1]){const delta=eps/3;for(const ratio of [.1,.5,.99]){const h=delta*ratio;assert.ok(3*Math.abs(h)<eps);}assert.ok(!(3*delta<eps));}
 assert.equal(grade(BY_ID['l8-2'],{a:'100'}).correct,true);assert.equal(grade(BY_ID['l8-2'],{a:'99'}).correct,false);
 assert.equal(grade(BY_ID['t-41'],{a:'0.1'}).correct,true);
});
test('foundation model parameters round trip, reject invalid fields, and distinguish a point from punctured neighbourhood',()=>{
 const state=fresh();state.foundation={n:150,eps:.01,offset:0,step:.02,evil:'x'};const n=importText(exportText(state));assert.deepEqual(n.foundation,normaliseFoundation(state.foundation));assert.equal(n.foundation.evil,undefined);
 assert.ok(foundationOutput('limits',n.foundation).includes('сама точка a исключена'));
 assert.ok(foundationOutput('real',n.foundation).includes('максимума нет'));
 assert.equal(normaliseFoundation({n:Infinity,eps:-1}).n,20);
});
test('independent calculations validate selected new answers and counterexamples',()=>{
 const h=1e-5,derivative=(f,x)=>(f(x+h)-f(x-h))/(2*h);
 assert.ok(Math.abs(derivative(x=>(x*x+1)**3,1)-24)<1e-6);
 assert.ok(Math.abs(derivative(x=>x**3,2)-12)<1e-7);
 assert.ok(Math.abs(derivative(x=>Math.log(1+x*x),2)-4/5)<1e-8);
 let sum=0;for(let n=2;n<=100000;n++)sum+=1/(n*(n+1));assert.ok(Math.abs(sum-.5)<.000011);
 const norm=(x,y)=>Math.hypot(2*x,-3*y);assert.equal(norm(0,1),3);for(let k=0;k<360;k++){const a=k*Math.PI/180;assert.ok(norm(Math.cos(a),Math.sin(a))<=3+1e-12);}
 const n=1000;assert.ok(Math.abs(((n+1/n)**2-n*n)-2)<.00001);
});
