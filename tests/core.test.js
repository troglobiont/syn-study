import test from 'node:test';
import assert from 'node:assert/strict';
import {VERSION,PRACTICE,TEST,QUESTIONS,BY_ID} from '../dist/content.js';
import {fresh,parseNumber,parseSet,grade,submit,event,status,stats,record,normalise,exportText,importText,Store,MAIN_KEY,SANDBOX_KEY,MODE_KEY,startTest,finishTest,testResult,orderedOptions,reviewIds} from '../dist/core.js';
const correct=q=>Object.fromEntries(q.parts.map(p=>[p.id,p.type==='multi'?[...p.answer]:p.type==='choice'?p.answer:p.type==='set'?'{'+p.answer.join(',')+'}':p.rule==='notEqual'?'0':String(p.answer)]));
class Memory {constructor(){this.data=new Map();this.fail=null;}getItem(k){return this.data.get(k)??null;}setItem(k,v){if(this.fail===k||this.fail==='all')throw Error('quota');this.data.set(k,String(v));}removeItem(k){this.data.delete(k);}}

test('150 questions have exact checked expected answers; every distractor is rejected',()=>{
 assert.equal(PRACTICE.length,75);assert.equal(TEST.length,75);assert.equal(new Set(QUESTIONS.map(q=>q.id)).size,150);
 for(const q of QUESTIONS){
  assert.ok(grade(q,correct(q)).correct,q.id);
  for(const p of q.parts){
   if(p.type==='choice')for(const option of p.options)assert.equal(grade(q,{...correct(q),[p.id]:option.id}).correct,option.id===p.answer,q.id+' option '+option.id);
   if(p.type==='multi')for(const o of p.options){const answer=correct(q),v=answer[p.id];answer[p.id]=v.includes(o.id)?v.filter(x=>x!==o.id):[...v,o.id];assert.equal(grade(q,answer).correct,false,q.id);}
  }
  assert.equal(grade(q,{}).valid,false,q.id);
 }
});
test('independently calculated originals and new transfer examples',()=>{
 assert.equal(2*(-2)-3,-7);
 assert.equal(grade(BY_ID['l1-3'],{a:'−7,0',b:'0'}).correct,true);
 assert.equal(grade(BY_ID['l1-5'],{a:'0',b:'0/4'}).correct,true);
 assert.equal(grade(BY_ID['l1-5'],{a:'0',b:'1'}).correct,false);
 assert.equal(grade(BY_ID['l2-5'],{a:'{3; 0; −1; 2; 3}',b:'0'}).correct,true);
 assert.equal(grade(BY_ID['t-8'],{a:'3, -3'}).correct,true);
 assert.equal(grade(BY_ID['t-8'],{a:'3'}).correct,false);
 // Enumerate finite relations independently; missing is different from ambiguous.
 const A=[-1,0,1],r=[[-1,1],[0,0],[1,1]],s=[...r,[0,2]],t=r.slice(0,2);
 const isFunction=rel=>A.every(x=>rel.filter(([a])=>a===x).length===1);
 assert.deepEqual([r,s,t].map(isFunction),[true,false,false]);
 const pre=[];for(let x=-10;x<=10;x++)if([1,4].includes((x-1)**2))pre.push(x);
 assert.deepEqual(pre,[-1,0,2,3]);
 assert.deepEqual([-3,3].map(x=>x*x),[9,9]);
 for(let x=1;x<=3;x+=.25)assert.equal(1+Math.sqrt((x-1)**2),x);
 for(let y=0;y<=4;y++)assert.ok(Math.abs((1+Math.sqrt(y)-1)**2-y)<1e-12);
 for(const x of [-10,-1.1,0,4,4.1]){
  const allowed=x<=4&&x!==-1;
  assert.equal(Number.isFinite(Math.sqrt(4-x)/(x+1)),allowed);
 }
});
test('input parsers accept equivalent supported forms and reject partial strings',()=>{
 for(const v of ['-7','−7',' -7,0 ','-14/2'])assert.equal(parseNumber(v),-7);
 for(const v of ['', ' ', '12oops','Infinity','0/0','1/0','1e3','<script>','3.2.1'])assert.equal(parseNumber(v),null,v);
 assert.deepEqual(parseSet('{ 3;−1;0;2 }'),[-1,0,2,3]);
 assert.deepEqual(parseSet('∅'),[]);assert.deepEqual(parseSet('{}'),[]);
 for(const s of ['{1,2','1,','{1,,2}','[1,2]','{1,a}','{NaN}',''])assert.equal(parseSet(s),null,s);
});
test('first attempt cannot be rewritten by correction, hint or reveal',()=>{
 const s=fresh(),q=BY_ID['l1-3'];
 submit(s,q.id,{a:'0',b:'0'});submit(s,q.id,correct(q));
 let st=status(s.records[q.id],q);assert.equal(st.first.correct,false);assert.equal(st.label,'Исправлено');assert.equal(st.independent,false);
 const a=fresh();event(a,q.id,'hint');submit(a,q.id,correct(q));assert.equal(stats(a).independent,0);assert.equal(status(a.records[q.id],q).label,'С помощью');
 const b=fresh();event(b,q.id,'reveal');assert.equal(stats(b).solved,0);submit(b,q.id,correct(q));assert.equal(stats(b).independent,0);assert.equal(stats(b).assisted,1);
});
test('empty, malformed and repeated submissions do not create attempts or duplicate progress',()=>{
 const s=fresh(),q=BY_ID['l1-3'];
 submit(s,q.id,{});assert.equal(s.records[q.id],undefined);
 submit(s,q.id,{a:'-7x',b:'0'});assert.equal(s.records[q.id],undefined);
 submit(s,q.id,correct(q));submit(s,q.id,correct(q));
 assert.equal(s.records[q.id].events.length,1);assert.equal(stats(s).solved,1);assert.equal(stats(s).independent,1);
 event(s,q.id,'hint');event(s,q.id,'hint');assert.equal(s.records[q.id].events.filter(e=>e.kind==='hint').length,1);
});
test('review retains difficult attempts and deliberate pins, not decorative achievements',()=>{
 const s=fresh(),q=BY_ID['l1-2'];s.chapters.one.collected=true;assert.deepEqual(reviewIds(s),[]);
 event(s,q.id,'skip');assert.ok(reviewIds(s).includes(q.id));
 submit(s,q.id,correct(q));assert.ok(!reviewIds(s).includes(q.id));
 record(s,q.id).pinned=true;assert.ok(reviewIds(s).includes(q.id));
});
test('export/import round trip preserves drafts, first attempt, assistance, lab and test state',()=>{
 const s=fresh();event(s,'l2-5','hint');submit(s,'l2-5',correct(BY_ID['l2-5']));s.labs.preset='branch';s.labs.input=2.25;
 s.chapters.one.stage='lab';s.chapters.one.collected=true;startTest(s);s.test.draft.answers['t-8']={a:'{-3,3}'};
 assert.deepEqual(importText(exportText(s)),normalise(s));
});
test('1.0.0 saved progress and exports upgrade without losing attempts, help, drafts or sandbox isolation',()=>{
 const legacy=fresh();legacy.contentVersion='1.0.0';
 submit(legacy,'l1-3',{a:'0',b:'0'});submit(legacy,'l1-3',correct(BY_ID['l1-3']));
 event(legacy,'l2-5','hint');submit(legacy,'l2-5',correct(BY_ID['l2-5']));
 legacy.chapters.one.collected=true;legacy.chapters.two.stage='lab';legacy.labs.preset='branch';
 startTest(legacy);legacy.test.draft.answers['t-8']={a:'{-3,3}'};finishTest(legacy);
 startTest(legacy);legacy.test.draft.answers['t-1']={a:['0']};
 const before=stats(legacy),text=JSON.stringify(legacy),m=new Memory();m.setItem(MAIN_KEY,text);
 const store=new Store(m);assert.equal(store.blocked,false);assert.equal(store.state.contentVersion,VERSION);
 assert.deepEqual(stats(store.state),before);assert.equal(store.state.records['l1-3'].events[0].answer.a,'0');
 assert.deepEqual(store.state.test,legacy.test);assert.equal(store.state.chapters.one.collected,true);
 assert.equal(store.state.labs.preset,'branch');
 assert.deepEqual(importText(JSON.stringify({application:'SYN Study',exportVersion:1,state:legacy})),store.state);
 store.save();assert.equal(JSON.parse(m.getItem(MAIN_KEY)).contentVersion,VERSION);
 const upgraded=m.getItem(MAIN_KEY);store.begin();store.end();assert.equal(m.getItem(MAIN_KEY),upgraded);
 assert.throws(()=>normalise({...legacy,contentVersion:'0.9.0'}));
});
test('unknown fields and injected IDs are removed; grades are recomputed',()=>{
 const s=fresh();s.evil='<script>';s.records['__proto__']={solved:true};s.records['not-a-question']={solved:true};
 s.records['l1-2']={solved:true,independent:true,events:[{kind:'submit',answer:{a:'1'},correct:true}],draft:{a:'1'},pinned:false};
 const n=normalise(s);assert.equal(n.evil,undefined);assert.equal(Object.hasOwn(n.records,'not-a-question'),false);
 assert.equal(status(n.records['l1-2'],BY_ID['l1-2']).solved,false);assert.equal(stats(n).independent,0);
 assert.throws(()=>importText('broken'));assert.throws(()=>importText('{}'));assert.throws(()=>normalise({...s,schemaVersion:99}));
});
test('sandbox persists across reload and returning leaves the main bytes unchanged',()=>{
 const m=new Memory(),a=new Store(m);submit(a.state,'l1-2',correct(BY_ID['l1-2']));a.save();const main=m.getItem(MAIN_KEY);
 a.begin();assert.equal(a.sandbox,true);assert.equal(stats(a.state).solved,0);
 submit(a.state,'l2-5',correct(BY_ID['l2-5']));a.save();
 const reload=new Store(m);assert.equal(reload.sandbox,true);assert.equal(stats(reload.state).solved,1);
 reload.end();assert.equal(m.getItem(MAIN_KEY),main);assert.equal(stats(reload.state).solved,1);assert.equal(reload.state.records['l2-5'],undefined);
});
test('reset/import replacements have reversible backups, including sandbox isolation',()=>{
 const m=new Memory(),a=new Store(m);submit(a.state,'l1-2',correct(BY_ID['l1-2']));a.save();const old=m.getItem(MAIN_KEY);
 a.replace(fresh());assert.equal(stats(a.state).solved,0);a.undo();assert.equal(stats(a.state).solved,1);assert.equal(m.getItem(MAIN_KEY),old);
 a.begin();a.replace(fresh());a.end();assert.equal(m.getItem(MAIN_KEY),old);
});
test('corrupt save starts safely and cannot overwrite the original until explicit replacement',()=>{
 const m=new Memory();m.setItem(MAIN_KEY,'{broken');const a=new Store(m);
 assert.equal(a.blocked,true);assert.equal(stats(a.state).solved,0);assert.throws(()=>a.save());assert.equal(m.getItem(MAIN_KEY),'{broken');
 a.replace(fresh());assert.equal(m.getItem(MAIN_KEY+':undo'),'{broken');assert.equal(a.blocked,false);assert.throws(()=>a.undo());
});
test('failed writes and backup quota failure do not destroy saved main',()=>{
 const m=new Memory(),a=new Store(m);a.save();const old=m.getItem(MAIN_KEY);
 m.fail=MAIN_KEY;submit(a.state,'l1-2',correct(BY_ID['l1-2']));assert.throws(()=>a.save());assert.equal(m.getItem(MAIN_KEY),old);
 m.fail=MAIN_KEY+':undo';assert.throws(()=>a.replace(fresh()));assert.equal(m.getItem(MAIN_KEY),old);
});
test('another tab cannot silently overwrite progress or write in a changed mode',()=>{
 const m=new Memory(),a=new Store(m),b=new Store(m);a.save();assert.throws(()=>b.save(),/другой вкладке/);
 const c=new Store(m);a.begin();assert.throws(()=>c.save(),/Режим изменён/);
 assert.throws(()=>c.replace(fresh()),/Режим изменён/);
 assert.throws(()=>c.undo(),/другой вкладке/);
});
test('final test grades only on finish, supports incomplete and assisted results, finish is idempotent',()=>{
 const s=fresh();startTest(s);const seed=s.test.draft.seed;startTest(s);assert.equal(s.test.draft.seed,seed);
 for(const q of TEST)s.test.draft.answers[q.id]=correct(q);
 s.test.draft.hints.push('t-2');assert.equal(s.test.runs.length,0);assert.equal(finishTest(s),true);assert.equal(finishTest(s),false);
 const results=testResult(s.test.runs[0]);assert.equal(results.filter(x=>x.correct).length,75);assert.equal(results.filter(x=>x.independent).length,74);
 assert.equal(testResult(null).filter(x=>x.correct).length,0);
});
test('stable option ordering preserves IDs and cannot give a perfect score to the first-position strategy',()=>{
 for(const seed of ['alpha','beta','gamma','reload-seed','0','1','2','attempt-24']){
  const raw=fresh();startTest(raw);raw.test.draft.seed=seed;
  const reloaded=normalise(raw);
  const strategy={};
  for(const q of TEST){
   strategy[q.id]={};
   for(const p of q.parts){
    if(!p.options){strategy[q.id][p.id]='0';continue;}
    const ordered=orderedOptions(q,p,seed);
    assert.deepEqual(ordered,orderedOptions(q,p,reloaded.test.draft.seed));
    assert.deepEqual([...ordered.map(o=>o.id)].sort(),[...p.options.map(o=>o.id)].sort());
    strategy[q.id][p.id]=p.type==='multi'?[ordered[0].id]:ordered[0].id;
    assert.equal(grade(q,correct(q)).correct,true);
   }
  }
  assert.ok(testResult({answers:strategy,hints:[]}).filter(x=>x.correct).length<TEST.length);
  const positions=TEST.filter(q=>q.parts[0].type==='choice').map(q=>orderedOptions(q,q.parts[0],seed).findIndex(o=>o.id===q.parts[0].answer));
  assert.ok(new Set(positions).size>1);
 }
});
