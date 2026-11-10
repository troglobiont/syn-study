import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CHAPTERS,TEST,BY_ID} from '../dist/content.js';
import {fresh,normalise,startTest,finishTest,testResult,exportText,importText,submit,stats} from '../dist/core.js';
import {normaliseYearTwo,yearTwoOutput,heat,tailBound} from '../dist/year-two-models.js';
const near=(a,b,tol=1e-7)=>assert.ok(Math.abs(a-b)<tol,`${a} versus ${b}`);
const integral=(f,a,b,n=20000)=>{let s=0,h=(b-a)/n;for(let k=0;k<n;k++)s+=h*f(a+(k+.5)*h);return s;};
test('all 150 previously released question identities, options, answers and permutations are preserved',()=>{
 const old=JSON.parse(readFileSync(new URL('./fixtures/answers-1.2.0.json',import.meta.url),'utf8'));
 assert.equal(old.questions.length,150);for(const q of old.questions){assert.equal(BY_ID[q.id].chapter,q.chapter);assert.deepEqual(BY_ID[q.id].parts.map(({label,...p})=>p),q.parts,q.id);}
});
test('1.2.0 practice and 75-question drafts/results survive with and without explicit scope metadata',()=>{
 const ids=JSON.parse(readFileSync(new URL('./fixtures/answers-1.2.0.json',import.meta.url),'utf8')).testIds;
 for(const explicit of [false,true]){
  const old=fresh();old.contentVersion='1.2.0';submit(old,'l1-2',{a:'0'});old.chapters.five.stage='lab';old.chapters.six.collected=true;
  old.test={draft:{seed:'v12',index:74,answers:{'t-30':{a:'1'}},hints:[]},runs:[]};if(explicit)old.test.draft.questionIds=ids;
  const s=normalise(old);assert.equal(stats(s).independent,1);assert.equal(s.chapters.six.collected,true);assert.deepEqual(s.test.draft.questionIds,ids);assert.equal(s.test.draft.index,74);
  finishTest(s);assert.equal(testResult(s.test.runs[0]).length,75);const again=importText(exportText(s));assert.deepEqual(again,s);startTest(again);assert.equal(again.test.draft.questionIds.length,130);
 }
 assert.equal(CHAPTERS.length,26);assert.equal(TEST.length,130);
});
test('model state is bounded, whitelisted, round trips and changes mathematical conclusions',()=>{
 const s=fresh();s.yearTwo={a:0,n:40,mode:'spike',domain:'open',R:20,a0:.25,time:2,evil:'bad'};
 assert.deepEqual(importText(exportText(s)).yearTwo,normaliseYearTwo(s.yearTwo));assert.equal(normaliseYearTwo({n:Infinity,a:-99}).a,-2);
 assert.ok(yearTwoOutput('lebesgue',s.yearTwo).includes('интеграл постоянно равен 1'));
 assert.ok(yearTwoOutput('uniformintegrals',s.yearTwo).includes('sup хвоста = +∞'));
 assert.ok(yearTwoOutput('higher',s.yearTwo).includes('не инъективно'));
});
test('independent quadrature validates beta/gamma, Fubini counterexample and Gaussian transform convention',()=>{
 near(integral(t=>t*(1-t)**2,0,1),1/12);near(integral(t=>t**3*Math.exp(-t),0,40),6,1e-6);
 near(integral(x=>1/(1+x*x),0,1),Math.PI/4);near(integral(y=>-1/(1+y*y),0,1),-Math.PI/4);
 for(const xi of [0,.5,2])near(integral(x=>Math.exp(-x*x)*Math.cos(x*xi),-10,10),Math.sqrt(Math.PI)*Math.exp(-xi*xi/4));
});
test('tail supremum formula, heat mass and heat equation agree with independent calculations',()=>{
 for(const a0 of [.25,1,2])for(const R of [0,3,20]){near(tailBound(a0,R),integral(x=>Math.exp(-a0*x),R,R+120,100000),1e-6);for(const a of [a0,a0+.2,3])assert.ok(Math.exp(-a*R)/a<=tailBound(a0,R)+1e-12);}
 for(const t of [.1,.5,2]){near(integral(x=>heat(x,t),-20,20),1);const h=1e-4,x=.6;near((heat(x,t+h)-heat(x,t-h))/(2*h),(heat(x+h,t)-2*heat(x,t)+heat(x-h,t))/(h*h),1e-5);}
});
test('Gram determinant, wedge antisymmetry and concentration examples have the stated values',()=>{
 const u=[1,0,1],v=[0,1,1],dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);assert.equal(dot(u,u)*dot(v,v)-dot(u,v)**2,3);
 const wedge=(a,b)=>a[0]*b[1]-a[1]*b[0];assert.equal(wedge([0,1],[1,0]),-1);assert.equal(wedge([1,0],[1,0]),0);
 for(const n of [1,5,100]){near(integral(()=>n,0,1/n),1);near(integral(()=>1,0,1/n),1/n);}
});
