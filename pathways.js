// Home and onboarding share the same profile in the existing student record.
const paths = ['AIBE', 'Advocacy', 'Judiciary'];
const roles = {student:'Law student', practising:'Graduated and practising', judiciary:'Graduated and preparing for judiciary', graduate:'Recent graduate / preparing for AIBE'};
const areas = ['Criminal','Civil','Family','Constitutional and writs','Service','Corporate and IPR'];
let pathDraft, selectedPath;
function answers(){return profile.reg?.pathway || profile.pathway}
function defaultPath(p){
  if(p?.role==='judiciary'||p?.judiciary==='Yes') return 'Judiciary';
  if(p?.role==='practising'||(p?.role==='student'&&p.year!==p.course)) return 'Advocacy';
  return 'AIBE';
}
function pathOptions(key,title,options){
  const items=Array.isArray(options)?options.map(v=>[v,v]):Object.entries(options);
  return '<label class="lbl">'+title+'<select class="txt" required onchange="pathChange(\''+key+'\',this.value)"><option value="">Choose an option</option>'+items.map(([v,label])=>'<option value="'+esc(v)+'" '+(pathDraft[key]===v?'selected':'')+'>'+esc(label)+'</option>').join('')+'</select></label>';
}
function pathChange(key,value){
  pathDraft[key]=value;
  if(key==='role') pathDraft={role:value};
  if(key==='course' && +pathDraft.year>+value) delete pathDraft.year;
  if(key==='judiciary'&&value!=='Yes') delete pathDraft.target;
  render();
}
function pathForm(){
  pathDraft ||= {...answers()};
  const p=pathDraft;
  let fields=pathOptions('role','Where are you in your law journey?',roles);
  if(p.role==='student'){
    fields+=pathOptions('course','LL.B. course',{'3':'3-year LL.B.','5':'5-year LL.B.'});
    if(p.course) fields+=pathOptions('year','Current year',Array.from({length:+p.course},(_,i)=>String(i+1)));
    fields+=pathOptions('judiciary','Also preparing for judicial services?',['Yes','No']);
  }
  if(p.role==='practising') fields+=pathOptions('area','Main practice area',areas);
  if(p.role==='judiciary'||p.judiciary==='Yes') fields+=pathOptions('target','Target judiciary state',['Uttar Pradesh',...STATES.filter(v=>v!=='Uttar Pradesh')]);
  return '<form class="card path-form" onsubmit="event.preventDefault();savePath()"><h2>Personalise your Home</h2>'+fields+'<button type="button" class="btn gold" onclick="if(this.form.reportValidity())savePath()">Save and continue</button></form>';
}
function savePath(){
  if(profile.reg){
    profile.reg.pathway={...pathDraft};
    profile.pathPending=true;
    delete profile.pathway;
  }else profile.pathway={...pathDraft};
  store.set('dhara_profile',profile);
  selectedPath=null;pathDraft=null;
  navTab('home');scheduleSync();
}
async function syncPath(){
  if(!profile.pathPending||!profile.reg?.pathway)return;
  const account=profile, data=profile.reg.pathway;
  await DB.doc('students/'+UID).set({pathway:data},{mergeFields:['pathway']});
  if(profile===account&&profile.reg.pathway===data){
    delete profile.pathPending;store.set('dhara_profile',profile);
  }
}
function pathButton(label,action,detail=''){
  return '<button class="path-link" onclick="'+action+'"><span><b>'+esc(label)+'</b>'+(detail?'<small>'+esc(detail)+'</small>':'')+'</span><span aria-hidden="true">›</span></button>';
}
function relevantBrief(item,area){
  if(!area)return true;
  const text=[item.h?.[0],item.cite,...(item.art||[]).map(p=>p?.[1]?.[0]||'')].join(' ');
  if(area==='Family')return /matrimonial|divorce|custody|maintenance of (wife|child)|family court|marriage|alimony/i.test(text);
  return ({Criminal:['crim'],Civil:['cpc','civ'],'Constitutional and writs':['con'],Service:['svc'],'Corporate and IPR':['jur','civ']})[area]?.includes(item.sid);
}
function advocacyHome(){
  const area=answers()?.area;
  const briefs=allItems().filter(i=>relevantBrief(i,area)).sort((a,b)=>b.d.localeCompare(a.d)).slice(0,3);
  return '<h3>Judgment briefs'+(area?' · '+esc(area):'')+'</h3>'+ (briefs.map(i=>pathButton(L2(i.h),'itemOpen(decodeURIComponent(\''+encodeURIComponent(i.key).replace(/'/g,'%27')+'\'))',i.d)).join('')||'<p>No matching brief in the current collection.</p>')+pathButton('Browse all briefs',"go('briefs')")+ '<h3>Chamber practice</h3>'+pathButton('Senior’s Desk',"go('cases')",'Work through a case file with a senior')+pathButton('Drafting practice',"go('drafting')")+pathButton('Bare Acts',"go('statutes')")+pathButton('Legal jobs',"go('jobs')");
}
function pathHome(){
  const p=answers(), active=selectedPath||(p?defaultPath(p):null);
  const tabs='<div class="path-tabs" aria-label="Home segments">'+paths.map(s=>'<button aria-pressed="'+(s===active)+'" onclick="selectedPath=\''+s+'\';render()">'+s+'</button>').join('')+'</div>';
  const introductions={AIBE:['Bar exam preparation','Practise questions, sit a mock, or challenge a classmate.'],Advocacy:['The advocate’s desk','Read judgments and practise the work of a chamber.'],Judiciary:['Judicial services preparation',p?.target?'Target state · '+p.target:'Study civil procedure and practise previous papers.']};
  const [title,sub]=introductions[active]||["Welcome to Dhaara","Choose a segment above or personalise your Home below."];
  let content='';
  if(active==='AIBE')content=pathButton('Daily mock',"go('sprint')")+pathButton('Previous-year papers and full mocks',"navTab('papers')")+pathButton('Subject chambers',"navTab('practice')")+pathButton('Battles',"go('verdict')");
  if(active==='Advocacy')content=advocacyHome();
  if(active==='Judiciary')content=pathButton('CPC study track',"jStart();go('jplan')")+pathButton('Black Coat map',"go('coat')")+pathButton('Uttar Pradesh · Previous-year papers',"go('uppapers')",'Prelims and mains · 2012–2022');
  return TOPBAR()+tabs+'<div class="path-hero"><h2>'+title+'</h2><p>'+esc(sub)+'</p></div><main class="section path-body">'+(!p?pathForm():'')+content+'</main>'+ownerCard()+webSaveNudge()+commCard()+(!profile.reg?'<div class="section">'+pathButton('Create your free account',"go('signup')")+'</div>':'')+nav();
}
function audienceCard(rows){
  const profiles=rows.map(r=>r.pathway).filter(Boolean);
  const count=fn=>profiles.filter(fn).length;
  const list=(title,labels,fn)=>'<h4>'+title+'</h4>'+labels.map(v=>'<div class="path-stat"><span>'+esc(v)+'</span><strong>'+count(p=>fn(p,v))+'</strong></div>').join('');
  return '<section class="section"><div class="card"><h3>Audience profile</h3><p>'+profiles.length+' of '+rows.length+' loaded accounts answered</p>'+list('Law school',['1','2','3','4','5'].map(v=>'Year '+v),(p,v)=>p.role==='student'&&'Year '+p.year===v)+list('Practice area',areas,(p,v)=>p.role==='practising'&&p.area===v)+'<div class="path-stat"><b>Judiciary aspirants</b><strong>'+count(p=>p.role==='judiciary'||p.judiciary==='Yes')+'</strong></div></div></section>';
}
function pathPage(title,body){return TOPBAR()+'<main class="section path-body"><button class="back" onclick="goBack(\'home\')">← Back</button><h2>'+title+'</h2>'+body+'</main>'+nav()}
const draftPrompt='A client has received a demand for an invoice they say they already paid. Write a short reply identifying the invoice, the payment evidence and the action requested.';
function draftingPage(){
  return pathPage('Drafting practice','<div class="card"><h3>Reply to a disputed demand</h3><p>'+draftPrompt+'</p><label class="lbl">Your draft<textarea rows="8" class="txt" oninput="store.set(\'dhaara_reply_\'+(UID||\'guest\'),this.value)">'+esc(store.get('dhaara_reply_'+(UID||'guest'),''))+'</textarea></label><details><summary>Review your draft</summary><p>Check the invoice date and amount, identify the payment reference, request written confirmation, and list the supporting receipt.</p></details></div>');
}
function statutesPage(){
  const keys=Object.keys(ACTS), key=keys.includes(S.actKey)?S.actKey:keys[0],act=ACTS[key];
  const sections=Object.keys(act.secs), sec=sections.includes(S.sectionKey)?S.sectionKey:sections[0];
  return pathPage('Bare Acts','<div class="card"><label class="lbl">Act<select class="txt" onchange="S.actKey=this.value;S.sectionKey=null;render()">'+keys.map(k=>'<option '+(key===k?'selected':'')+' value="'+esc(k)+'">'+esc(ACTS[k].name)+'</option>').join('')+'</select></label><label class="lbl">'+esc(act.unit)+'<select class="txt" onchange="S.sectionKey=this.value;render()">'+sections.map(k=>'<option '+(sec===k?'selected':'')+'>'+esc(k)+'</option>').join('')+'</select></label><p style="white-space:pre-wrap">'+esc(act.secs[sec])+'</p></div>');
}

function upLibrary(){
  const papers=upPapers.filter(p=>Boolean(p.starts)!==(S.upStage==='mains')).sort((a,b)=>b.year-a.year);
  const years=[...new Set(papers.map(p=>p.year))];
  const buttons=['Prelims','Mains'].map(t=>'<button class="up-choice" aria-pressed="'+((S.upStage||'prelims')===t.toLowerCase())+'" onclick="S.upStage=\''+t.toLowerCase()+'\';render()">'+t+'</button>').join(' ');
  const sections=years.map(y=>'<h3>'+y+'</h3>'+papers.filter(p=>p.year===y).map(p=>pathButton(p.title,"openUpPaper('"+p.id+"')",p.starts?'150 MCQs · '+(p.key?'Provisional key':'Answer-sheet practice'):'Written practice · '+p.pages+' pages')).join('')).join('');
  return pathPage('Uttar Pradesh papers',buttons+sections);
}
let paperAttempt, paperUser;
function upStorage(){return 'dhaara_up_'+paperUser+'_'+S.upPaper}
function openUpPaper(id){
  S.upPaper=id;paperUser=UID||'guest';
  paperAttempt=store.get(upStorage(),null)||{position:1,responses:{},finished:false};
  go('uppractice');
}
function savePaper(){store.set(upStorage(),paperAttempt)}
function upMove(position){
  paperAttempt.position=Number(position);
  delete paperAttempt.scanPage;
  savePaper();render();
}
function upRespond(value){
  if(paperAttempt.finished)return;
  if(value)paperAttempt.responses[paperAttempt.position]=value;
  else delete paperAttempt.responses[paperAttempt.position];
  savePaper();
}
function upFinish(){paperAttempt.finished=true;savePaper();render();window.scrollTo(0,0)}
function upPractice(){
  const p=upPapers.find(entry=>entry.id===S.upPaper);
  if(!p||!paperAttempt)return upLibrary();
  const a=paperAttempt, n=a.position, max=p.starts?150:p.pages;
  const page=a.scanPage||(p.starts?p.starts.filter(start=>start<=n).length:n);
  const source='judiciary/up/'+p.id+'/'+page+'.webp';
  const label=p.starts?'Question':'Page';
  const counts=Object.keys(a.responses).length;
  const options=Array.from({length:max},(_,i)=>'<option value="'+(i+1)+'" '+(n===i+1?'selected':'')+'>'+label+' '+(i+1)+(a.responses[i+1]?' ✓':'')+'</option>').join('');
  const navButtons='<div class="up-controls"><button '+(n===1?'disabled':'')+' onclick="upMove('+ (n-1)+')">Previous</button><select aria-label="'+label+'" onchange="upMove(this.value)">'+options+'</select><button '+(n===max?'disabled':'')+' onclick="upMove('+ (n+1)+')">Next</button></div>';
  let result='';
  if(a.finished){
    result='<div class="card"><h3>Attempt review</h3><p>'+counts+' of '+max+' '+(p.starts?'questions answered':'pages with written answers')+'.</p>';
    if(p.key){
      const correct=Object.entries(a.responses).filter(([q,v])=>p.key[q-1]===v).length;
      result+='<p><b>'+correct+' correct</b> · '+(counts-correct)+' incorrect · '+(max-counts)+' skipped</p><small>Practice result using the UPPSC Series A key issued for objections.</small>';
    }
    result+='<button class="more" onclick="paperAttempt.finished=false;savePaper();render()">Continue editing</button></div>';
  }
  const answer=p.starts?'<div class="up-controls"><b>Q'+n+'</b>'+['A','B','C','D'].map(v=>'<button class="up-choice" aria-pressed="'+(a.responses[n]===v)+'" '+(a.finished?'disabled':'')+' onclick="upRespond(\''+v+'\');render()">'+v+'</button>').join('')+'</div>'+ (a.finished&&p.key?'<p>Provisional key for Q'+n+' · <b>'+p.key[n-1]+'</b></p>':''):'<label class="lbl">Written answer · page '+n+'<textarea class="txt" rows="8" '+(a.finished?'readonly':'')+' oninput="upRespond(this.value)">'+esc(a.responses[n]||'')+'</textarea></label>';
  const scanButtons=p.starts?'<div class="up-controls"><button '+(page<=1?'disabled':'')+' onclick="paperAttempt.scanPage='+ (page-1)+';render()">‹ Scan</button><small>Paper page '+page+' / '+p.pages+'</small><button '+(page>=p.pages?'disabled':'')+' onclick="paperAttempt.scanPage='+ (page+1)+';render()">Scan ›</button></div>':'';
  let scan='<img class="up-scan" src="'+source+'" alt="Original bilingual paper, page '+page+'">';
  if(p.starts && !a.scanPage){
    const [top,bottom,ratio]=p.bounds[n-1];
    const hindi=LANG()==='hi';
    scan='<div class="up-question" style="aspect-ratio:'+(.52*ratio/(bottom-top))+'"><img src="'+source+'" alt="Question '+n+' from the original paper" style="width:'+100/.52+'%;left:'+(hindi?-100*.48/.52:0)+'%;top:'+(-100*top/(bottom-top))+'%"></div>';
  }
  return pathPage(p.year+' · '+p.title,result+navButtons+'<a href="'+source+'" target="_blank" rel="noopener" title="Open original bilingual scan">'+scan+'</a>' +scanButtons+answer+(a.finished?'':'<button class="btn gold" onclick="upFinish()">Finish and review</button>')+'<p class="disc">Answers saved on this device.</p>');
}
