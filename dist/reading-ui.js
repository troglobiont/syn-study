import {CHAPTERS,PRACTICE,TEST,BY_ID} from './content.js';
import {SEMINARS,SEMINAR_QUESTIONS} from './seminar-content.js';
import {PROOFS,PROOF_BY_ID} from './proofs.js';
import {LEGACY_SOLUTIONS} from './legacy-solutions.js';
export const escapeHtml=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const e=escapeHtml;
const taskNoun=n=>n%100>=11&&n%100<=14?'задач':n%10===1?'задача':[2,3,4].includes(n%10)?'задачи':'задач';
const a=(label,path,extra='')=>'<a href="#'+path+'" '+extra+'>'+e(label)+'</a>';
const btn=(label,action,extra='',kind='secondary')=>'<button class="btn '+kind+'" type="button" data-action="'+action+'" '+extra+'>'+e(label)+'</button>';
export function topicPath(ref){
 const chapter=CHAPTERS.find(c=>c.id===ref.chapter);
 const topic=chapter?.theory.find(t=>t.title===ref.topic);
 const lesson='lesson/'+ref.chapter+'/meaning';
 return topic?lesson+'/'+topic.anchor:lesson;
}
export function knowledgeLinks(refs,returnTo='',fromProof=false){
 const attributes=fromProof?'data-reading-link':returnTo?'data-reading-return="'+e(returnTo)+'"':'';
 return '<ul class="knowledge-list">'+refs.map(ref=>'<li>'+a(ref.topic,topicPath(ref),attributes)+'<span>'+e(CHAPTERS.find(c=>c.id===ref.chapter)?.title)+'</span></li>').join('')+'</ul>';
}
export function stepList(steps){return '<ol class="reasoned-steps">'+steps.map((s,i)=>'<li><span class="step-number">Шаг '+(i+1)+'</span><p class="step-claim">'+e(s.claim)+'</p><div class="step-reason"><strong>Почему этот переход верен</strong><p>'+e(s.reason)+'</p>'+(s.uses?.length?'<p>Используем: '+s.uses.map(id=>a(PROOF_BY_ID[id]?.title||id,'proof/'+id,'data-reading-link')).join('; ')+'.</p>':'')+'</div></li>').join('')+'</ol>';}
const topicMap={one:[0,2,3,4,5],two:[0,2,1,3,5],real:[3,4,8,7,5],sequences:[0,0,9,7,5],limits:[0,1,5,4,10],derivatives:[0,0,3,5,10],numeric:[0,0,4,3,1],indefinite:[0,2,3,4,0],three:[0,3,4,5,7],improper:[0,0,2,5,4],space:[1,3,7,7,2],continuity:[6,3,4,0,7],four:[1,3,4,6,7],five:[0,0,5,4,7],higher:[0,1,2,4,5],smooth:[1,2,4,5,1],measure:[3,2,3,4,5],lebesgue:[0,2,4,1,5],multiple:[6,1,2,4,5],parameters:[3,4,1,3,5],uniformintegrals:[2,0,1,5,3],approximation:[2,3,3,6,0],surface:[2,4,5,3,6],forms:[0,1,6,6,3],six:[1,2,5,9,6],fourier:[1,2,7,5,8]};
export function guideFor(q){
 if(q.solution)return q;
 const c=CHAPTERS.find(c=>c.id===q.chapter),qs=q.id.startsWith('t-')?TEST.filter(t=>t.chapter===c.id):PRACTICE.filter(t=>t.chapter===c.id),i=Math.max(0,qs.findIndex(t=>t.id===q.id));
 const anchor="topic-"+(topicMap[c.id]?.[i]??0);
 const ref={chapter:c.id,topic:c.theory.find(t=>t.anchor===anchor)?.title||c.theory[0].title};
 const legacy=LEGACY_SOLUTIONS[q.id];
 return {...q,prerequisites:legacy?.prerequisites||[ref],solution:legacy||{strategy:'Сопоставим условия задачи с указанным определением или теоремой.',steps:[{claim:q.explanation,reason:'Разбор использует условия, указанные в задаче. Определение и точная формулировка нужного утверждения доступны по ссылке в «Необходимых знаниях».'}],result:answerText(q)},analogous:q.analogous||exampleFor(c,legacy?.prerequisites||[ref])};
}
export function answerText(q){return q.parts.map(p=>p.type==='choice'?p.options.find(o=>o.id===p.answer)?.text:p.type==='multi'?p.answer.map(id=>p.options.find(o=>o.id===id)?.text).join('; '):p.type==='set'?'{'+p.answer.join('; ')+'}':p.rule==='notEqual'?'Любое допустимое число, отличное от '+p.answer:String(p.answer)).join(' · ');}
function exampleFor(c,refs=[]){const candidates=SEMINAR_QUESTIONS.filter(q=>q.chapter===c.id);const score=q=>(q.prerequisites||[]).filter(r=>refs.some(p=>p.chapter===r.chapter&&p.topic===r.topic)).length;const q=candidates.sort((a,b)=>score(b)-score(a))[0];return q?.analogous||null;}
export function guidePanel(q,state){const g=guideFor(q),p=state.study.panels[q.id]||{};
 const controls=[['knowledge','Необходимые знания'],['hint','Подсказка'],['example','Похожий пример'],['solution','Показать решение']];
 return '<section class="task-help" aria-label="Помощь к задаче"><p class="caption">Можно сразу читать решение или попробовать самостоятельно. Любой порядок допустим.</p><div class="help-actions">'+controls.map(([key,label])=>btn(p[key]?(key==='solution'?'Скрыть решение':key==='example'?'Скрыть пример':key==='knowledge'?'Скрыть необходимые знания':'Скрыть подсказку'):label,'guide','data-question="'+q.id+'" data-panel="'+key+'" aria-expanded="'+!!p[key]+'" aria-controls="guide-'+q.id+'-'+key+'"',key==='solution'?'primary':'secondary')).join('')+'</div>'+
 (p.knowledge?'<aside class="help-section" id="guide-'+q.id+'-knowledge"><h3>Необходимые знания</h3><p>Откройте нужное определение или утверждение. Черновик задачи сохранён; ссылка для возврата будет рядом с материалом.</p>'+knowledgeLinks(g.prerequisites||[],q.id)+'</aside>':'')+
 (p.hint?'<aside class="hint-box" id="guide-'+q.id+'-hint"><h3>Подсказка</h3><p>'+e(q.hint)+'</p>'+knowledgeLinks(g.prerequisites||[],q.id)+'</aside>':'')+
 (p.example&&g.analogous?'<section class="help-section" id="guide-'+q.id+'-example"><p class="eyebrow">'+(q.id.startsWith('s-')?'Другой пример на тот же метод':'Разобранный пример из этой главы')+'</p><h3>'+e(g.analogous.title)+'</h3><p>'+e(g.analogous.statement)+'</p>'+stepList(g.analogous.steps)+'<p class="solution-result">'+e(g.analogous.result)+'</p></section>':'')+
 (p.solution?'<section class="help-section solution-panel" id="guide-'+q.id+'-solution"><p class="eyebrow">Решение открыто для чтения</p><h3>Решение по шагам</h3><p>'+e(g.solution.strategy)+'</p>'+stepList(g.solution.steps)+'<div class="solution-result"><strong>Ответ</strong><p>'+e(g.solution.result||answerText(q))+'</p></div>'+knowledgeLinks(g.prerequisites||[],q.id)+'</section>':'')+'</section>';
}
export function returnLink(state){const id=state.study.returnTo,q=BY_ID[id];return q?'<aside class="reading-return">'+a('← Вернуться к задаче: '+q.title,id.startsWith('s-')?'task/'+id:id.startsWith('t-')?'test/run':'lesson/'+q.chapter+'/practice','data-return-question="'+q.id+'"')+'</aside>':'';}
export function readingBackLink(origin){
 if(!origin)return '';
 return '<aside class="reading-return">'+a(origin.label,e(origin.path),'data-reading-back')+'</aside>';
}
export function proofLinks(c,topic=null){
 const ps=PROOFS.filter(p=>p.chapter===c.id&&(!topic||p.theoryTopic===topic));
 return ps.length?'<details class="proof-links"><summary>Доказательства по шагам · '+ps.length+'</summary><ul>'+ps.map(p=>'<li>'+a(p.title,'proof/'+p.id,'data-reading-link')+(p.note?'<span class="caption">'+e(p.note)+'</span>':'')+'</li>').join('')+'</ul></details>':'';
}
export function proofsPage(chapter=null){const ps=PROOFS.filter(p=>!chapter||p.chapter===chapter);return '<section class="reading-page"><p class="eyebrow">Определения → условия → выводы</p><h1>Доказательства по шагам</h1><p class="lead">Каждый переход сопровождается основанием. Можно читать последовательно или открыть все шаги сразу. У частных версий теорем область действия указана в формулировке.</p><nav class="reading-chapters" aria-label="Главы доказательств">'+a('Все главы','proofs')+CHAPTERS.map(c=>a(c.number+' · '+c.title,'proofs/'+c.id)).join('')+'</nav><div class="proof-catalog">'+ps.map(p=>'<article class="panel"><p class="eyebrow">'+e(CHAPTERS.find(c=>c.id===p.chapter)?.title)+'</p><h2>'+a(p.title,'proof/'+p.id,'data-reading-link')+'</h2><p>'+e(p.statement)+'</p>'+(p.note?'<p class="scope-note">'+e(p.note)+'</p>':'')+'</article>').join('')+'</div></section>';}
export function proofPage(id,state,origin=null){
 const p=PROOF_BY_ID[id];
 if(!p)return proofsPage();
 const count=state.study.proofSteps[id]||1;
 const theory=topicPath({chapter:p.chapter,topic:p.theoryTopic});
 const back=readingBackLink(origin)||'<p>'+a('← К теории главы',theory,'data-reading-link')+'</p>';
 return '<section class="reading-page proof-reader">'+back+
  '<p class="eyebrow">'+e(CHAPTERS.find(c=>c.id===p.chapter)?.title)+'</p><h1>'+e(p.title)+'</h1>'+
  '<div class="panel"><h2>Что доказываем</h2><p>'+e(p.statement)+'</p><h3>Условия</h3><ul>'+p.assumptions.map(s=>'<li>'+e(s)+'</li>').join('')+'</ul>'+
  (p.note?'<p class="scope-note">'+e(p.note)+'</p>':'')+
  '<details><summary>Что нужно знать</summary>'+knowledgeLinks(p.prerequisites||[],'',true)+'</details></div>'+
  '<p class="caption" role="status">Открыто шагов: '+Math.min(count,p.steps.length)+' из '+p.steps.length+'</p>'+
  stepList(p.steps.slice(0,count))+
  '<div class="actions">'+(count<p.steps.length?btn('Следующий шаг →','proof-next','data-proof="'+p.id+'"','primary')+btn('Показать все шаги','proof-all','data-proof="'+p.id+'"'):btn('Свернуть до первого шага','proof-first','data-proof="'+p.id+'"'))+'</div>'+
  (count>=p.steps.length?'<div class="solution-result"><strong>Вывод</strong><p>'+e(p.conclusion)+'</p></div>':'')+
  '<p>'+a('Все доказательства главы','proofs/'+p.chapter)+'</p></section>';
}
export function matchingSeminars(state){const query=state.study.query.trim().toLocaleLowerCase('ru');return SEMINARS.filter(s=>s.semester===state.study.semester&&(!query||[s.title,CHAPTERS.find(c=>c.id===s.chapter)?.title,...s.references.map(r=>r.book+' '+r.numbers)].join(' ').toLocaleLowerCase('ru').includes(query)));}
export function sourceCard(s){return '<div class="seminar-source"><p><a href="'+e(s.source)+'" target="_blank" rel="noreferrer">'+e(s.sourceLabel)+'</a>'+(s.sourceItem?' · пункт '+e(s.sourceItem):'')+'</p>'+s.references.map(r=>'<p><strong>'+e(r.book)+'</strong><br>'+e(r.edition)+' · № '+e(r.numbers)+'</p>').join('')+(s.note?'<p class="scope-note">'+e(s.note)+'</p>':'')+'</div>';}
export function seminarCards(state){const ss=matchingSeminars(state);return '<p class="caption" role="status">Найдено тем: '+ss.length+'</p>'+ss.map(s=>{const qs=SEMINAR_QUESTIONS.filter(q=>q.seminarId===s.id);return '<article class="panel seminar-card" id="seminar-'+s.id+'"><p class="eyebrow">Семестр '+s.semester+' · '+e(CHAPTERS.find(c=>c.id===s.chapter)?.title)+'</p><h2>'+e(s.title)+'</h2>'+sourceCard(s)+'<div class="actions">'+a('Теория главы','lesson/'+s.chapter+'/meaning','class="btn secondary"')+a('Доказательства','proofs/'+s.chapter,'class="btn secondary"')+'</div>'+(qs.length?'<h3>Встроенные задачи SYN по этой теме</h3><ul class="task-list">'+qs.map(q=>'<li>'+a(q.title,'task/'+q.id)+'</li>').join('')+'</ul>':'<p class="caption">Задания из задачника указаны выше. '+a('Встроенные задачи по этой главе','seminars/chapter/'+s.chapter)+'.</p>')+'</article>';}).join('')+(ss.length?'':'<p class="empty-state">Тем с таким запросом в выбранном семестре нет. Попробуйте название раздела или другой семестр.</p>');}
export function seminarsPage(state,chapter=null){
 const qs=SEMINAR_QUESTIONS.filter(q=>!chapter||q.chapter===chapter);
 const picker='<label class="chapter-picker">Задачи по главе<select id="practice-chapter"><option value="">Все главы</option>'+CHAPTERS.map(c=>'<option value="'+c.id+'" '+(c.id===chapter?'selected':'')+'>'+c.number+' · '+e(c.title)+'</option>').join('')+'</select></label>';
 const plans='<details class="seminar-plan sources"><summary>Планы семинаров и номера заданий из задачников · '+SEMINARS.length+' тем</summary><nav class="semester-filter" aria-label="Семестр практикума">'+[1,2,3,4].map(n=>btn('Семестр '+n,'semester','data-value="'+n+'" aria-pressed="'+(state.study.semester===n)+'"',state.study.semester===n?'primary':'secondary')).join('')+'</nav><form id="seminar-filter" class="catalog-filter"><label for="seminar-search">Найти тему или номер задания</label><input id="seminar-search" type="search" maxlength="120" value="'+e(state.study.query)+'" placeholder="Например: предел, Тейлор, 82"><button class="btn secondary" type="submit">Найти</button></form><div id="seminar-results">'+seminarCards(state)+'</div></details>';
 return '<section class="reading-page"><p class="eyebrow">Свободная практика · без обязательного порядка</p><h1>Семинарский практикум</h1><p class="lead">Выберите интересную тему. Можно решать, читать похожий пример или сразу открыть решение с обоснованием переходов.</p><details class="sources"><summary>Как связаны задачи и семинарские планы</summary><p>Каталог сохраняет темы и номера заданий из планов Белоносова и НГУ. Номера относятся к указанным изданиям задачников. Встроенные задачи и решения написаны для SYN по этим темам; они не выдаются за условия одноимённых номеров Демидовича или Очана. Внешние источники открываются отдельно и требуют интернета.</p></details>'+picker+plans+(chapter?'<p>'+a('← Все семинары','seminars')+'</p><h2>'+e(CHAPTERS.find(c=>c.id===chapter)?.title)+'</h2>':'')+'<section class="embedded-catalog"><h2>'+(chapter?'Задачи по главе':'Встроенные задачи')+'</h2><p class="caption">'+qs.length+' '+taskNoun(qs.length)+'. Решения доступны сразу; черновики, отложенные задачи и отметки повторения сохраняются отдельно.</p><div class="practice-catalog">'+qs.map(q=>'<article class="panel"><p class="eyebrow">'+e(CHAPTERS.find(c=>c.id===q.chapter)?.title)+'</p><h3>'+a(q.title,'task/'+q.id)+'</h3><p>'+e(q.prompt)+'</p>'+(state.records[q.id]?.pinned?'<p class="caption">Отмечено для повторения</p>':'')+(state.records[q.id]?.events.some(ev=>ev.kind==='reveal')?'<p class="caption">Решение открывалось</p>':'')+'</article>').join('')+'</div></section></section>';
}
