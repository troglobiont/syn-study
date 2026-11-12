import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {CHAPTERS,QUESTIONS,PRACTICE,TEST,BY_ID,SEMINAR_QUESTIONS} from '../dist/content.js';
import {SEMINARS} from '../dist/seminar-content.js';
import {PROOFS,PROOF_BY_ID} from '../dist/proofs.js';
import {LEGACY_SOLUTIONS} from '../dist/legacy-solutions.js';
import {fresh,normalise,exportText,importText,event,status,record,submit,grade,reviewIds,orderedOptions,testResult,finishTest,startTest} from '../dist/core.js';
import {guideFor,guidePanel,topicPath,proofLinks,proofPage,matchingSeminars,seminarCards} from '../dist/reading-ui.js';
const correct=q=>Object.fromEntries(q.parts.map(p=>[p.id,p.type==='multi'?p.answer:p.type==='choice'?p.answer:p.type==='set'?p.answer.join(';'):String(p.answer)]));
function validRef(ref){const c=CHAPTERS.find(c=>c.id===ref.chapter);assert.ok(c,'Missing chapter '+ref.chapter);assert.ok(c.theory.some(t=>t.title===ref.topic),'Missing topic '+ref.chapter+': '+ref.topic);assert.match(topicPath(ref),/\/meaning\/topic-\d+$/);}
test('all 260 previously released questions and test scope retain identity, option order and exact keys',()=>{
 const old=JSON.parse(readFileSync(new URL('./fixtures/answers-1.3.0.json',import.meta.url),'utf8'));assert.equal(old.questions.length,260);
 for(const q of old.questions){assert.equal(BY_ID[q.id].chapter,q.chapter);assert.deepEqual(BY_ID[q.id].parts.map(({label,...part})=>part),q.parts,q.id);}
 assert.deepEqual(TEST.map(q=>q.id),old.testIds);
 const s=fresh();s.contentVersion='1.3.0';delete s.study;s.test.draft={index:129,seed:'v13',answers:{'t-130':{a:'0'}},hints:[]};
 const n=normalise(s);assert.deepEqual(n.test.draft.questionIds,old.testIds);assert.equal(n.test.draft.index,129);finishTest(n);assert.equal(testResult(n.test.runs[0]).length,130);startTest(n);assert.equal(n.test.draft.questionIds.length,130);
});
test('seminar catalogue covers four semesters with honest sources and edition-qualified assignment numbers',()=>{
 assert.ok(SEMINARS.length>=70);assert.equal(new Set(SEMINARS.map(s=>s.id)).size,SEMINARS.length);
 for(const semester of [1,2,3,4])assert.ok(SEMINARS.some(s=>s.semester===semester));
 for(const s of SEMINARS){assert.ok(CHAPTERS.some(c=>c.id===s.chapter));assert.ok(s.sourceLabel);assert.match(s.source,/^https?:\/\//);for(const r of s.references){assert.ok(r.book&&r.edition&&r.numbers);}}
 assert.ok(SEMINARS.some(s=>s.references.some(r=>r.numbers.includes('15–21'))));
});
test('52 original seminar exercises have complete reasoned solutions, analogous examples and exact theory links',()=>{
 assert.equal(SEMINAR_QUESTIONS.length,52);assert.equal(new Set(SEMINAR_QUESTIONS.map(q=>q.id)).size,52);
 for(const c of CHAPTERS)assert.equal(SEMINAR_QUESTIONS.filter(q=>q.chapter===c.id).length,2,c.id);
 for(const q of SEMINAR_QUESTIONS){assert.ok(SEMINARS.some(s=>s.id===q.seminarId),q.id);assert.ok(q.solution.strategy&&q.solution.result);assert.ok(q.solution.steps.length>=4,q.id);assert.ok(q.analogous.statement&&q.analogous.result);assert.ok(q.analogous.steps.length>=3,q.id);for(const step of [...q.solution.steps,...q.analogous.steps])assert.ok(step.claim&&step.reason,q.id);for(const ref of q.prerequisites)validRef(ref);assert.equal(grade(q,correct(q)).correct,true,q.id);assert.equal(grade(q,{}).valid,false,q.id);for(const part of q.parts.filter(p=>p.options))assert.ok(orderedOptions(q,part).length>0,q.id);}
});
test('legacy practice has concrete expanded solutions rather than a generic answer wrapper',()=>{
 for(const q of QUESTIONS){const g=LEGACY_SOLUTIONS[q.id];assert.ok(g,q.id);assert.ok(g.strategy&&g.result);assert.ok(g.steps.length>=2,q.id);for(const s of g.steps)assert.ok(s.claim.length>3&&s.reason.length>8,q.id);for(const ref of g.prerequisites)validRef(ref);}
});
test('each proof is attached once and follows the theory and proofs it requires',()=>{
 assert.equal(PROOFS.length,110);
 assert.equal(new Set(PROOFS.map(p=>p.id)).size,PROOFS.length);
 const orderedTopics=CHAPTERS.flatMap(c=>c.theory.map(t=>({chapter:c.id,topic:t.title})));
 const position=ref=>orderedTopics.findIndex(t=>t.chapter===ref.chapter&&t.topic===ref.topic);
 const placement=p=>position({chapter:p.chapter,topic:p.theoryTopic});
 const links=CHAPTERS.flatMap(c=>c.theory.flatMap(t=>[...proofLinks(c,t.title).matchAll(/href="#proof\/([^"]+)"/g)].map(m=>m[1])));
 assert.deepEqual(links.sort(),PROOFS.map(p=>p.id).sort());
 for(const c of CHAPTERS){
  assert.ok(PROOFS.some(p=>p.chapter===c.id),c.id);
  assert.equal(new Set(c.theory.map(t=>t.anchor)).size,c.theory.length,c.id);
 }
 for(const [index,p] of PROOFS.entries()){
  const home=placement(p);
  assert.ok(home>=0,p.id);
  assert.ok(p.statement&&p.conclusion&&p.assumptions.length&&p.steps.length>=4,p.id);
  assert.ok(p.prerequisites.length,p.id);
  for(const ref of p.prerequisites){
   validRef(ref);
   assert.ok(position(ref)<home,p.id+' needs '+ref.topic+' before its proof');
  }
  for(const s of p.steps){
   assert.ok(s.claim&&s.reason,p.id);
   for(const id of s.uses||[]){
    const dependency=PROOF_BY_ID[id];
    assert.ok(dependency,p.id+' references '+id);
    const earlier=placement(dependency);
    assert.ok(earlier<home||(earlier===home&&PROOFS.indexOf(dependency)<index),p.id+' comes before '+id);
   }
  }
 }
});
test('reordered theory keeps existing bookmarks and introduces definitions before use',()=>{
 const sequences=CHAPTERS.find(c=>c.id==='sequences').theory;
 const bw=sequences.find(t=>t.anchor==='topic-8');
 const cauchy=sequences.find(t=>t.anchor==='topic-7');
 assert.equal(bw.title,'Подпоследовательности и Больцано — Вейерштрасс');
 assert.equal(cauchy.title,'Фундаментальность и критерий Коши');
 assert.ok(sequences.indexOf(bw)<sequences.indexOf(cauchy));
 const derivatives=CHAPTERS.find(c=>c.id==='derivatives').theory;
 assert.equal(derivatives[1].title,'Символы o и O');
 assert.equal(topicPath({chapter:'derivatives',topic:derivatives[1].title}),'lesson/derivatives/meaning/topic-9');
 const three=CHAPTERS.find(c=>c.id==='three').theory;
 assert.equal(three[2].title,'Верхний и нижний интегралы Дарбу');
 assert.equal(three[3].title,'Критерий Дарбу и достаточные условия');
 assert.equal(three[3].anchor,'topic-2');
 assert.deepEqual(guideFor(BY_ID['s-sequences-1']).prerequisites,[{chapter:'sequences',topic:'Алгебра пределов и неравенства'}]);
});
test('reading a solution immediately records reading, never a fictitious correct attempt, and never blocks submission',()=>{
 const s=fresh(),q=SEMINAR_QUESTIONS[0];event(s,q.id,'reveal');event(s,q.id,'reveal');s.study.panels[q.id]={solution:true};
 assert.equal(status(s.records[q.id],q).solved,false);assert.equal(s.records[q.id].events.length,1);assert.match(guidePanel(q,s),/Решение по шагам/);assert.ok(!s.records[q.id].events.some(e=>e.kind==='submit'));
 s.study.panels[q.id].solution=false;assert.equal(status(s.records[q.id],q).revealed,true);submit(s,q.id,correct(q));assert.equal(status(s.records[q.id],q).solved,true);assert.equal(status(s.records[q.id],q).independent,false);
});
test('Cantor proof appears after its definitions and links back to the definitions independently',()=>{
 const chapter=CHAPTERS.find(c=>c.id==='one');
 const proof=PROOF_BY_ID['cantor-power'];
 const theoremIndex=chapter.theory.findIndex(t=>t.title===proof.theoryTopic);
 assert.ok(theoremIndex>=0);
 assert.deepEqual(proof.prerequisites.map(r=>r.topic),[
  'Определение функции','Мощность множества','Множество всех подмножеств'
 ]);
 for(const ref of proof.prerequisites){
  const index=chapter.theory.findIndex(t=>t.title===ref.topic);
  assert.ok(index>=0&&index<theoremIndex,ref.topic);
  assert.doesNotMatch(proofLinks(chapter,ref.topic),/#proof\/cantor-power/);
 }
 assert.match(proofLinks(chapter,proof.theoryTopic),/#proof\/cantor-power/);
 assert.match(proofPage(proof.id,fresh()),new RegExp('href="#lesson/one/meaning/topic-'+theoremIndex+'"'));
});
test('theory, example and solution panels are independent and exact links preserve the return question',()=>{
 const s=fresh(),q=SEMINAR_QUESTIONS[0];let html=guidePanel(q,s);assert.ok(!html.includes('solution-panel'));s.study.panels[q.id]={knowledge:true};html=guidePanel(q,s);assert.ok(html.includes('data-reading-return="'+q.id+'"'));assert.ok(!html.includes('solution-panel'));
 s.study.panels[q.id]={example:true};html=guidePanel(q,s);assert.ok(html.includes('Другой пример на тот же метод'));assert.ok(!html.includes('solution-panel'));
});
test('new drafts, read solutions, proof position and pins survive export/import and do not overwrite legacy scopes',()=>{
 const s=fresh(),q=SEMINAR_QUESTIONS[4];record(s,q.id).draft={a:'123'};record(s,q.id).pinned=true;event(s,q.id,'hint');s.study.panels[q.id]={knowledge:true,solution:true};s.study.returnTo=q.id;s.study.proofSteps['bolzano-weierstrass']=5;s.study.semester=3;s.study.query='Лебега';s.resume={page:'task',chapter:q.chapter,question:q.id};
 const n=importText(exportText(s));assert.deepEqual(n,normalise(s));assert.ok(reviewIds(n).includes(q.id));assert.equal(n.study.proofSteps['bolzano-weierstrass'],5);assert.equal(n.resume.question,q.id);assert.equal(n.records[q.id].draft.a,'123');
 assert.deepEqual(normalise({...s,contentVersion:'1.4.0'}),n);
 assert.deepEqual(normalise({...s,contentVersion:'1.4.1'}),n);
 assert.deepEqual(normalise({...s,contentVersion:'1.4.2'}),n);
});
test('untrusted study state is bounded and catalogue rendering escapes query text',()=>{
 const s=fresh();s.study={panels:{evil:{solution:true}},proofSteps:{evil:999,'bolzano-weierstrass':999999},semester:999,query:'<script>alert(1)</script>',returnTo:'__proto__'};const n=normalise(s);assert.equal(n.study.returnTo,null);assert.equal(n.study.panels.evil,undefined);assert.equal(n.study.proofSteps.evil,undefined);assert.equal(n.study.proofSteps['bolzano-weierstrass'],PROOF_BY_ID['bolzano-weierstrass'].steps.length);assert.ok(!seminarCards(n).includes('<script>'));
});
test('proof reader reveals a real prefix and exposes the full conclusion only after all steps',()=>{
 const s=fresh(),p=PROOF_BY_ID['bolzano-weierstrass'];let html=proofPage(p.id,s);assert.ok(html.includes('Открыто шагов: 1 из '+p.steps.length));assert.ok(!html.includes('class="solution-result"'));s.study.proofSteps[p.id]=p.steps.length;html=proofPage(p.id,s);assert.ok(html.includes('class="solution-result"'));assert.ok(html.includes('Свернуть до первого шага'));
});
test('independent limits, finite sums, derivatives, integrals and Gram calculations validate new exercises',()=>{
 const approx=(a,b,tol)=>assert.ok(Math.abs(a-b)<tol,`${a} vs ${b}`);
 // Rationalize before numerical evaluation to avoid loss of significance.
 approx(3/(Math.sqrt(1+3/1e7)+1),1.5,1e-6);assert.equal(grade(BY_ID['s-sequences-1'],{a:'3/2'}).correct,true);
 let sum=0;for(let n=1;n<=100000;n++)sum+=1/((3*n-1)*(3*n+2));approx(sum,1/6,2e-6);assert.equal(grade(BY_ID['s-numeric-1'],{a:'1/6'}).correct,true);
 const integrate=(f,a,b)=>{const n=20000,h=(b-a)/n;let s=0;for(let i=0;i<n;i++)s+=h*f(a+(i+.5)*h);return s;};
 approx(integrate(x=>x*(2-x),0,2),4/3,1e-8);assert.equal(grade(BY_ID['s-three-1'],{a:'4/3'}).correct,true);
 const h=1e-5;for(const x of [-2,0,1,3])approx((Math.log(1+2*(x+h)**2)-Math.log(1+2*(x-h)**2))/(2*h),4*x/(1+2*x*x),1e-8);
 // Gram determinant: (2,0,1) and (0,2,1) have squared lengths 5 and product 1.
 assert.equal(5*5-1*1,24);assert.equal(grade(BY_ID['s-surface-1'],{a:'24'}).correct,true);
 approx(integrate(x=>Math.exp(-2*Math.abs(x)),-20,20),1,1e-6);assert.equal(grade(BY_ID['s-fourier-2'],{a:'1'}).correct,true);
 const P=(x,y)=>x*x-y,Q=(x,y)=>x+y*y,x=.7,y=.3;
 approx((Q(x+h,y)-Q(x-h,y))/(2*h)-(P(x,y+h)-P(x,y-h))/(2*h),2,1e-9);assert.equal(grade(BY_ID['s-forms-1'],{a:'2'}).correct,true);
});
test('offline installation reloads the complete module graph rather than seeding new cache with stale HTTP assets',async()=>{
 const listeners={},requests=[];let installation,skipped=false;
 vm.runInNewContext(readFileSync(new URL('../dist/sw.js',import.meta.url),'utf8'),{
  self:{addEventListener:(name,fn)=>listeners[name]=fn,skipWaiting:()=>{skipped=true;}},
  caches:{open:async()=>({addAll:async rs=>requests.push(...rs)})},
  Request:class{constructor(url,options){this.url=url;this.cache=options.cache;}}
 });
 listeners.install({waitUntil:p=>installation=p});await installation;assert.equal(skipped,true);assert.ok(requests.every(r=>r.cache==='reload'));
 const precached=new Set(requests.map(r=>r.url));
 for(const request of requests.filter(r=>r.url.endsWith('.js'))){const source=readFileSync(new URL('../dist/'+request.url.slice(2),import.meta.url),'utf8');for(const [,path] of source.matchAll(/from ['"](.\/[^'"]+)['"]/g))assert.ok(precached.has(path),'Missing offline module '+path);}
});
