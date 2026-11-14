import {BOOK_THEORY} from './book-theory.js';
import {BOOKS, BOOK_SECTIONS} from './book-catalog.js';
import {BY_ID} from './content.js';
import {status} from './core.js';
import {escapeHtml as e, guideFor, knowledgeLinks, stepList} from './reading-ui.js';

const path = section => 'books/'+section.id;
const anchor = (url, label, kind='') => '<a href="#'+url+'"'+(kind?' class="btn '+kind+'"':'')+'>'+e(label)+'</a>';
const reference = section => '§ '+section.number+' · с. '+section.page;
const original = book => '<a href="'+book.url+'" target="_blank" rel="noreferrer">Открыть скан издания ↗</a>';
const exerciseId = key => /^(l\d|s-)/.test(key) ? key : 'b-'+key;

export function bookRoute(parts) {
 if (parts[1]==='tasks')return {page:'books', tasks:true};
 const book = BOOKS.find(item => item.id===parts[1]);
 if (!book) return {page:'books'};
 if (parts[2]==='tasks')return {page:'books', book, tasks:true};
 const section = BOOK_SECTIONS.find(item => item.id===parts.slice(1,4).join('/'));
 const question = section?.exercises.map(exerciseId).find(id => id===parts[4]);
 if (question) return {page:'task', question, bookSection:section};
 return {page:'books', book, section, group:book.groups.find(group => group.id===parts[2])?.id};
}

export function firstBookSection(id) {
 return BOOK_SECTIONS.find(section => section.exercises.map(exerciseId).includes(id));
}

function solved(section,state) {
 return section.exercises.filter(key => {
  const id = exerciseId(key);
  return status(state.records[id],BY_ID[id]).solved;
 }).length;
}

function bookTheory(section) {
 const notes=BOOK_THEORY[section.book.id]?.[section.number-1];
 if (!notes) return '';
 const guides=section.exercises.map(key=>guideFor(BY_ID[exerciseId(key)]));
 const refs=[...new Map(guides.flatMap(g=>g.prerequisites).map(ref=>[ref.chapter+'/'+ref.topic,ref])).values()];
 const example=guides[0].analogous;
 return '<section class="panel book-theory"><h2>Теория параграфа</h2><p class="caption">Краткий конспект SYN</p>'+
  '<ul class="book-notes">'+notes.map(note=>'<li>'+e(note)+'</li>').join('')+'</ul>'+
  '<details><summary>Теория и доказательства курса</summary>'+knowledgeLinks(refs,'',true)+'</details>'+
  '</section><details class="panel book-example"><summary>Разобранный пример SYN</summary><p>'+e(example.statement)+'</p>'+
  stepList(example.steps)+(example.result?'<p class="solution-result">'+e(example.result)+'</p>':'')+'</details>';
}

export function bookTaskList(state,book) {
 const locations=new Map(),groups=new Map();
 for(const section of BOOK_SECTIONS){
  if(book&&section.book!==book)continue;
  for(const id of section.exercises.map(exerciseId)){
   if(!locations.has(id)){
    locations.set(id,[]);
    if(!groups.has(section))groups.set(section,[]);
    groups.get(section).push(id);
   }
   locations.get(id).push(section);
  }
 }
 const back=book?'books/'+book.id:'books';
 return '<section class="reading-page book-task-list">'+anchor(back,book?'← К оглавлению':'← К задачникам','quiet')+
  '<h1>Все задачи SYN</h1>'+(book?'<p class="lead">'+e(book.name)+'</p>':'')+
  '<label class="field-label" for="book-task-search">Поиск по теме, условию или параграфу</label>'+
  '<input id="book-task-search" type="search" maxlength="120" autocomplete="off" placeholder="Например, предел или § 8" aria-controls="book-search-results">'+
  '<p class="caption" id="book-task-count" role="status">Показано '+locations.size+' из '+locations.size+' задач</p><div id="book-search-results">'+
  [...groups].map(([section,ids])=>'<section class="book-task-group"><h2>'+anchor(path(section),section.title)+'</h2>'+
   '<p class="caption">'+e((book?'':section.book.name+' · ')+section.group.title+' · '+reference(section))+'</p>'+
   '<ul class="book-exercise-list">'+ids.map(id=>exercisePreview(section,id,state,locations.get(id))).join('')+'</ul></section>').join('')+
  '</div></section>';
}

function exercisePreview(section,id,state,locations=[section]){
 const q=BY_ID[id],progress=status(state.records[id],q);
 const description=locations.map(s=>s.title+' '+s.group.title+' '+s.book.name+' '+reference(s)).join(' ');
 return '<li class="book-exercise" data-book-search="'+e(description)+'"><h3><a href="#'+path(section)+'/'+id+
  '" data-reading-link>'+e(q.title)+'</a></h3><p>'+e(q.prompt)+'</p><p class="caption">'+e(progress.label)+'</p></li>';
}

export function filterBookTasks(root,query) {
 const normalize=value=>value.toLocaleLowerCase('ru-RU').replaceAll('ё','е').replace(/§\s*(\d+)/g,'§$1');
 const words=normalize(query.trim()).split(/\s+/).filter(Boolean);
 let visible=0,total=0;
 for(const group of root.querySelectorAll('.book-task-group')){
  let count=0;
  for(const item of group.querySelectorAll('.book-exercise')){
   const haystack=normalize(item.dataset.bookSearch+' '+item.textContent);
   item.hidden=!words.every(word=>/^§\d+$/.test(word)
    ? haystack.split(/\s+/).includes(word)
    : haystack.includes(word));
   if(!item.hidden)count++;
   total++;
  }
  group.hidden=count===0;
  visible+=count;
 }
 root.querySelector('#book-task-count').textContent=visible?'Показано '+visible+' из '+total+' задач':'Задачи по этому запросу не найдены.';
}

export function booksPage(state,book,section) {
 if (!book) return '<section class="reading-page"><h1>Задачники</h1>'+
  '<p class="lead">Выберите параграф, чтобы решить задачи SYN или сразу открыть разбор. Задачи, которые встречаются в нескольких книгах, имеют общий прогресс.</p>'+
  '<div class="actions">'+anchor('books/tasks','Все задачи SYN','primary')+'</div>'+
  '<div class="practice-catalog">'+BOOKS.map(item => {
   const sections = BOOK_SECTIONS.filter(s => s.book===item);
   const completed = sections.filter(s => solved(s,state)===s.exercises.length).length;
   return '<article class="panel"><h2>'+e(item.name)+'</h2><p>'+e(item.title)+'</p>'+
    '<p class="caption">'+e(item.edition)+' · завершено '+completed+' / '+sections.length+' параграфов</p>'+
    anchor('books/'+item.id,'Открыть задачник','primary')+'</article>';
  }).join('')+'</div></section>';

 const sections = BOOK_SECTIONS.filter(s => s.book===book);
 if (section) {
  const index = sections.indexOf(section);
  const prev = sections[index-1], next = sections[index+1];
  return '<section class="reading-page book-paragraph">'+anchor('books/'+book.id+'/'+section.group.id,'← К оглавлению','quiet')+
   '<p class="eyebrow">'+e(section.group.title)+' · '+reference(section)+'</p><h1>'+e(section.title)+'</h1>'+
   '<p>'+original(book)+'</p>'+bookTheory(section)+'<h2>Задачи SYN</h2><ul class="book-exercise-list">'+
   section.exercises.map(key=>exercisePreview(section,exerciseId(key),state)).join('')+
   '</ul><div class="stage-footer">'+(prev?anchor(path(prev),'← Предыдущий параграф','secondary'):'')+
   (next?anchor(path(next),'Следующий параграф →','primary'):'')+'</div></section>';
 }

 return '<section class="reading-page">'+anchor('books','← Все задачники','quiet')+
  '<h1>'+e(book.name)+'</h1><p class="lead">'+e(book.title)+'</p>'+
  '<p>'+e(book.authors)+'<br>'+e(book.edition)+' · ISBN '+book.isbn+'</p><p>'+original(book)+'</p>'+
  '<div class="actions">'+anchor('books/'+book.id+'/tasks','Все задачи этого издания','primary')+'</div>'+
  '<nav class="reading-chapters" aria-label="Главы задачника">'+book.groups.map(group =>
   '<a href="#books/'+book.id+'/'+group.id+'">'+e(group.title)+'</a>').join('')+'</nav>'+
  book.groups.map(group => '<section class="book-group" id="book-group-'+group.id+'"><h2>'+e(group.title)+'</h2><ol class="book-sections">'+
   sections.filter(s => s.group===group).map(s => {
    const count=solved(s,state);
    return '<li><a href="#'+path(s)+'"><span class="book-ref">'+reference(s)+
     '</span><span>'+e(s.title)+'</span><span class="book-progress" aria-label="Решено '+count+' из '+s.exercises.length+'">'+
     count+' / '+s.exercises.length+'</span></a></li>';
   }).join('')+'</ol></section>').join('')+'</section>';
}

export function bookTask(section,id) {
 if (!section) return null;
 const index = section.exercises.map(exerciseId).indexOf(id);
 const exercisePath = key => key ? path(section)+'/'+exerciseId(key) : path(section);
 return {
  label:section.book.name+' · '+reference(section),
  back:path(section),
  previous:exercisePath(section.exercises[index-1]),
  next:exercisePath(section.exercises[index+1])
 };
}
