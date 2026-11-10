import {VERSION,BY_ID,PRACTICE,TEST,QUESTIONS} from './content.js';
export const MAIN_KEY='syn-study:progress:v1';
export const SANDBOX_KEY='syn-study:sandbox:v1';
export const MODE_KEY='syn-study:mode:v1';
const clone = x=>JSON.parse(JSON.stringify(x));
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const obj=x=>!!x && typeof x==='object' && !Array.isArray(x);
const stages=['meaning','lab','practice','insight'];
const pages=['home','lesson','test','results','review','data'];
const error = message=>{throw new Error(message);};
export function fresh(){
 return {schemaVersion:1,contentVersion:VERSION,records:{},chapters:{one:{stage:'meaning',index:0,visited:[],collected:false},two:{stage:'meaning',index:0,visited:[],collected:false}},labs:{relation:'valid',relationInput:0,preset:'wide',input:1,checked:false},test:{draft:null,runs:[]},prefs:{reduceMotion:false},resume:{page:'home',chapter:'one'}};
}
export function parseNumber(raw){
 if(typeof raw!=='string'||raw.length>80)return null;
 const s=raw.trim().replace(/[−–]/g,'-').replace(/,/g,'.');
 if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:\s*\/\s*[+-]?(?:\d+(?:\.\d*)?|\.\d+))?$/.test(s))return null;
 const parts=s.split('/').map(Number);
 const n=parts.length===1?parts[0]:parts[0]/parts[1];
 return Number.isFinite(n)&&Math.abs(n)<=1e12?n:null;
}
export function parseSet(raw){
 if(typeof raw!=='string'||raw.length>300)return null;
 let s=raw.trim().replace(/[−–]/g,'-');
 if(s==='∅'||s==='{}'||s==='{ }')return [];
 if(s.startsWith('{')&&s.endsWith('}'))s=s.slice(1,-1).trim();
 else if(/[{}]/.test(s))return null;
 if(!s)return null;
 const tokens=s.split(/[;,]/).map(x=>x.trim());
 if(tokens.length>30||tokens.some(x=>!x))return null;
 const nums=tokens.map(parseNumber);
 if(nums.some(n=>n===null))return null;
 return [...new Set(nums)].sort((a,b)=>a-b);
}
function cleanAnswer(q,raw={}){
 const a={};if(!obj(raw))return a;
 for(const p of q.parts){
  const v=raw[p.id];
  if(p.type==='multi'){if(Array.isArray(v))a[p.id]=v.filter(x=>typeof x==='string').slice(0,20).map(x=>x.slice(0,80));}
  else if(typeof v==='string')a[p.id]=v.slice(0,400);
 }
 return a;
}
export function grade(q,raw){
 const answer=cleanAnswer(q,raw),parts=[];
 for(const p of q.parts){
  const value=answer[p.id];
  if(value===undefined||value===''||(Array.isArray(value)&&!value.length)){parts.push({valid:false,correct:false,empty:true});continue;}
  if(p.type==='choice'){
   const valid=p.options.some(x=>x.id===value);parts.push({valid,correct:valid&&value===p.answer,empty:false});
  }else if(p.type==='multi'){
   const valid=Array.isArray(value)&&value.every(id=>p.options.some(x=>x.id===id));
   const v=[...new Set(value)].sort();const expected=[...p.answer].sort();
   parts.push({valid,correct:valid&&JSON.stringify(v)===JSON.stringify(expected),empty:false});
  }else if(p.type==='number'){
   const n=parseNumber(value);parts.push({valid:n!==null,correct:n!==null&&(p.rule==='notEqual'?n!==p.answer:n===p.answer),empty:false});
  }else{
   const n=parseSet(value);parts.push({valid:n!==null,correct:n!==null&&JSON.stringify(n)===JSON.stringify([...p.answer].sort((a,b)=>a-b)),empty:false});
  }
 }
 return {valid:parts.every(x=>x.valid),correct:parts.every(x=>x.valid&&x.correct),empty:parts.some(x=>x.empty),parts,answer};
}
// Stable within an attempt and across reloads. Identity never depends on position.
export function orderedOptions(q,part,seed='practice'){
 if(!part.options)return [];
 let hash=2166136261;
 for(const ch of seed)hash=Math.imul(hash^ch.charCodeAt(0),16777619)>>>0;
 const index=QUESTIONS.findIndex(x=>x.id===q.id);
 const shift=(hash+index+q.parts.indexOf(part))%part.options.length;
 const base=[...part.options];
 return base.slice(shift).concat(base.slice(0,shift));
}
export function record(state,id){
 if(!own(BY_ID,id))error('Неизвестное задание.');
 if(!state.records[id])state.records[id]={draft:{},events:[],pinned:false};
 return state.records[id];
}
export function status(rec,q){
 const r=rec||{events:[]};let helped=false,first=null,last=null,revealed=false,skipped=false;
 for(const ev of r.events){
  if(ev.kind==='hint')helped=true;
  if(ev.kind==='reveal'){helped=true;revealed=true;}
  if(ev.kind==='skip')skipped=true;
  if(ev.kind==='submit'){
   const result={...grade(q,ev.answer),assisted:helped};
   if(!first)first=result;last=result;
  }
 }
 const solved=!!last?.correct;
 const independent=!!first?.correct&&!first.assisted;
 const label=solved?(independent?'С первой попытки':last.assisted?'С помощью':'Исправлено'):revealed?'Ответ просмотрен':last?'Есть ошибка':skipped?'Отложено':'Ещё не решено';
 return {first,last,helped,revealed,skipped,solved,independent,label,pinned:!!r.pinned};
}
export function submit(state,id,answer){
 const q=BY_ID[id],g=grade(q,answer);
 if(!g.valid)return {...g,changed:false};
 const r=record(state,id);r.draft=g.answer;
 const last=r.events.at(-1);
 if(last?.kind==='submit'&&JSON.stringify(last.answer)===JSON.stringify(g.answer))return {...g,changed:false};
 if(r.events.length>=128)error('Достигнут предел истории этой задачи. Экспортируйте данные перед новым циклом.');
 r.events.push({kind:'submit',answer:g.answer});
 return {...g,changed:true};
}
export function event(state,id,kind){
 if(!['hint','reveal','skip'].includes(kind))error('Неизвестное действие.');
 const r=record(state,id);
 if(r.events.some(e=>e.kind===kind))return false;
 if(r.events.length>=128)error('История задания заполнена.');
 r.events.push({kind});return true;
}
function normalRecord(q,raw){
 if(!obj(raw))return {draft:{},events:[],pinned:false};
 const events=[];
 for(const e of (Array.isArray(raw.events)?raw.events:[]).slice(0,128)){
  if(!obj(e))continue;
  if(['hint','reveal','skip'].includes(e.kind))events.push({kind:e.kind});
  if(e.kind==='submit'){
   const g=grade(q,e.answer);if(g.valid)events.push({kind:'submit',answer:g.answer});
  }
 }
 return {draft:cleanAnswer(q,raw.draft),events,pinned:raw.pinned===true};
}
const int=(x,min,max,fallback=0)=>Number.isInteger(x)?Math.max(min,Math.min(max,x)):fallback;
function testAnswers(raw){
 const answers={};if(!obj(raw))return answers;
 for(const q of TEST)if(own(raw,q.id))answers[q.id]=cleanAnswer(q,raw[q.id]);
 return answers;
}
export function normalise(raw){
 // 1.0.1 revises wording only: question, part and option IDs and answer keys are unchanged.
 if(!obj(raw)||raw.schemaVersion!==1||!['1.0.0',VERSION].includes(raw.contentVersion)||!obj(raw.records)||!obj(raw.chapters)||!obj(raw.test))error('Файл не соответствует поддерживаемой версии SYN Study. Исходные данные не изменены.');
 const s=fresh();
 for(const q of QUESTIONS)if(own(raw.records,q.id))s.records[q.id]=normalRecord(q,raw.records[q.id]);
 for(const id of ['one','two']){
  const c=raw.chapters[id];if(!obj(c))continue;
  s.chapters[id]={stage:stages.includes(c.stage)?c.stage:'meaning',index:int(c.index,0,4),visited:Array.isArray(c.visited)?[...new Set(c.visited.filter(x=>stages.includes(x)))]:[],collected:c.collected===true};
 }
 const d=raw.test.draft;
 if(obj(d))s.test.draft={seed:typeof d.seed==='string'?d.seed.slice(0,80):'legacy',answers:testAnswers(d.answers),hints:Array.isArray(d.hints)?[...new Set(d.hints.filter(id=>TEST.some(q=>q.id===id)))]:[],index:int(d.index,0,9)};
 for(const run of (Array.isArray(raw.test.runs)?raw.test.runs:[]).slice(-20)){
  if(!obj(run)||!obj(run.answers))continue;
  const answers=testAnswers(run.answers);
  const hints=Array.isArray(run.hints)?run.hints.filter(id=>TEST.some(q=>q.id===id)):[];
  s.test.runs.push({seed:typeof run.seed==='string'?run.seed.slice(0,80):'legacy',answers,hints:[...new Set(hints)],completedAt:typeof run.completedAt==='string'?run.completedAt.slice(0,40):''});
 }
 s.prefs.reduceMotion=raw.prefs?.reduceMotion===true;
 if(obj(raw.labs)){
  s.labs={relation:['valid','ambiguous','partial'].includes(raw.labs.relation)?raw.labs.relation:'valid',relationInput:int(raw.labs.relationInput,-1,1),preset:['wide','onto','branch'].includes(raw.labs.preset)?raw.labs.preset:'wide',input:typeof raw.labs.input==='number'&&Number.isFinite(raw.labs.input)?Math.max(-1,Math.min(3,raw.labs.input)):1,checked:raw.labs.checked===true};
  if(s.labs.preset==='branch')s.labs.input=Math.max(1,s.labs.input);
 }
 if(obj(raw.resume))s.resume={page:pages.includes(raw.resume.page)?raw.resume.page:'home',chapter:raw.resume.chapter==='two'?'two':'one'};
 return s;
}
export function exportText(state){
 return JSON.stringify({application:'SYN Study',exportVersion:1,state:normalise(state)},null,2);
}
export function importText(text){
 if(typeof text!=='string'||text.length>1_000_000)error('Слишком большой файл. Предел — 1 МБ.');
 let parsed;try{parsed=JSON.parse(text);}catch{error('Не удалось прочитать JSON. Исходные данные не изменены.');}
 if(parsed.application!=='SYN Study'||parsed.exportVersion!==1)error('Нужен экспорт SYN Study версии 1.');
 return normalise(parsed.state);
}
export function startTest(state){
 if(!state.test.draft)state.test.draft={seed:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),index:0,answers:{},hints:[]};
}
export function finishTest(state){
 if(!state.test.draft)return false;
 const d=state.test.draft;
 state.test.runs.push({seed:d.seed,answers:testAnswers(d.answers),hints:[...d.hints],completedAt:new Date().toISOString()});
 state.test.runs=state.test.runs.slice(-20);state.test.draft=null;return true;
}
export function testResult(run){
 return TEST.map(q=>{
  const g=grade(q,run?.answers?.[q.id]);const assisted=run?.hints?.includes(q.id)||false;
  return {id:q.id,chapter:q.chapter,...g,assisted,independent:g.correct&&!assisted};
 });
}
export function stats(state,chapter=null){
 const qs=PRACTICE.filter(q=>!chapter||q.chapter===chapter);
 const ss=qs.map(q=>status(state.records[q.id],q));
 return {total:qs.length,solved:ss.filter(x=>x.solved).length,independent:ss.filter(x=>x.independent).length,assisted:ss.filter(x=>x.solved&&!x.independent&&x.last.assisted).length,corrected:ss.filter(x=>x.solved&&!x.independent&&!x.last.assisted).length};
}
export function reviewIds(state){
 return PRACTICE.filter(q=>{
  const r=state.records[q.id],s=status(r,q);
  return s.pinned||(r&&(!s.independent||s.helped));
 }).map(q=>q.id);
}

export class Store {
 constructor(storage){this.storage=storage;this.sandbox=false;this.problem='';this.blocked=false;this.raw=null;this.load();}
 load(){
  this.problem='';this.blocked=false;
  try{
   this.sandbox=this.storage.getItem(MODE_KEY)==='sandbox';
   this.key=this.sandbox?SANDBOX_KEY:MAIN_KEY;
   this.raw=this.storage.getItem(this.key);
   this.state=this.raw?normalise(JSON.parse(this.raw)):fresh();
  }catch(e){
   this.key=this.sandbox?SANDBOX_KEY:MAIN_KEY;this.state=fresh();this.blocked=true;
   this.problem='Сохранение недоступно или повреждено. Сейчас работа временная. Откройте «Данные», чтобы сохранить копию или восстановить прогресс.';
  }
  return this.state;
 }
 save(state=this.state){
  this.state=state;
  if(this.blocked)error(this.problem);
  try{
   if((this.storage.getItem(MODE_KEY)==='sandbox')!==this.sandbox)error('Режим изменён в другой вкладке. Перезагрузите страницу.');
   if(this.storage.getItem(this.key)!==this.raw)error('Прогресс изменён в другой вкладке. Экспортируйте эту работу и перезагрузите страницу.');
   const raw=JSON.stringify(normalise(state));this.storage.setItem(this.key,raw);this.raw=raw;this.problem='';return true;
  }catch(e){this.problem=e.message||'Не удалось сохранить. Экспортируйте текущую работу.';throw e;}
 }
 begin(){
  if(this.sandbox)error('Пробный режим уже включён.');
  if(this.storage.getItem(MODE_KEY)==='sandbox'||this.storage.getItem(this.key)!==this.raw)error('Данные или режим изменены в другой вкладке. Перезагрузите страницу.');
  this.storage.setItem(SANDBOX_KEY,JSON.stringify(fresh()));
  this.storage.setItem(MODE_KEY,'sandbox');this.load();
 }
 end(){
  if(!this.sandbox)error('Сейчас основной режим.');
  this.storage.removeItem(MODE_KEY);this.load();
 }
 replace(state){
  if((this.storage.getItem(MODE_KEY)==='sandbox')!==this.sandbox)error('Режим изменён в другой вкладке. Перезагрузите страницу.');
  if(this.storage.getItem(this.key)!==this.raw)error('Данные изменены в другой вкладке. Перезагрузите страницу.');
  const clean=normalise(state),old=this.storage.getItem(this.key);
  // Preserve even a damaged original before replacing it.
  if(old!==null)this.storage.setItem(this.key+':undo',old);
  const raw=JSON.stringify(clean);this.storage.setItem(this.key,raw);
  this.blocked=false;this.problem='';this.raw=raw;this.state=clean;return clean;
 }
 undo(){
  if((this.storage.getItem(MODE_KEY)==='sandbox')!==this.sandbox||this.storage.getItem(this.key)!==this.raw)error('Данные или режим изменены в другой вкладке. Перезагрузите страницу.');
  const raw=this.storage.getItem(this.key+':undo');
  if(raw===null)error('Резервной копии ещё нет.');
  let clean;try{clean=normalise(JSON.parse(raw));}catch{error('Резерв повреждён. Его можно скачать как исходный JSON.');}
  this.storage.setItem(this.key,JSON.stringify(clean));
  this.raw=this.storage.getItem(this.key);this.blocked=false;this.problem='';this.state=clean;return clean;
 }
 rawBackup(){return this.storage.getItem(this.key+':undo')||this.raw||'';}
}
