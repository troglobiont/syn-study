import {BOOKS, BOOK_SECTIONS} from './book-catalog.js';
import {BY_ID} from './content.js';
import {status} from './core.js';
import {escapeHtml as e} from './reading-ui.js';

const path = section => 'books/'+section.id;
const anchor = (url, label, kind='') => '<a href="#'+url+'"'+(kind?' class="btn '+kind+'"':'')+'>'+e(label)+'</a>';
const reference = section => '§ '+section.number+' · с. '+section.page;
const original = book => '<a href="'+book.url+'" target="_blank" rel="noreferrer">Открыть скан издания ↗</a>';
const exerciseId = key => /^(l\d|s-)/.test(key) ? key : 'b-'+key;

export function bookRoute(parts) {
 const book = BOOKS.find(item => item.id===parts[1]);
 if (!book) return {page:'books'};
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

export function booksPage(state,book,section) {
 if (!book) return '<section class="reading-page"><h1>Задачники</h1>'+
  '<p class="lead">Выберите параграф, чтобы решить задачи SYN или сразу открыть разбор. Задачи, которые встречаются в нескольких книгах, имеют общий прогресс.</p>'+
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
   '<p>'+original(book)+'</p><div class="review-list">'+section.exercises.map(key => {
    const id=exerciseId(key), question=BY_ID[id];
    const progress=status(state.records[id],question);
    return '<article class="review-row"><div><h2>'+e(question.title)+'</h2><p class="caption">'+e(progress.label)+'</p></div>'+
     anchor(path(section)+'/'+id,'Открыть задачу','primary')+'</article>';
   }).join('')+'</div><div class="stage-footer">'+(prev?anchor(path(prev),'← Предыдущий параграф','secondary'):'')+
   (next?anchor(path(next),'Следующий параграф →','primary'):'')+'</div></section>';
 }

 return '<section class="reading-page">'+anchor('books','← Все задачники','quiet')+
  '<h1>'+e(book.name)+'</h1><p class="lead">'+e(book.title)+'</p>'+
  '<p>'+e(book.authors)+'<br>'+e(book.edition)+' · ISBN '+book.isbn+'</p><p>'+original(book)+'</p>'+
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
