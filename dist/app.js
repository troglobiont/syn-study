import {VERSION,CHAPTERS,PRACTICE,TEST,BY_ID,GLOSSARY} from './content.js';
import {Store,fresh,record,status,submit,event,grade,stats,reviewIds,exportText,importText,startTest,finishTest,testResult,testQuestions,orderedOptions} from './core.js';

import {advancedLab,advancedModelOutput,normaliseModels} from './models.js';
import {SYLLABUS,PROGRAM_SOURCE} from './syllabus.js';
import {foundationLab,foundationOutput,normaliseFoundation} from './foundation-models.js';
const $=s=>document.querySelector(s);
const nativeAndroid=typeof window.SynAndroid?.saveJson==='function';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let storage;
try{storage=window.localStorage;}catch{storage={getItem(){throw Error('storage unavailable');},setItem(){throw Error('storage unavailable');},removeItem(){throw Error('storage unavailable');}};}
const store=new Store(storage);
let state=store.state,pendingImport=null,confirmation=null,formMessage='',traceActive=false,offlineReady=nativeAndroid;
let currentRoute=null;
const stages=[['meaning','Теория'],['lab','Примеры'],['practice','Задачи'],['insight','Итоги']];
const button=(text,action,extra='',kind='secondary')=>'<button type="button" class="btn '+kind+'" data-action="'+action+'" '+extra+'>'+text+'</button>';
const link=(text,path,kind='secondary')=>'<a class="btn '+kind+'" href="#'+path+'">'+text+'</a>';
function announce(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(announce.timer);announce.timer=setTimeout(()=>$('#toast').classList.remove('visible'),4200);}
function focusReading(selector){const el=$(selector);if(el){el.tabIndex=-1;el.focus({preventScroll:true});}}
function save(){
 try{store.save(state);document.querySelectorAll('[data-save-label]').forEach(el=>el.textContent=store.sandbox?'Пробный прогресс сохранён':'Сохранено на этом устройстве');return true;}
 catch(e){document.querySelectorAll('[data-save-label]').forEach(el=>el.textContent='Не сохранено · откройте Данные');const warning=$('#save-warning');if(warning){warning.hidden=false;warning.textContent=store.problem;}return false;}
}
function nav(path){if(location.hash.slice(1)===path)render();else location.hash=path;}
function route(){
 const parts=location.hash.slice(1).split('/');
 if(parts[0]==='lesson'&&CHAPTERS.some(c=>c.id===parts[1]))return {page:'lesson',chapter:parts[1],stage:stages.some(x=>x[0]===parts[2])?parts[2]:state.chapters[parts[1]].stage};
 if(['test','results','review','data'].includes(parts[0]))return {page:parts[0],sub:parts[1]};
 return {page:'home'};
}
function coverArt(small=false){
 return '<svg class="cover-art'+(small?' small':'')+'" viewBox="0 0 520 340" role="img" aria-label="Схема функции f: A → B"><defs><pattern id="grid" width="26" height="26" patternUnits="userSpaceOnUse"><path d="M26 0H0V26" fill="none" stroke="currentColor" stroke-width=".5" opacity=".2"/></pattern><marker id="cover-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0L7 4L0 8" fill="none" stroke="#e2b878"/></marker></defs><rect width="520" height="340" rx="18" fill="#174c43"/><rect width="520" height="340" fill="url(#grid)"/><ellipse cx="140" cy="164" rx="65" ry="109" fill="none" stroke="#9cbaaa" stroke-width="1.5"/><ellipse cx="379" cy="164" rx="65" ry="109" fill="none" stroke="#9cbaaa" stroke-width="1.5"/><g fill="none" stroke="#e2b878" stroke-width="2" marker-end="url(#cover-arrow)"><path d="M151 93C236 93 288 120 365 157"/><path d="M151 164H365"/><path d="M151 235C243 235 288 181 365 164"/></g><g fill="#f5f1e8"><circle cx="140" cy="93" r="7"/><circle cx="140" cy="164" r="7"/><circle cx="140" cy="235" r="7"/><circle cx="379" cy="164" r="7"/><circle cx="379" cy="93" r="7" fill="#174c43" stroke="#9cbaaa"/><circle cx="379" cy="235" r="7" fill="#174c43" stroke="#9cbaaa"/></g><g fill="#f5f1e8" font-family="Georgia,serif" font-size="24"><text x="130" y="34">A</text><text x="371" y="34">B</text><text x="243" y="140" font-style="italic">f</text></g><text x="32" y="311" fill="#c5d5c9" font-family="system-ui" font-size="12" letter-spacing="3">f: A → B</text><circle cx="478" cy="34" r="12" fill="none" stroke="#e2b878"/><path d="M473 34h10m-5-5v10" stroke="#e2b878"/></svg>';
}
function shell(body,r){
 const total=stats(state);document.body.classList.toggle('reduce-motion',state.prefs.reduceMotion);
 return '<header class="topbar"><a class="brand" href="#home" aria-label="SYN Study — к разделам"><span class="brand-mark">SYN<span>•</span></span><span class="brand-sub">STUDY<br>МАТЕМАТИЧЕСКИЙ АНАЛИЗ</span></a><nav aria-label="Основная навигация">'+[['home','Разделы'],['review','Повторение'],['results','Результаты'],['data','Данные']].map(([p,t])=>'<a href="#'+p+'" '+(r.page===p?'aria-current="page"':'')+'>'+t+'</a>').join('')+'</nav>'+button('Словарь ↗','glossary','','quiet')+'</header>'+
 (store.sandbox?'<div class="sandbox-banner"><strong>Пробный режим.</strong> Основной прогресс не меняется. '+button('Вернуться к основному прогрессу','end-sandbox','','small')+'</div>':'')+
 '<div id="save-warning" class="warning" role="alert" '+(!store.problem?'hidden':'')+'>'+esc(store.problem)+'</div>'+
 '<main id="main" tabindex="-1">'+body+'</main><footer class="footer"><span>SYN Study <span class="muted">/ '+VERSION+'</span></span><span data-save-label>'+ (store.problem?'Не сохранено · откройте Данные':store.sandbox?'Пробный прогресс сохранён':'Сохранено на этом устройстве')+'</span><span>'+total.independent+' / '+total.total+' с первой попытки</span></footer>'+
 '<dialog id="glossary" aria-labelledby="glossary-title"><div class="dialog-head"><h2 id="glossary-title">Обозначения и определения</h2>'+button('Закрыть ×','close-glossary','','quiet')+'</div><dl class="glossary">'+GLOSSARY.map(([a,b])=>'<div><dt>'+esc(a)+'</dt><dd>'+esc(b)+'</dd></div>').join('')+'</dl></dialog>';
}
function home(){
 const s=stats(state),resume=state.resume;
 const continuePath=resume.page==='lesson'?'lesson/'+resume.chapter+'/'+state.chapters[resume.chapter].stage:state.test.draft?'test/run':'lesson/one/meaning';
 const cards=CHAPTERS.map((c,i)=>{const p=stats(state,c.id),previous=CHAPTERS[i-1],group=!previous||previous.semester!==c.semester?'<div class="program-group"><p class="eyebrow">'+(c.semester?'Программа Белоносова':'Вне найденной программы двух семестров')+'</p><h2>'+(c.semester?'Семестр '+c.semester:'Дополнительные главы')+'</h2></div>':'';
 return group+'<article class="chapter-card"><div class="card-top"><span class="chapter-number">'+c.number+'</span><span class="tag">'+(state.chapters[c.id].collected?'Итоги сохранены':'Доступна')+'</span></div><p class="program-label">'+(c.program?'Раздел '+c.program+' программы':'Дополнение')+'</p><div class="chapter-symbol" aria-hidden="true">'+esc(c.symbol)+'</div><h3>'+c.title+'</h3><p>'+c.subtitle+'</p><div class="progress-label"><span>Практика: '+p.solved+' / '+p.total+'</span><span>'+p.independent+' с первой</span></div><progress value="'+p.solved+'" max="'+p.total+'" aria-label="Решено задач '+p.solved+' из '+p.total+'"></progress>'+link(state.chapters[c.id].visited.length?'Продолжить главу ↗':'Открыть главу ↗','lesson/'+c.id+'/'+state.chapters[c.id].stage,'card-link')+'</article>';}).join('');
 return '<section class="hero"><div><p class="eyebrow">В. С. Белоносов · НГУ · программа 2014/2015</p><h1>Математический<br><em>анализ</em></h1><p class="hero-copy">От точных граней и пределов к дифференцированию и интегралам.<br>Определения, условия теорем, примеры и задачи.</p><div class="actions">'+link('Продолжить изучение <span aria-hidden="true">↗</span>',continuePath,'primary')+'<span class="quiet-note">Два семестра.<br>'+CHAPTERS.length+' учебных глав.</span></div></div><div class="hero-visual">'+coverArt()+'<div class="art-caption"><span>∀ε &gt; 0 ∃δ &gt; 0</span><span>Определения и доказательства</span></div></div></section>'+
 '<section class="program-intro panel"><p class="eyebrow">Основа структуры курса</p><h2>Программа Белоносова</h2><p>Основные главы следуют разделам I–XI программы двух семестров. Это краткое авторское изложение SYN с выбранными обоснованиями и задачами, а не полный конспект лекций профессора. Формальные определения сопровождаются чтением словами.</p><details class="sources"><summary>Посмотреть программу и соответствие глав</summary><p><a href="'+PROGRAM_SOURCE+'" target="_blank" rel="noreferrer">Архивная копия программы 2014/2015, составитель В. С. Белоносов</a>. Используется порядок тем; учебные тексты и задания написаны для SYN.</p><ol class="syllabus-list">'+SYLLABUS.map(section=>'<li><strong>'+section.id+'. '+section.title+'</strong><span>Семестр '+section.semester+' · главы '+section.chapters.map(id=>CHAPTERS.find(c=>c.id===id).number).join(', ')+'</span></li>').join('')+'</ol><p>Функциональные ряды и многомерное интегрирование сохранены как дополнительные главы. Они не входят в найденный документ на два семестра.</p></details></section>'+
 '<section class="catalog-section" aria-labelledby="catalog-title"><div class="section-heading"><div><p class="eyebrow">Содержание курса</p><h2 id="catalog-title">Главы по порядку программы</h2></div><span class="muted">Теория → примеры → задачи</span></div><div class="chapter-grid">'+cards+'</div></section>'+
 '<section class="test-invite"><span class="test-orbit" aria-hidden="true">∴</span><div><p class="eyebrow">Задания по всем главам</p><h2>Итоговая самопроверка</h2><p>'+TEST.length+' вопросов. Разбор после сдачи, без таймера. Можно прерывать и продолжать.</p></div>'+link('К самопроверке →','test','primary')+'</section>'+
 '<section class="below-grid"><div><p class="eyebrow">Результаты изучения</p><h3>Краткие итоги глав</h3><p>Первая попытка, исправления и использование помощи учитываются отдельно.</p><p class="muted">'+s.solved+' из '+s.total+' задач решено · '+CHAPTERS.filter(c=>state.chapters[c.id].collected).length+' из '+CHAPTERS.length+' итогов сохранено</p></div><details class="sources"><summary>Учебные материалы и работа без сети</summary><p>Тексты, разобранные примеры и практика встроены в приложение. Ссылки для продолжения чтения приведены в главах; внешние материалы требуют интернета. Произвольные доказательства автоматически не оцениваются.</p><p>Для повторения в видео — <a href="https://youtu.be/NX4s0ZE97Kc" target="_blank" rel="noreferrer">обзор первого семестра</a>. Он не является источником порядка глав этой редакции.</p></details></section>';
}
function lesson(r){
 const c=CHAPTERS.find(c=>c.id===r.chapter),cs=state.chapters[c.id];cs.stage=r.stage;
 if(!cs.visited.includes(r.stage))cs.visited.push(r.stage);
 const index=stages.findIndex(s=>s[0]===r.stage);
 let body='';
 if(r.stage==='meaning')body='<div class="lesson-heading"><p class="eyebrow">'+(c.program?'Семестр '+c.semester+' · раздел '+c.program+' программы':'Дополнительная глава')+'</p><h2>'+c.title+'</h2><p class="lead">'+c.subtitle+'</p></div>'+(c.prerequisites?'<aside class="hint-box"><strong>Предварительные знания</strong><p>'+c.prerequisites+'</p></aside>':'')+c.theory.map((t,i)=>'<article class="theory-block"><span class="block-number">'+String(i+1).padStart(2,'0')+'</span><div><h3>'+t.title+'</h3>'+t.body+'<div class="formula">'+esc(t.formula)+'</div></div></article>').join('')+'<details class="deep"><summary>Обоснование</summary><p>'+esc(c.deep)+'</p></details>'+(c.sources?'<details class="sources"><summary>Материалы для продолжения</summary><ul>'+c.sources.map(([title,url])=>'<li><a href="'+url+'" target="_blank" rel="noreferrer">'+title+'</a></li>').join('')+'</ul></details>':'')+stageFooter(c.id,r.stage);
 if(r.stage==='lab')body=(c.id==='one'?relationLab():c.id==='two'?mappingLab():c.foundation?foundationLab(c,state.foundation):advancedLab(c,state.models))+stageFooter(c.id,r.stage);
 if(r.stage==='practice')body=practice(c);
 if(r.stage==='insight'){const p=stats(state,c.id);body='<div class="insight-sheet"><p class="eyebrow">Итоги главы / '+c.number+'</p><div class="insight-mark" aria-hidden="true">'+(c.id==='one'?'∃!':c.symbol)+'</div><h2>'+c.card+'</h2><p class="lead">'+esc(c.takeaway)+'</p><div class="formula">'+(c.summaryFormula||(c.id==='one'?'∀x ∈ A ∃!y ∈ B: f(x)=y':'Обратимость f: A→B ⇔ f — биекция'))+'</div><p>Практика: '+p.solved+' / 5 решено, '+p.independent+' с первой попытки. Сохранение итогов отмечает их просмотр и не изменяет результаты задач.</p>'+button(cs.collected?'Итоги сохранены ✓':'Сохранить итоги главы','collect','data-chapter="'+c.id+'"','primary')+'</div><div class="actions">'+link('← К практике','lesson/'+c.id+'/practice')+link(CHAPTERS[CHAPTERS.indexOf(c)+1]?'К главе '+CHAPTERS[CHAPTERS.indexOf(c)+1].number+' →':'К итоговой самопроверке →',CHAPTERS[CHAPTERS.indexOf(c)+1]?'lesson/'+CHAPTERS[CHAPTERS.indexOf(c)+1].id+'/meaning':'test','primary')+'</div>';}
 return '<section class="lesson-layout"><aside class="lesson-sidebar"><a class="back-link" href="#home">← К разделам</a><p class="eyebrow">Глава '+c.number+'</p><h1>'+c.title+'</h1><nav aria-label="Этапы главы" class="stage-nav">'+stages.map(([key,label],i)=>'<a href="#lesson/'+c.id+'/'+key+'" '+(key===r.stage?'aria-current="step"':'')+'><span>0'+(i+1)+'</span>'+label+(cs.visited.includes(key)?'<span class="visited" aria-label="просмотрено">·</span>':'')+'</a>').join('')+'</nav><p class="sidebar-note">Можно перейти к любому этапу. Прогресс сохраняется на этом устройстве.</p>'+button('Обозначения и определения','glossary','','quiet')+'</aside><div class="lesson-body"><div class="lesson-meta"><span>'+c.number+' / '+String(CHAPTERS.length).padStart(2,'0')+'</span><span>Этап '+(index+1)+' из 4</span><a href="#home">К разделам ↗</a></div>'+body+'</div></section>';
}
function stageFooter(id,stage){
 const i=stages.findIndex(x=>x[0]===stage);
 return '<div class="stage-footer">'+(i>0?link('← Назад','lesson/'+id+'/'+stages[i-1][0]):'<a href="#home">К разделам</a>')+link(i===1?'К задачам →':'К примерам →','lesson/'+id+'/'+stages[i+1][0],'primary')+'</div>';
}
function relationLab(){
 const l=state.labs,x=l.relationInput;
 const edges=[[-1,1],[0,0],[1,1]].filter(([a])=>!(l.relation==='partial'&&a===1));
 if(l.relation==='ambiguous')edges.push([0,2]);
 const outputs=edges.filter(([a])=>a===x).map(([,b])=>b);
 const py=a=>65+(a+1)*60,qy=b=>65+b*60;
 const lines=edges.map(([a,b])=>'<path d="M105 '+py(a)+' C190 '+py(a)+' 210 '+qy(b)+' 295 '+qy(b)+'" class="'+(a===x?'selected-edge':'')+'" marker-end="url(#rel-arrow)"/>').join('');
 return '<p class="eyebrow">Примеры / 01</p><h2>Проверка определения функции</h2><p>Пусть A = {−1,0,1}, B = {0,1,2} и R = {(−1,1),(0,0),(1,1)}. Выберите отношение и элемент x ∈ A. Схема показывает все y ∈ B, для которых (x,y) принадлежит выбранному отношению.</p><section class="lab-panel"><div class="lab-controls"><label>Отношение<select id="relation-mode"><option value="valid" '+(l.relation==='valid'?'selected':'')+'>R · три пары</option><option value="ambiguous" '+(l.relation==='ambiguous'?'selected':'')+'>S · добавлена пара (0,2)</option><option value="partial" '+(l.relation==='partial'?'selected':'')+'>T · удалена пара (1,1)</option></select></label><fieldset class="input-choice"><legend>Элемент множества A</legend>'+[-1,0,1].map(n=>button(String(n),'rel-input','data-value="'+n+'" aria-pressed="'+(x===n)+'"',x===n?'small selected':'small')).join('')+'</fieldset></div><div class="model-board"><svg viewBox="0 0 400 260" role="img" aria-label="Схема отношения: элемент A равен '+x+', число связанных элементов B: '+outputs.length+'"><defs><marker id="rel-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7" fill="none" stroke="currentColor"/></marker></defs><text x="74" y="30">A</text><text x="307" y="30">B</text><g class="relation-edges">'+lines+'</g>'+[-1,0,1].map(a=>'<circle class="node '+(a===x?'active':'')+'" cx="85" cy="'+py(a)+'" r="19"/><text class="node-label" x="85" y="'+(py(a)+6)+'" text-anchor="middle">'+a+'</text>').join('')+[0,1,2].map(b=>'<circle class="node '+(outputs.includes(b)?'active':'')+'" cx="315" cy="'+qy(b)+'" r="19"/><text class="node-label" x="315" y="'+(qy(b)+6)+'" text-anchor="middle">'+b+'</text>').join('')+'<text class="svg-caption" x="200" y="245" text-anchor="middle">Пары (x,y), принадлежащие отношению</text></svg><div class="model-readout" aria-live="polite"><span>Для элемента A: <strong>'+x+'</strong></span><strong>'+outputs.length+' '+(outputs.length===1?'элемент B':outputs.length===0?'элементов B':'элемента B')+(outputs.length?' · '+outputs.join(', '):'')+'</strong></div></div><div class="lab-actions">'+button('Выделить пары →','trace','','primary')+button('Проверить условия','rel-check')+'</div>'+(l.checked?'<div class="lab-conclusion" role="status"><strong>'+(l.relation==='valid'?'Это функция A → B.':l.relation==='ambiguous'?'Это отношение не задаёт функцию.':'Отношение не задаёт функцию на A.')+'</strong><p>'+(l.relation==='valid'?'Для каждого x∈A существует ровно один y∈B с (x,y)∈R. При разных аргументах −1 и 1 значения функции равны 1; определение функции это допускает.':l.relation==='ambiguous'?'Нарушено условие единственности: (0,0) и (0,2) принадлежат отношению S, причём 0≠2.':'Нарушено условие существования: отношение T не содержит ни одной пары (1,y) с y∈B.')+'</p></div>':'')+'</section><p class="caption">На схеме показано конечное отношение целиком. Просмотр примера не изменяет результаты задач.</p>';
}
function mappingLab(){
 const l=state.labs,branch=l.preset==='branch',x=l.input,y=(x-1)**2;
 const functionName=branch?'k':l.preset==='onto'?'q̃':'q';
 const a=branch?'[1,3]':'ℝ',b=branch?'[0,4]':l.preset==='onto'?'[0,+∞)':'ℝ';
 const posX=branch?65+(x-1)*135:65+(x+1)*67.5,posY=65+y*67.5;
 return '<p class="eyebrow">Примеры / 02</p><h2>Область определения, кодомен и образ</h2><p>Сравните три функции, заданные формулой (x−1)², с разными областями определения и кодоменами. Ползунок изменяет аргумент x.</p><section class="lab-panel mapping"><label class="full-control">Функция<select id="map-preset">'+[['wide','q: ℝ → ℝ'],['onto','q̃: ℝ → [0,+∞)'],['branch','k: [1,3] → [0,4]']].map(([v,t])=>'<option value="'+v+'" '+(v===l.preset?'selected':'')+'>'+t+'</option>').join('')+'</select></label><div class="model-board"><div class="set-legend"><span><b>Область A</b> '+a+'</span><span><b>Кодомен B</b> '+b+'</span><span><b>Образ</b> '+(branch?'[0,4]':'[0,+∞)')+'</span></div><svg viewBox="0 0 400 220" role="img" aria-label="Аргумент '+x+', значение функции '+y+'. Образ '+(branch?'от 0 до 4':'все неотрицательные числа')+'"><defs><marker id="map-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7" fill="none" stroke="currentColor"/></marker></defs><text x="24" y="48">A</text><text x="24" y="171">B</text><path class="axis-line" d="M65 65H335M65 185H335"/><path class="image-line" d="M65 185H335" marker-end="'+(!branch?'url(#map-arrow)':'')+'"/><path class="map-edge selected-edge" d="M'+posX+' 77C'+posX+' 117 '+posY+' 132 '+posY+' 173" marker-end="url(#map-arrow)"/><circle class="node active" cx="'+posX+'" cy="65" r="10"/><circle class="node active" cx="'+posY+'" cy="185" r="10"/><g class="tick-label"><text x="65" y="40" text-anchor="middle">'+(branch?'1':'−1')+'</text><text x="335" y="40" text-anchor="middle">3</text><text x="65" y="211" text-anchor="middle">0</text><text x="335" y="211" text-anchor="middle">'+(branch?'4':'4 …')+'</text></g><text x="200" y="122" text-anchor="middle" class="map-rule">(x−1)²</text></svg></div><div class="range-control"><label for="map-input">Аргумент x = <output id="input-number">'+x+'</output></label><input id="map-input" type="range" min="'+(branch?1:-1)+'" max="3" step="0.25" value="'+x+'"><div class="model-readout" aria-live="polite"><span>Значение '+functionName+'(x)</span><strong id="output-number">'+y+'</strong></div></div>'+button('Выделить соответствие →','trace','','primary')+'<div class="lab-conclusion"><strong>'+(branch?'Биекция [1,3] → [0,4]':l.preset==='onto'?'Сюръективна, неинъективна':'Неинъективна и несюръективна')+'</strong><p>'+(branch?'Для каждого y∈[0,4] существует единственный x=1+√y∈[1,3] с k(x)=y. Обратная функция: k⁻¹(y)=1+√y.':l.preset==='onto'?'Образ совпадает с кодоменом [0,+∞). Однако q̃(0)=q̃(2)=1 при 0≠2, что нарушает инъективность.':'Образ [0,+∞) не совпадает с кодоменом ℝ. Кроме того, q(0)=q(2)=1 при 0≠2. Следовательно, q не является ни сюръекцией, ни инъекцией.')+'</p></div></section><p class="caption">'+(branch?'На схеме полностью показаны область определения [1,3] и образ [0,4].':'На схеме показаны только аргументы x∈[−1,3] и соответствующие значения из [0,4]. Область определения функции равна ℝ, образ — [0,+∞). Границы рисунка не ограничивают эти множества.')+'</p>';
}
function answerForm(q,answer={},seed='practice',test=false){
 return '<form id="answer-form" data-question="'+q.id+'">'+q.parts.map(p=>{
  const value=answer[p.id];
  if(p.options)return '<fieldset class="answer-part"><legend>'+esc(p.label)+'</legend>'+(p.type==='multi'?'<p class="field-hint">Можно выбрать несколько вариантов.</p>':'')+'<div class="options">'+orderedOptions(q,p,seed).map(o=>'<label class="option"><input type="'+(p.type==='multi'?'checkbox':'radio')+'" name="'+q.id+'-'+p.id+'" data-part="'+p.id+'" value="'+o.id+'" '+((p.type==='multi'?Array.isArray(value)&&value.includes(o.id):value===o.id)?'checked':'')+'><span>'+esc(o.text)+'</span></label>').join('')+'</div></fieldset>';
  return '<div class="answer-part"><label class="field-label" for="field-'+p.id+'">'+esc(p.label)+'</label><input id="field-'+p.id+'" name="'+p.id+'" data-part="'+p.id+'" type="text" '+(p.type==='number'?'inputmode="decimal"':'')+' autocomplete="off" maxlength="300" placeholder="'+(p.type==='set'?'Введите элементы множества':'Введите число')+'" value="'+esc(value||'')+'"><p class="field-hint">'+(p.type==='set'?'Элементы через запятую или точку с запятой. Порядок не важен.':'Можно целое, десятичное число с точкой/запятой или дробь a/b.')+'</p></div>';
 }).join('')+'<div id="form-message" class="form-message" role="status" aria-live="polite">'+esc(formMessage)+'</div><div class="actions"><button type="submit" class="btn primary">'+(test?'Сохранить и дальше →':'Проверить ответ')+'</button>'+button(test?'Пока пропустить':'Отложить задачу','skip','data-question="'+q.id+'"')+'</div></form>';
}
function practice(c){
 const qs=PRACTICE.filter(q=>q.chapter===c.id),index=state.chapters[c.id].index,q=qs[index],rec=state.records[q.id],s=status(rec,q);
 return '<div class="practice-top"><p class="eyebrow">Практика / '+(index+1)+' из '+qs.length+'</p><nav aria-label="Задачи главы" class="question-dots">'+qs.map((item,i)=>'<button class="'+(i===index?'current':'')+'" type="button" data-action="question" data-question="'+item.id+'" aria-label="Задача '+(i+1)+'" '+(i===index?'aria-current="step"':'')+'>'+(i+1)+'</button>').join('')+'</nav></div><h2>'+esc(q.title)+'</h2><p class="question-prompt">'+esc(q.prompt)+'</p>'+answerForm(q,rec?.draft)+
 '<div class="help-actions">'+button('Подсказка','hint','data-question="'+q.id+'"','quiet')+button('Показать ответ и объяснение','reveal','data-question="'+q.id+'"','quiet')+button(s.pinned?'Убрать отметку повторения':'Отметить для повторения','pin','data-question="'+q.id+'"','quiet')+'</div>'+
 (s.helped?'<aside class="hint-box"><strong>Подсказка</strong><p>'+esc(q.hint)+'</p></aside>':'')+
 (s.last?'<div class="feedback '+(s.last.correct?'success':'neutral')+'" role="status"><strong>'+(s.last.correct?'Верно · '+s.label:'Ответ неверен')+'</strong><p>'+(s.last.correct?q.explanation:'Проверьте все части ответа. Черновик и первая попытка сохранены; можно исправить или открыть помощь.')+'</p></div>':'')+
 (s.revealed?'<div class="feedback explanation"><strong>Ответ просмотрен · это отмечено</strong><p>'+esc(q.explanation)+'</p></div>':'')+
 '<div class="stage-footer">'+(index>0?button('← Предыдущая','prev-question','data-chapter="'+c.id+'"') :link('← К примерам','lesson/'+c.id+'/lab'))+button(index<qs.length-1?'Следующая задача →':'К итогам главы →','next-question','data-chapter="'+c.id+'"','primary')+'</div>';
}
function testPage(r){
 const d=state.test.draft,qs=testQuestions(d);
 if(!d||!['run','overview'].includes(r.sub))return '<section class="narrow intro-test"><p class="eyebrow">Самопроверка</p><h1>Итоговая самопроверка</h1><p class="lead">'+(d?qs.length:TEST.length)+' вопросов. Без таймера. Разбор — после сдачи.</p><ul class="plain-list"><li>Выбор можно менять до завершения.</li><li>Пропущенное будет видно в результате.</li><li>Подсказка отмечается отдельно от самостоятельного ответа.</li><li>Вопросы проверяют определения, вычисления и применение изученных свойств.</li></ul><div class="actions">'+button(d?'Продолжить самопроверку →':'Начать '+TEST.length+' вопросов →','start-test','','primary')+link('Вернуться к главам','home')+'</div>'+(state.test.runs.length?'<p class="caption">Завершённых попыток: '+state.test.runs.length+'. Новая попытка сохраняется отдельно.</p>':'')+'</section>';
 if(r.sub==='overview')return '<section class="narrow"><p class="eyebrow">Перед завершением</p><h1>Всё ли готово?</h1><p>Можно вернуться к любому вопросу. Пустые ответы останутся пропущенными.</p><div class="overview-list">'+qs.map((q,i)=>'<button class="overview-row" data-action="test-index" data-index="'+i+'"><span>'+String(i+1).padStart(2,'0')+' · '+esc(q.title)+'</span><span>'+ (grade(q,d.answers[q.id]).valid?'Ответ сохранён':'Нет полного ответа')+'</span></button>').join('')+'</div><div class="actions">'+button('Завершить и открыть разбор','finish-test','','primary')+button('← К вопросам','test-index','data-index="0"')+'</div></section>';
 const q=qs[d.index],assisted=d.hints.includes(q.id);
 return '<section class="narrow test-question"><div class="lesson-meta"><a href="#test">← О самопроверке</a><span>'+ (d.index+1)+' / '+qs.length+'</span><a href="#home">К разделам ↗</a></div><progress value="'+d.index+'" max="'+qs.length+'" aria-label="Вопрос '+(d.index+1)+' из '+qs.length+'"></progress><p class="eyebrow">Новый пример / глава '+CHAPTERS.find(c=>c.id===q.chapter).number+'</p><h1>'+esc(q.title)+'</h1><p class="question-prompt">'+esc(q.prompt)+'</p>'+answerForm(q,d.answers[q.id],d.seed,true)+'<div class="help-actions">'+button('Показать подсказку · с отметкой помощи','test-hint','data-question="'+q.id+'"','quiet')+'</div>'+(assisted?'<aside class="hint-box"><strong>Подсказка использована</strong><p>'+esc(q.hint)+'</p></aside>':'')+'<div class="stage-footer">'+(d.index?button('← Назад','test-index','data-index="'+(d.index-1)+'"'):'<span></span>')+'<a href="#test/overview">Обзор всех вопросов ↗</a></div></section>';
}
function results(){
 const total=stats(state),run=state.test.runs.at(-1),res=run?testResult(run):[];
 return '<section class="results-page"><p class="eyebrow">Результаты решения задач</p><h1>Результаты изучения</h1><div class="stats-grid"><div><strong>'+total.independent+'<small>/'+total.total+'</small></strong><span>С первой попытки<br>без помощи</span></div><div><strong>'+total.corrected+'</strong><span>Исправлено<br>без подсказки</span></div><div><strong>'+total.assisted+'</strong><span>Решено с помощью</span></div><div><strong>'+CHAPTERS.filter(c=>state.chapters[c.id].collected).length+'<small>/'+CHAPTERS.length+'</small></strong><span>Итогов глав<br>сохранено</span></div></div><p class="caption">Это результаты практики. Правильный ответ после подсказки или просмотра не повышает число самостоятельных первых решений.</p><div class="topic-grid">'+CHAPTERS.map(c=>{const s=stats(state,c.id);return '<article class="panel"><p class="eyebrow">Глава '+c.number+'</p><h2>'+c.title+'</h2><p>'+s.solved+' / 5 решено · '+s.independent+' с первой</p>'+link('Вернуться к практике','lesson/'+c.id+'/practice','quiet')+'</article>';}).join('')+'</div><section class="test-results"><div class="section-heading"><div><p class="eyebrow">Итоговая самопроверка</p><h2>'+ (run?'Последняя попытка':'Пока нет завершённой попытки')+'</h2></div>'+link(run?'Пройти ещё раз ↗':'Начать ↗','test','primary')+'</div>'+(run?'<div class="test-score"><strong>'+res.filter(x=>x.independent).length+' / '+res.length+'</strong><p>верно без подсказки<br><span class="muted">'+res.filter(x=>x.correct&&x.assisted).length+' верно с помощью · '+res.filter(x=>!x.correct).length+' к повторению</span></p></div><div class="topic-result">'+CHAPTERS.filter(c=>res.some(x=>x.chapter===c.id)).map(c=>{const subset=res.filter(x=>x.chapter===c.id);return '<p>Глава '+c.number+': '+subset.filter(x=>x.independent).length+' / '+subset.length+' без помощи</p>';}).join('')+'</div><div class="review-breakdown">'+testQuestions(run).map((q,i)=>{const s=res[i];return '<details><summary><span>'+String(i+1).padStart(2,'0')+' · '+esc(q.title)+'</span><span class="result-status">'+(!s.valid?'Пропущено':s.correct?s.assisted?'Верно с помощью':'Верно':'К повторению')+'</span></summary><p>'+esc(q.prompt)+'</p><p class="submitted-answer"><b>Ваш ответ:</b> '+describe(q,run.answers[q.id])+'</p><p>'+esc(q.explanation)+'</p></details>';}).join('')+'</div><p class="caption">Хранится до 20 завершённых попыток. Для каждой попытки сохраняются ответы и использование подсказок.</p>':'<p>Здесь появится разбор новых примеров и результаты по темам.</p>')+'</section>'+link('Задачи для повторения →','review','primary')+'</section>';
}
function describe(q,answer){
 return q.parts.map(p=>{const v=answer?.[p.id];if(v===undefined||v==='')return '—';if(p.type==='multi')return esc(v.map(id=>p.options.find(o=>o.id===id)?.text||'—').join('; '));if(p.type==='choice')return esc(p.options.find(o=>o.id===v)?.text||'—');return esc(v);}).join(' / ');
}
function review(){
 const ids=reviewIds(state),run=state.test.runs.at(-1),tr=run?testResult(run).filter(x=>!x.independent):[];
 return '<section class="narrow"><p class="eyebrow">Повторение</p><h1>Задачи для повторения</h1><p class="lead">Ошибки, помощь, пропуски и ваши отметки. Можно повторять в любом порядке.</p>'+(ids.length?'<div class="review-list">'+ids.map(id=>{const q=BY_ID[id],s=status(state.records[id],q);return '<article class="review-row"><div><p class="eyebrow">Глава '+CHAPTERS.find(c=>c.id===q.chapter).number+'</p><h3>'+esc(q.title)+'</h3><p class="muted">'+s.label+(s.pinned?' · ваша отметка':'')+'</p></div>'+button('Повторить ↗','question','data-question="'+id+'"','primary')+'</article>';}).join('')+'</div>':'<div class="empty-state"><span aria-hidden="true">↗</span><h2>Задач для повторения пока нет</h2><p>Она появится после практики. Любую задачу можно отметить вручную.</p>'+link('Открыть главу 01','lesson/one/meaning','primary')+'</div>')+(tr.length?'<h2 class="section-space">Из последней самопроверки</h2>'+tr.map(s=>{const q=BY_ID[s.id];return '<details class="deep"><summary>'+esc(q.title)+' · '+(s.assisted?'с помощью':'к повторению')+'</summary><p>'+esc(q.prompt)+'</p><p>'+esc(q.explanation)+'</p></details>';}).join('')+link('Пройти новую самопроверку','test','primary'):'')+'</section>';
}
function dataPage(){
 let preview='';if(pendingImport){const s=stats(pendingImport);preview='<div class="import-preview"><h3>Готово к импорту</h3><p>'+s.solved+' задач решено; '+s.independent+' с первой; '+pendingImport.test.runs.length+' попыток теста.</p><p>Заменится только '+(store.sandbox?'пробный':'основной')+' прогресс SYN на этом устройстве. Текущий сохранится в резерв.</p>'+button('Заменить прогресс этим файлом','confirm-import','','primary')+button('Отмена','cancel-import')+'</div>';}
 return '<section class="narrow"><p class="eyebrow">Ваши данные / только SYN</p><h1>Сохранение и перенос прогресса</h1><p class="lead">Прогресс хранится в этом браузере. Очистка данных сайта может его удалить. Для переноса сохраните экспорт.</p><section class="panel"><h2>Резервная копия</h2><p>JSON содержит ответы, первые попытки, подсказки, итоги глав и результаты. Он никуда не отправляется приложением.</p><div class="actions">'+button('Экспортировать прогресс ↓','export','','primary')+'<label class="btn secondary file-label">Выбрать файл импорта<input id="import-file" type="file" accept=".json,application/json"></label></div>'+preview+'</section><section class="panel"><h2>Отдельный пробный режим</h2><p>'+(store.sandbox?'Вы в отдельном пробном режиме. Основной прогресс сохраняется без изменений.':'Пробный режим создаёт отдельный профиль без решённых задач. Решение задач и сброс в этом режиме не изменяют основной прогресс.')+'</p>'+button(store.sandbox?'Вернуться к основному прогрессу':'Начать чистый пробный режим',store.sandbox?'end-sandbox':'begin-sandbox','','primary')+'</section><section class="panel"><h2>Представление и доступность</h2><label class="toggle"><input id="reduce-motion" type="checkbox" '+(state.prefs.reduceMotion?'checked':'')+'> Уменьшить движение</label><p class="caption">Системная настройка reduced motion учитывается всегда. Звук не нужен; формулы доступны текстом и в словаре.</p><p class="caption">'+(offlineReady?'Оболочка сохранена для открытия без сети в этом браузере. Внешние источники требуют интернет.':'Офлайн-копия пока не подтверждена в этом браузере; всё содержимое доступно в текущей вкладке.')+'</p></section><section class="panel"><h2>Начать заново или восстановить</h2><p>Сброс касается только текущего '+(store.sandbox?'пробного':'основного')+' профиля SYN. Перед заменой сохраняется один резерв, доступный для отмены.</p><div class="actions">'+button('Сбросить текущий прогресс','ask-reset','','danger')+button('Отменить последнюю замену','undo')+button('Скачать исходный резерв','raw-backup','','quiet')+'</div>'+(confirmation==='reset'?'<div class="confirm-box" role="alert"><strong>Сбросить именно '+(store.sandbox?'пробный':'основной')+' прогресс?</strong><p>Прогресс будет заменён новым профилем без решённых задач. Резерв позволит отменить сброс.</p>'+button('Да, сбросить с резервом','confirm-reset','','danger')+button('Сохранить как есть','cancel-reset')+'</div>':'')+'</section><p class="caption">SYN Study '+VERSION+' · Облачной синхронизации, рекламы и аналитических трекеров нет.</p></section>';
}
function render(){
 const r=route();currentRoute=r;
 formMessage='';
 if(r.page==='lesson')state.resume={page:'lesson',chapter:r.chapter};
 else if(r.page==='test'&&r.sub==='run')state.resume={page:'test',chapter:'one'};
 const body=r.page==='home'?home():r.page==='lesson'?lesson(r):r.page==='test'?testPage(r):r.page==='results'?results():r.page==='review'?review():dataPage();
 $('#app').innerHTML=shell(body,r);
 if(!store.blocked)save();
 document.title='SYN Study · '+(r.page==='lesson'?CHAPTERS.find(c=>c.id===r.chapter).title:'Математический анализ');
}
function getAnswer(){
 const form=$('#answer-form');if(!form)return {};
 const q=BY_ID[form.dataset.question],a={};
 for(const p of q.parts){
  const inputs=[...form.querySelectorAll('[data-part="'+p.id+'"]')];
  if(p.type==='multi')a[p.id]=inputs.filter(x=>x.checked).map(x=>x.value);
  else if(p.type==='choice'){const v=inputs.find(x=>x.checked);if(v)a[p.id]=v.value;}
  else a[p.id]=inputs[0]?.value||'';
 }
 return a;
}
function draftChanged(){
 const form=$('#answer-form');if(!form)return;
 const id=form.dataset.question,a=getAnswer();
 if(id.startsWith('t-')&&state.test.draft)state.test.draft.answers[id]=a;
 else record(state,id).draft=a;
 save();$('#form-message').textContent='';
}
function questionAt(id){
 const q=BY_ID[id];if(!q||id.startsWith('t-'))return;
 state.chapters[q.chapter].index=PRACTICE.filter(q2=>q2.chapter===q.chapter).findIndex(q2=>q2.id===id);
 state.chapters[q.chapter].stage='practice';save();nav('lesson/'+q.chapter+'/practice');window.scrollTo(0,0);focusReading('.lesson-body h2');
}
function testIndex(i){if(!state.test.draft)return;state.test.draft.index=Math.max(0,Math.min(testQuestions(state.test.draft).length-1,Number.isInteger(i)?i:0));save();nav('test/run');window.scrollTo(0,0);}
function moveQuestion(dir,id){
 const c=state.chapters[id],qs=PRACTICE.filter(q=>q.chapter===id);
 if(dir>0&&!status(state.records[qs[c.index].id],qs[c.index]).solved)event(state,qs[c.index].id,'skip');
 if(dir>0&&c.index===qs.length-1){nav('lesson/'+id+'/insight');return;}
 c.index=Math.max(0,Math.min(qs.length-1,c.index+dir));save();render();window.scrollTo(0,0);focusReading('.lesson-body h2');
}
function nextTest(){const d=state.test.draft;if(d.index===testQuestions(d).length-1){save();nav('test/overview');}else testIndex(d.index+1);}
function download(text,name,type='application/json'){
 if(nativeAndroid){
  window.SynAndroid.saveJson(text,name);
  announce('Выберите, куда сохранить JSON.');
  return;
 }
 const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
window.addEventListener('syn-native-export',e=>{
 announce(e.detail==='saved'?'Файл сохранён.':e.detail==='cancelled'?'Сохранение отменено.':'Не удалось сохранить файл. Попробуйте ещё раз.');
});
function trace(){
 if(traceActive)return;traceActive=true;
 const board=$('.model-board');if(!board){traceActive=false;return;}
 board.classList.remove('tracing');void board.offsetWidth;board.classList.add('tracing');
 announce(state.prefs.reduceMotion||matchMedia('(prefers-reduced-motion: reduce)').matches?'Соответствующие пары выделены без анимации. Значения указаны под схемой.':'Выделены пары с выбранным элементом A.');
 setTimeout(()=>{board.classList.remove('tracing');traceActive=false;},950);
}
document.addEventListener('submit',e=>{
 if(e.target.id!=='answer-form')return;e.preventDefault();
 const id=e.target.dataset.question,a=getAnswer(),q=BY_ID[id],g=grade(q,a);
 if(!g.valid){$('#form-message').textContent=g.empty?'Заполните все части ответа. Можно также отложить задачу.':'Формат не распознан. Проверьте число или список элементов; математическая попытка ещё не записана.';return;}
 if(id.startsWith('t-')){state.test.draft.answers[id]=a;save();nextTest();}
 else{submit(state,id,a);save();render();$('.feedback')?.scrollIntoView({block:'nearest',behavior:'instant'});focusReading('.feedback');}
});
document.addEventListener('input',e=>{
 if(e.target.closest('#answer-form'))draftChanged();
 if(e.target.dataset.foundationField){const key=e.target.dataset.foundationField;state.foundation=normaliseFoundation({...state.foundation,[key]:Number(e.target.value)});save();const out=document.querySelector('[data-foundation-value="'+key+'"]');if(out)out.textContent=state.foundation[key].toLocaleString('ru-RU');$('#foundation-model-output').innerHTML=foundationOutput(currentRoute.chapter,state.foundation);}
 if(e.target.dataset.modelField){const key=e.target.dataset.modelField;state.models=normaliseModels({...state.models,[key]:key==='method'?e.target.value:Number(e.target.value)});save();const out=document.querySelector('[data-model-value="'+key+'"]');if(out)out.textContent=state.models[key].toLocaleString('ru-RU');$('#advanced-model-output').innerHTML=advancedModelOutput(currentRoute.chapter,state.models);}
 if(e.target.id==='map-input'){
  state.labs.input=Number(e.target.value);save();
  // Keep the slider and focus in place while updating the mathematical view.
  const x=state.labs.input,y=(x-1)**2,branch=state.labs.preset==='branch',px=branch?65+(x-1)*135:65+(x+1)*67.5,py=65+y*67.5;
  $('#input-number').textContent=x;$('#output-number').textContent=y;
  const svg=$('.mapping svg');svg.setAttribute('aria-label','Аргумент '+x+', значение функции '+y);
  svg.querySelector('.map-edge').setAttribute('d','M'+px+' 77C'+px+' 117 '+py+' 132 '+py+' 173');
  const nodes=svg.querySelectorAll('circle');nodes[0].setAttribute('cx',px);nodes[1].setAttribute('cx',py);
 }
});
document.addEventListener('change',async e=>{
 try{
  if(e.target.closest('#answer-form'))draftChanged();
  if(e.target.id==='relation-mode'){state.labs.relation=e.target.value;state.labs.checked=false;save();render();$('#relation-mode').focus();}
  if(e.target.id==='map-preset'){state.labs.preset=e.target.value;if(e.target.value==='branch')state.labs.input=Math.max(1,state.labs.input);save();render();$('#map-preset').focus();}
  if(e.target.id==='reduce-motion'){state.prefs.reduceMotion=e.target.checked;save();document.body.classList.toggle('reduce-motion',state.prefs.reduceMotion);}
  if(e.target.id==='import-file'){
   const file=e.target.files[0];if(!file)return;if(file.size>1_000_000)throw Error('Файл больше 1 МБ.');
   pendingImport=importText(await file.text());confirmation=null;render();$('.import-preview')?.scrollIntoView({block:'center'});
  }
 }catch(err){announce(err.message);e.target.value='';}
});
document.addEventListener('click',e=>{
 if(e.target.closest('.skip-link')){e.preventDefault();$('#main').focus();return;}
 const el=e.target.closest('[data-action]');if(!el)return;
 try{
  const a=el.dataset.action,id=el.dataset.question;
  if(a==='glossary'){
   if(currentRoute?.page==='test'&&currentRoute.sub==='run'&&state.test.draft){const d=state.test.draft,id=testQuestions(d)[d.index].id;if(!d.hints.includes(id))d.hints.push(id);save();announce('Словарь в этом вопросе отмечен как помощь.');}
   $('#glossary').showModal();$('#glossary button').focus();
  }
  if(a==='close-glossary')$('#glossary').close();
  if(a==='collect'){state.chapters[el.dataset.chapter].collected=true;save();render();announce('Итоги главы сохранены.');}
  if(a==='rel-input'){state.labs.relationInput=Number(el.dataset.value);save();render();}
  if(a==='rel-check'){state.labs.checked=true;save();render();}
  if(a==='trace')trace();
  if(a==='question')questionAt(id);
  if(a==='prev-question')moveQuestion(-1,el.dataset.chapter);
  if(a==='next-question')moveQuestion(1,el.dataset.chapter);
  if(['hint','reveal'].includes(a)){event(state,id,a);save();render();focusReading(a==='hint'?'.hint-box':'.explanation');}
  if(a==='pin'){record(state,id).pinned=!record(state,id).pinned;save();render();}
  if(a==='skip'){
   if(id.startsWith('t-')){state.test.draft.answers[id]=getAnswer();save();nextTest();}
   else{event(state,id,'skip');save();moveQuestion(1,BY_ID[id].chapter);}
  }
  if(a==='start-test'){startTest(state);save();nav('test/run');}
  if(a==='test-index')testIndex(Number(el.dataset.index));
  if(a==='test-hint'){const d=state.test.draft;if(!d.hints.includes(id))d.hints.push(id);save();render();}
  if(a==='finish-test'){if(finishTest(state)){save();nav('results');window.scrollTo(0,0);}}
  if(a==='export')download(exportText(state),'SYN-Study-'+(store.sandbox?'trial-':'')+new Date().toISOString().slice(0,10)+'.json');
  if(a==='begin-sandbox'){store.begin();state=store.state;nav('home');announce('Включён отдельный пробный режим.');}
  if(a==='end-sandbox'){store.end();state=store.state;nav('home');announce('Вы вернулись к основному прогрессу.');}
  if(a==='confirm-import'){state=store.replace(pendingImport);pendingImport=null;render();announce('Импорт завершён. Предыдущие данные сохранены в резерве.');}
  if(a==='cancel-import'){pendingImport=null;render();}
  if(a==='ask-reset'){confirmation='reset';render();$('.confirm-box')?.scrollIntoView({block:'center'});}
  if(a==='cancel-reset'){confirmation=null;render();}
  if(a==='confirm-reset'){state=store.replace(fresh());confirmation=null;render();announce('Прогресс сброшен. Можно отменить замену.');}
  if(a==='undo'){state=store.undo();render();announce('Предыдущий прогресс восстановлен.');}
  if(a==='raw-backup'){const raw=store.rawBackup();if(!raw)throw Error('Резервной копии пока нет.');download(raw,'SYN-Study-raw-backup.json');}
 }catch(err){announce(err.message);save();}
});
window.addEventListener('hashchange',()=>{render();window.scrollTo(0,0);$('#main').focus({preventScroll:true});});
window.addEventListener('storage',()=>{const w=$('#save-warning');if(w){w.hidden=false;w.textContent='Данные или режим изменились в другой вкладке. Перед продолжением перезагрузите страницу.';}});
if(!location.hash&&state.resume.page==='lesson')location.replace('#lesson/'+state.resume.chapter+'/'+state.chapters[state.resume.chapter].stage);
render();
if('serviceWorker' in navigator&&location.protocol!=='file:'&&!nativeAndroid){
 navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(()=>navigator.serviceWorker.ready).then(async()=>{offlineReady=await caches.has('syn-study-shell-1.2.0');}).catch(()=>{offlineReady=false;});
}
