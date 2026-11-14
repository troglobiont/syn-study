import assert from 'node:assert/strict';
import {test} from 'node:test';
import {BOOKS,BOOK_SECTIONS} from '../dist/book-catalog.js';
import {BOOK_EXERCISES} from '../dist/book-exercises.js';
import {BY_ID,CHAPTERS} from '../dist/content.js';
import {exportText,fresh,grade,importText,record,reviewIds,stats,submit} from '../dist/core.js';
import {guideFor,guidePanel} from '../dist/reading-ui.js';
import {bookRoute,booksPage,bookTask,bookTaskList,firstBookSection} from '../dist/books-ui.js';

test('all three editions have checked paragraph locations, working routes and complete exercise guides', () => {
 const state=fresh(), used=new Set();
 assert.deepEqual(BOOKS.map(book=>book.groups.map(group=>group.sections.length)),
  [[7,5,3,9],[5,5,2,4,8],[10,15,6,11,11,7,5,17]]);
 assert.equal(new Set(BOOK_SECTIONS.map(s=>s.id)).size,130);
 for(const section of BOOK_SECTIONS){
  const path='books/'+section.id;
  assert.equal(bookRoute(path.split('/')).section,section);
  assert.ok(section.page>0);
  assert.ok(section.exercises.length>0);
  for(const key of section.exercises){
   const id=BY_ID[key]?key:'b-'+key;
   const q=BY_ID[id];
   assert.ok(q,id);
   used.add(id);
   assert.deepEqual(bookRoute((path+'/'+id).split('/')),
    {page:'task',question:id,bookSection:section});
   const guide=guideFor(q);
   for(const ref of guide.prerequisites){
    assert.ok(CHAPTERS.find(c=>c.id===ref.chapter)?.theory.some(t=>t.title===ref.topic),id);
   }
   assert.ok(q.hint&&guide.prerequisites.length&&guide.solution.steps.length&&guide.analogous.steps.length,id);
   assert.equal(bookTask(section,id).back,path);
  }
 }
 assert.equal(used.size,161);
 assert.equal(BOOK_EXERCISES.length,85);
 for(const q of BOOK_EXERCISES)assert.ok(used.has(q.id),q.id);
 assert.match(booksPage(state),/завершено 0 \/ 82 параграфов/);
});

test('new book problems grade, save and share progress without changing course totals', () => {
 const state=fresh(), baseline=stats(state);
 for(const q of BOOK_EXERCISES){
  const part=q.parts[0],answer={a:String(part.answer)};
  assert.equal(grade(q,answer).correct,true,q.id);
  const incorrect={a:part.options?part.options[1].id:String(part.answer+1)};
  assert.equal(grade(q,incorrect).correct,false,q.id);
  submit(state,q.id,answer);
 }
 const id='b-taylor-bound',section=firstBookSection(id),q=BY_ID[id];
 record(state,id).draft={a:'1/750'};
 record(state,id).pinned=true;
 state.study.panels[id]={knowledge:true,hint:true,example:true,solution:true};
 const saved=importText(exportText(state));
 assert.deepEqual(saved.records[id].draft,{a:'1/750'});
 assert.deepEqual(stats(saved),baseline);
 assert.ok(reviewIds(saved).includes(id));
 assert.match(booksPage(saved,section.book),/Решено 2 из 2/);
 const guide=guidePanel(q,saved,{fromBook:true});
 assert.match(guide,/data-reading-link/);
 assert.match(guide,/1\/750/);
});

test('Kudryavtsev notes appear before a worked example and the list of exercise statements', () => {
 const state=fresh();
 for(const book of BOOKS.slice(0,2)){
  const sections=BOOK_SECTIONS.filter(s=>s.book===book);
  for(const section of sections){
   const html=booksPage(state,book,section);
   const theory=html.indexOf('Теория параграфа');
   const example=html.indexOf('Разобранный пример SYN');
   const tasks=html.indexOf('<h2>Задачи SYN</h2>');
   assert.ok(theory>=0&&theory<example&&example<tasks,section.id);
   assert.match(html,/data-reading-link/);
  }
 }
});

test('all-exercise indexes include condition previews and preserve secondary chapter references', () => {
 const state=fresh();
 assert.deepEqual(bookRoute(['books','tasks']),{page:'books',tasks:true});
 for(const book of [undefined,...BOOKS]){
  const href=book?['books',book.id,'tasks']:['books','tasks'];
  assert.equal(bookRoute(href).book,book);
  const ids=new Set(BOOK_SECTIONS.filter(s=>!book||s.book===book).flatMap(s=>s.exercises));
  const html=bookTaskList(state,book);
  assert.equal((html.match(/class="book-exercise"/g)||[]).length,ids.size);
  assert.match(html,/id="book-task-search"/);
 }
 const sample=bookTaskList(state,BOOKS[0]);
 assert.match(sample,/data-book-search="[^"]*Асимптоты и координаты графика[^"]*Построение графика по свойствам функции[^"]*"/);
 assert.match(sample,/Найдите наклонную асимптоту/);
});
