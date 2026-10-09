(() => {
"use strict";
const DATA = {translations:"content/translations.json", phrasals:"content/phrasal-verbs.json", vocabulary:"content/vocabulary.json", dialogues:"content/dialogues.json"};
const STORE = "dailyEnglish.progress.v2";
const state = {view:"home", direction:"en-pt", data:{translations:[],phrasals:[],vocabulary:[],dialogues:[]}, queue:[], index:0, progress:loadProgress(), revealed:false};
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
function loadProgress(){try{return JSON.parse(localStorage.getItem(STORE))||{points:0,attempts:0,streak:0,lastDate:null,items:{}}}catch{return {points:0,attempts:0,streak:0,lastDate:null,items:{}}}}
function save(){try{localStorage.setItem(STORE,JSON.stringify(state.progress))}catch(e){console.warn(e)} renderStats()}
async function fetchJson(path){const r=await fetch(path);if(!r.ok)throw Error(`Não foi possível carregar ${path} (${r.status})`);return r.json()}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function norm(s){return String(s||"").toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[’‘`]/g,"'").replace(/[.,!?;:"()[\]]/g," ").replace(/\s+/g," ").trim()}
async function init(){
  $("#today").textContent=new Intl.DateTimeFormat("pt-BR",{dateStyle:"full"}).format(new Date()).toLocaleUpperCase("pt-BR");
  try{
    const loaded=await Promise.all(Object.entries(DATA).map(async ([k,v])=>[k,await fetchJson(v)]));
    for(const [k,v] of loaded) state.data[k]=v;
    renderStats(); renderLibraries(); bind(); startSession();
    $("#content-count").textContent=`${state.data.translations.length} traduções · ${state.data.vocabulary.length} linhas de conteúdo`;
  }catch(e){$("#load-error").classList.remove("hidden");$("#load-error").textContent=`Falha ao carregar o conteúdo: ${e.message}. Execute por servidor local (ex.: VS Code Live Server); não abra via file://.`;bind()}
}
function bind(){
  $$(".nav,[data-view]").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.view)));
  $("#start-session").addEventListener("click",()=>{showView("translation");startSession()});
  $$(".direction").forEach(b=>b.addEventListener("click",()=>{state.direction=b.dataset.direction;$$(".direction").forEach(x=>x.classList.toggle("active",x===b));startSession()}));
  $("#reveal").addEventListener("click",reveal);
  $("#next").addEventListener("click",next);
  $("#skip").addEventListener("click",next);
  $("#mark-knew").addEventListener("click",()=>selfAssess("correct"));
  $("#mark-review").addEventListener("click",()=>selfAssess("review"));
  $("#phrasal-search").addEventListener("input",renderPhrasals);
  $("#vocab-search").addEventListener("input",renderVocabulary);
}
function showView(v){if(!v)return;state.view=v;$$(".view").forEach(x=>x.classList.toggle("hidden",x.id!==`view-${v}`));$$(".nav").forEach(x=>x.classList.toggle("active",x.dataset.view===v));const titles={home:"Vamos praticar?",translation:"Hora da tradução",phrasal:"Phrasal verbs",vocabulary:"Vocabulário",dialogues:"Diálogos"};$("#page-title").textContent=titles[v]||"Daily English"}
function startSession(){
  const pool=state.data.translations.filter(x=>x.direction===state.direction);
  const stats=state.progress.items;
  const due=pool.filter(x=>!stats[x.id]?.nextDue||new Date(stats[x.id].nextDue)<=new Date());
  const source=due.length?due:pool;
  state.queue=[...source].sort((a,b)=>{
    const sa=stats[a.id]?.status==="review"?0:1,sb=stats[b.id]?.status==="review"?0:1;
    return sa-sb || Math.random()-.5;
  }).slice(0,10);
  state.index=0;state.revealed=false;renderQuestion();
}
function current(){return state.queue[state.index]}
function renderQuestion(){
 const x=current(),has=!!x;
 $("#answer").value="";$("#answer").disabled=!has;$("#feedback").className="feedback hidden";
 $("#reveal").classList.toggle("hidden",!has);$("#next").classList.add("hidden");$("#skip").disabled=!has;
 if(!has){$("#prompt").textContent="Nenhum item disponível nesta direção.";$("#counter").textContent="0 questões";return}
 $("#prompt").textContent=x.prompt;$("#direction-label").textContent=x.direction==="en-pt"?"TRADUZA PARA PORTUGUÊS":"TRADUZA PARA INGLÊS";
 $("#item-status").textContent=x.answerStatus==="source-matched-correction"?"REFERÊNCIA DOCUMENTADA":"AUTOAVALIAÇÃO";
 $("#counter").textContent=`Questão ${state.index+1} de ${state.queue.length}`;
 $("#session-progress").textContent=`${state.index} de ${state.queue.length}`;$("#bar").style.width=`${state.index/state.queue.length*100}%`;
}
function reveal(){
 const x=current();if(!x||state.revealed)return;
 const answer=$("#answer").value.trim(),f=$("#feedback");f.classList.remove("hidden");
 if(x.referenceAnswers?.length){
   const exact=x.referenceAnswers.some(a=>norm(a)===norm(answer));
   f.className=`feedback ${exact?"good":"warn"}`;
   f.innerHTML=`<b>${exact?"Correspondência exata com uma referência documentada.":"Compare sua resposta com a referência."}</b>${x.referenceAnswers.map(a=>"Referência: "+a).map(esc).join("\n")}\n\nUma tradução diferente pode ser válida mesmo que não corresponda exatamente. A equivalência semântica ainda exige julgamento humano.`;
 } else {
   f.className="feedback warn";
   const hist=x.historicalAttempt?`\nResposta registrada no documento (tentativa histórica, não gabarito): ${x.historicalAttempt}`:"\nNão há tentativa histórica disponível para este item.";
   f.innerHTML=`<b>Este item ainda não tem gabarito validado.</b>O banco não vai classificar sua resposta automaticamente como certa ou errada.${esc(hist)}\n\nUse “Lembrei” ou “Preciso revisar” para registrar sua autoavaliação.`;
 }
 state.revealed=true;$("#reveal").classList.add("hidden");$("#next").classList.remove("hidden");
 $("#session-progress").textContent=`${state.index+1} de ${state.queue.length}`;$("#bar").style.width=`${(state.index+1)/state.queue.length*100}%`;
}
function record(status){
 const x=current();if(!x)return;
 const today=new Date().toISOString().slice(0,10),p=state.progress;
 p.attempts++;p.items[x.id]=p.items[x.id]||{attempts:0,correct:0,reviewCount:0};
 const s=p.items[x.id];s.attempts++;s.status=status;s.lastReviewed=new Date().toISOString();
 if(status==="correct"){s.correct++;p.points+=10;s.nextDue=addDays(3)}else{s.reviewCount++;s.nextDue=addDays(1)}
 if(p.lastDate!==today){const y=new Date();y.setDate(y.getDate()-1);p.streak=p.lastDate===y.toISOString().slice(0,10)?(p.streak||0)+1:1;p.lastDate=today}
 save();
}
function addDays(n){const d=new Date();d.setDate(d.getDate()+n);return d.toISOString()}
function selfAssess(status){if(!state.revealed){reveal();return}record(status);$("#feedback").innerHTML+=`\n\n<b>Autoavaliação registrada: ${status==="correct"?"lembrei":"preciso revisar"}.</b>`}
function next(){if(state.index>=state.queue.length-1){startSession();return}state.index++;state.revealed=false;renderQuestion()}
function renderStats(){$("#points").textContent=state.progress.points||0;$("#attempts").textContent=state.progress.attempts||0;$("#streak").textContent=`${state.progress.streak||0} dias` ;$("#streak-side").textContent=`${state.progress.streak||0} dias`}
function renderLibraries(){renderPhrasals();renderVocabulary();renderDialogues()}
function renderPhrasals(){
 const q=norm($("#phrasal-search").value||"");
 const arr=state.data.phrasals.filter(x=>norm(`${x.expression} ${x.meaning||""} ${x.example||""} ${x.context||""}`).includes(q));
 $("#phrasal-count").textContent=`${arr.length} registros`;
 $("#phrasal-list").innerHTML=arr.length?arr.map(x=>`<article class="item"><div><h3>${esc(x.expression)}</h3><p><b>Significado:</b> ${esc(x.meaning||"Não definido explicitamente na fonte")}</p>${x.example?`<p><b>Exemplo:</b> ${esc(x.example)}</p>`:""}<p><b>Contexto original:</b> ${esc(x.context||"—")}</p></div><span class="tag">${esc(x.recordType)}${x.usableForQuiz?" · prática": " · revisão pendente"}</span></article>`).join(""):'<div class="empty">Nenhum registro encontrado.</div>';
}
function renderVocabulary(){
 const q=norm($("#vocab-search").value||"");
 const arr=state.data.vocabulary.filter(x=>norm(`${x.term||""} ${x.meaning||""} ${x.example||""} ${x.notes||""} ${x.context||""} ${(x.fields||[]).map(f=>f.value).join(" ")}`).includes(q));
 $("#vocab-count").textContent=`${arr.length} linhas`;
 $("#vocab-list").innerHTML=arr.length?arr.map(x=>`<article class="item"><div><h3>${esc(x.term||"Registro da tabela-fonte")}${x.meaning?` — ${esc(x.meaning)}`:""}</h3>${x.example?`<p><b>Exemplo:</b> ${esc(x.example)}</p>`:""}${x.notes?`<p><b>Nota:</b> ${esc(x.notes)}</p>`:""}<p><b>Campos originais:</b> ${esc((x.fields||[]).map(f=>`${f.header}: ${f.value}`).join(" · "))}</p></div><span class="tag">Tabela ${Number(x.sourceLocation?.tableIndex)+1}</span></article>`).join(""):'<div class="empty">Nenhum item encontrado.</div>';
}
function renderDialogues(){
 $("#dialogue-list").innerHTML=state.data.dialogues.length?state.data.dialogues.map(d=>`<article class="item"><div><h3>${esc(d.title||`Bloco ${d.sequence||""}`)}</h3><p>${esc(d.turns.length)} falas · referência de parágrafos ${esc(JSON.stringify(d.sourceLocation||{}))}</p><div>${d.turns.map(t=>`<div class="dialogue-turn"><p><b>EN:</b> ${esc(t.english)}</p><p><b>PT:</b> ${esc(t.portugueseTranslation)}</p></div>`).join("")}</div></div><span class="tag">limites a revisar</span></article>`).join(""):'<div class="empty">Nenhum diálogo disponível.</div>';
}
document.addEventListener("DOMContentLoaded",init);
})();