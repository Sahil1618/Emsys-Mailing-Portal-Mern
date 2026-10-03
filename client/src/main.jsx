// import React,{useState,useEffect} from 'react';import{createRoot}from'react-dom/client';import{Zap,Home,Upload,Settings,History,LogOut,Lock,Download,Trash2,Plus,Send,RefreshCw}from'lucide-react';import{api,isAdmin}from'./api';import'./styles.css';

// const DEFAULT_SUBJECT='Schedule Punch Update — {display_name} — {date} ({revision})';
// const DEFAULT_BODY='Dear Team,\n\nPlease find attached the updated schedule for {display_name} ({entity_key}).\n\nDate: {date}\nRevision: {revision}\nSent at: {punch_time}\n\nRegards,\nScheduling Team\n';

// function App(){const[page,setPage]=useState('Home');const[admin,setAdmin]=useState(isAdmin());const[stats,setStats]=useState({entitiesCount:0,sentTodayCount:0});const refresh=async()=>{if(admin){try{setStats((await api.get('/stats')).data)}catch{}}};useEffect(()=>{refresh()},[admin,page]);const logout=()=>{localStorage.removeItem('adminToken');setAdmin(false);setPage('Home')};return <div className="app"><header><div className="brand"><Zap size={20}/> EMSYS Mail Automation Portal</div><div className="stats"><span>{stats.entitiesCount} entities</span><span>{stats.sentTodayCount} sent today</span>{admin&&<button className="iconBtn" onClick={logout}><LogOut size={17}/></button>}</div></header><aside><Nav active={page} setPage={setPage}/></aside><main>{page==='Home'&&<HomePage setPage={setPage}/>} {page==='Upload & Send'&&<UploadPage admin={admin}/>} {page==='Manage Entities'&&<ManagePage admin={admin} setAdmin={setAdmin}/>} {page==='Send Log'&&<LogPage admin={admin}/>}</main></div>}
// function Nav({active,setPage}){const items=[['Home',Home],['Upload & Send',Upload],['Manage Entities',Settings],['Send Log',History]];return <nav>{items.map(([n,I])=><button key={n} className={active===n?'active':''} onClick={()=>setPage(n)}><I size={18}/>{n}</button>)}</nav>}
// function HomePage({setPage}){return <div className="stack"><section className="hero card"><h1>⚡ EMSYS Mail Automation Portal</h1><p>Upload the schedule CSV you already punch on NRLDC/WRLDC/SRLDC-style portals. The portal detects the plant by POS Name, splits combined files when needed, and emails the correct recipients with the CSV attached.</p><div className="actions"><button className="primary" onClick={()=>setPage('Upload & Send')}><Upload size={17}/> Upload & Send</button><button onClick={()=>setPage('Manage Entities')}><Settings size={17}/> Manage Entities</button></div></section><section className="card"><h2>How it works</h2><div className="steps"><Step n="1" title="Upload & Send" text="Upload a schedule CSV and review the detected Scheduling Entity, POS Name, date and revision."/><Step n="2" title="Match by POS Name" text="A shared scheduling entity can contain multiple plants. POS Name determines the recipient configuration."/><Step n="3" title="Send & Archive" text="Emails are sent through the configured SMTP account and the exact attachment is archived in MongoDB GridFS."/></div></section><section className="card"><h2>Persistent architecture</h2><p>Unlike the original local SQLite deployment, this version keeps application data in MongoDB and uploaded files in GridFS, so restarts and redeploys do not reset your portal data.</p></section></div>}
// function Step({n,title,text}){return <div className="step"><b>{n}</b><div><strong>{title}</strong><p>{text}</p></div></div>}
// function Login({onLogin}){const[p,setP]=useState('');const[e,setE]=useState('');return <div className="login card"><Lock size={30}/><h2>Admin login</h2><p>Manage Entities and sending actions require admin access.</p><input type="password" placeholder="Admin password" value={p} onChange={x=>setP(x.target.value)} onKeyDown={x=>x.key==='Enter'&&login()}/>{e&&<div className="error">{e}</div>}<button className="primary" onClick={login}>Unlock</button></div>;async function login(){try{const r=await api.post('/auth/login',{password:p});localStorage.setItem('adminToken',r.data.token);onLogin(true)}catch(x){setE(x.response?.data?.error||'Login failed')}}}

// function UploadPage({admin}){const[file,setFile]=useState(null);const[data,setData]=useState(null);const[busy,setBusy]=useState(false);const[msg,setMsg]=useState('');if(!admin)return <Login onLogin={()=>location.reload()}/>;const parse=async()=>{if(!file)return;setBusy(true);setMsg('');try{const f=new FormData();f.append('file',file);setData((await api.post('/upload/parse',f)).data)}catch(e){setMsg(e.response?.data?.error||e.message)}finally{setBusy(false)}};return <div className="stack"><section className="card"><h2>Upload & Send</h2><p className="muted">No time-window restriction — the file is used exactly as uploaded.</p><div className="uploadRow"><input type="file" accept=".csv" onChange={e=>{setFile(e.target.files[0]);setData(null)}}/><button className="primary" disabled={!file||busy} onClick={parse}>{busy?<RefreshCw className="spin"/>:<Upload size={17}/>} {busy?'Reading…':'Read CSV'}</button></div>{msg&&<div className="error">{msg}</div>}</section>{data&&<ParsedReview data={data} file={file}/>}</div>}
// function ParsedReview({data,file}){return <><section className="card"><div className="grid4"><Field l="Revision Type" v={data.meta.revision||'—'}/><Field l="Scheduling Entity" v={data.meta.entityKey}/><Field l="Date" v={data.meta.dateStr||'—'}/><Field l="POS Name" v={data.meta.posNames.join(', ')||'—'}/></div>{data.meta.excludedPosNames.length>0&&<div className="info">Excluded POS Names: {data.meta.excludedPosNames.join(', ')}</div>}</section>{data.groups.map((g,i)=><GroupCard key={i} group={g} data={data} file={file} total={data.groups.length}/>)}</>}
// function Field({l,v}){return <div className="field"><label>{l}</label><strong>{v}</strong></div>}
// function GroupCard({group,data,file,total}){const[e,setE]=useState(group.entity);const[open,setOpen]=useState(!group.entity);const[status,setStatus]=useState('');const[busy,setBusy]=useState(false);const[form,setForm]=useState(()=>({displayName:e?.displayName||data.meta.entityKey,region:e?.region||'',posName:e?.posName||group.posNames.join(', '),energyType:e?.energyType||data.meta.energyTypes.join(', '),smtpAccount:e?.smtpAccount||'default',to:(e?.recipients||[]).filter(r=>r.kind==='to').map(r=>r.email).join('\n'),cc:(e?.recipients||[]).filter(r=>r.kind==='cc').map(r=>r.email).join('\n'),bcc:(e?.recipients||[]).filter(r=>r.kind==='bcc').map(r=>r.email).join('\n'),subjectTemplate:e?.subjectTemplate||DEFAULT_SUBJECT,bodyTemplate:e?.bodyTemplate||DEFAULT_BODY}));const update=k=>v=>setForm(x=>({...x,[k]:v}));const saveAndSend=async()=>{setBusy(true);setStatus('');try{const fd=new FormData();fd.append('file',file);fd.append('targetPosNames',JSON.stringify(group.posNames));fd.append('totalGroups',String(total));let id=e?._id;if(!id){fd.append('inlineEntity',JSON.stringify({...form,to:lines(form.to),cc:lines(form.cc),bcc:lines(form.bcc)}))}else fd.append('entityId',id);const r=await api.post('/send',fd);setE(r.data.log?.entityId?{...e,...form,_id:r.data.log.entityId}:e);setStatus('success');}catch(err){setStatus(err.response?.data?.error||err.message)}finally{setBusy(false)}};const lines=s=>s.split('\n').map(x=>x.trim()).filter(Boolean);return <section className="card group"><div className="groupHead"><div><h3>{group.posNames.join(', ')}</h3><span className="muted">{e?`Configured: ${e.displayName}`:'Not configured'}</span></div><button onClick={()=>setOpen(!open)}>{open?'Hide':'Configure'}</button></div>{open&&<div className="formGrid">{!e&&<div className="info full">This POS Name is not configured. Fill the details below to save it and send this file.</div>}<label>Display name<input value={form.displayName} onChange={x=>update('displayName')(x.target.value)}/></label><label>Region<input value={form.region} onChange={x=>update('region')(x.target.value)}/></label><label>POS Name(s)<input value={form.posName} onChange={x=>update('posName')(x.target.value)}/></label><label>Energy Type(s)<input value={form.energyType} onChange={x=>update('energyType')(x.target.value)}/></label><label>Sending account<input value={form.smtpAccount} onChange={x=>update('smtpAccount')(x.target.value)}/></label><label>To recipients<textarea value={form.to} onChange={x=>update('to')(x.target.value)}/></label><label>Cc recipients<textarea value={form.cc} onChange={x=>update('cc')(x.target.value)}/></label><label>Bcc recipients<textarea value={form.bcc} onChange={x=>update('bcc')(x.target.value)}/></label><label>Subject template<input value={form.subjectTemplate} onChange={x=>update('subjectTemplate')(x.target.value)}/></label><label className="full">Body template<textarea className="big" value={form.bodyTemplate} onChange={x=>update('bodyTemplate')(x.target.value)}/></label><div className="templateHelp full">Placeholders: {'{entity_key}'} {'{display_name}'} {'{date}'} {'{revision}'} {'{punch_time}'} {'{filename}'}</div><div className="preview full"><strong>Recipients:</strong> {lines(form.to).join(', ')||'none'}{lines(form.cc).length>0&&<> · <strong>Cc:</strong> {lines(form.cc).join(', ')}</>}{lines(form.bcc).length>0&&<> · <strong>Bcc:</strong> {lines(form.bcc).join(', ')}</>}</div><button className="primary full" disabled={busy} onClick={saveAndSend}>{busy?<RefreshCw className="spin"/>:<Send size={17}/>} {busy?'Sending…':e?'Update & Send':'Save Entity & Send'}</button>{status==='success'&&<div className="success full">Email accepted by the SMTP server and archived successfully.</div>}{status&&status!=='success'&&<div className="error full">{status}</div>}</div>}</section>}

// function ManagePage({admin,setAdmin}){if(!admin)return <Login onLogin={setAdmin}/>;const[entities,setEntities]=useState([]),[excluded,setExcluded]=useState([]),[newEx,setNewEx]=useState(''),[showAdd,setShowAdd]=useState(false);const load=async()=>{setEntities((await api.get('/entities')).data);setExcluded((await api.get('/excluded')).data)};useEffect(()=>{load()},[]);const addEntity=async form=>{await api.post('/entities',form);setShowAdd(false);load()};const remove=async id=>{if(confirm('Delete this entity?')){await api.delete('/entities/'+id);load()}};const addExcluded=async()=>{if(newEx.trim()){await api.post('/excluded',{posName:newEx,note:'Added manually via Manage Entities'});setNewEx('');load()}};return <div className="stack"><section className="card"><div className="sectionHead"><div><h2>Manage Entities</h2><p className="muted">Plants, recipients, templates and SMTP account selection.</p></div><button onClick={()=>setShowAdd(!showAdd)}><Plus size={17}/> Add entity</button></div>{showAdd&&<EntityEditor onSave={addEntity} onCancel={()=>setShowAdd(false)}/>}</section><section className="card"><h2>Excluded POS Names</h2><div className="inline"><input placeholder="POS Name to ignore" value={newEx} onChange={e=>setNewEx(e.target.value)}/><button onClick={addExcluded}>Exclude</button></div>{excluded.map(x=><div className="listRow" key={x._id}><span><b>{x.originalCase}</b><small>{x.note}</small></span><button className="dangerGhost" onClick={async()=>{await api.delete('/excluded/'+encodeURIComponent(x.posName));load()}}><Trash2 size={16}/></button></div>)}</section>{entities.map(e=><EntityEditor key={e._id} entity={e} onDelete={()=>remove(e._id)} onSaved={load}/>)}</div>}
// function EntityEditor({entity,onSave,onCancel,onDelete,onSaved}){const f0=entity||{entityKey:'',displayName:'',region:'',posName:'',energyType:'',smtpAccount:'default',subjectTemplate:DEFAULT_SUBJECT,bodyTemplate:DEFAULT_BODY,recipients:[]};const[f,setF]=useState({...f0,to:f0.recipients.filter(r=>r.kind==='to').map(r=>r.email).join('\n'),cc:f0.recipients.filter(r=>r.kind==='cc').map(r=>r.email).join('\n'),bcc:f0.recipients.filter(r=>r.kind==='bcc').map(r=>r.email).join('\n')});const[open,setOpen]=useState(!entity);const set=(k,v)=>setF(x=>({...x,[k]:v}));const lines=s=>s.split('\n').map(x=>x.trim()).filter(Boolean);const save=async()=>{const body={...f,to:lines(f.to),cc:lines(f.cc),bcc:lines(f.bcc)};delete body.recipients;if(entity){await api.put('/entities/'+entity._id,body);onSaved?.()}else await onSave(body);};return <section className="card entity"><div className="sectionHead"><div><h3>{entity?.displayName||'New Entity'}</h3>{entity&&<span className="muted">{entity.entityKey} · {entity.posName||'No POS Name'}</span>}</div><button onClick={()=>setOpen(!open)}>{open?'Collapse':'Edit'}</button></div>{open&&<div className="formGrid"><label>Entity key<input value={f.entityKey} onChange={e=>set('entityKey',e.target.value)}/></label><label>Display name<input value={f.displayName} onChange={e=>set('displayName',e.target.value)}/></label><label>Region<input value={f.region} onChange={e=>set('region',e.target.value)}/></label><label>POS Name(s)<input value={f.posName} onChange={e=>set('posName',e.target.value)}/></label><label>Energy Type(s)<input value={f.energyType} onChange={e=>set('energyType',e.target.value)}/></label><label>SMTP account<input value={f.smtpAccount} onChange={e=>set('smtpAccount',e.target.value)}/></label><label>To<textarea value={f.to} onChange={e=>set('to',e.target.value)}/></label><label>Cc<textarea value={f.cc} onChange={e=>set('cc',e.target.value)}/></label><label>Bcc<textarea value={f.bcc} onChange={e=>set('bcc',e.target.value)}/></label><label>Subject<input value={f.subjectTemplate} onChange={e=>set('subjectTemplate',e.target.value)}/></label><label className="full">Body<textarea className="big" value={f.bodyTemplate} onChange={e=>set('bodyTemplate',e.target.value)}/></label><div className="actions full"><button className="primary" onClick={save}>Save</button>{onCancel&&<button onClick={onCancel}>Cancel</button>}{onDelete&&<button className="danger" onClick={onDelete}>Delete</button>}</div></div>}</section>}

// function LogPage({admin}){const[rows,setRows]=useState([]),[search,setSearch]=useState('');if(!admin)return <Login onLogin={()=>location.reload()}/>;const load=async()=>{const r=await api.get('/logs',{params:{search:search||undefined,limit:1000}});setRows(r.data)};useEffect(()=>{load()},[]);return <div className="stack"><section className="card"><div className="sectionHead"><div><h2>File Archive & Send Log</h2><p className="muted">Every successfully sent attachment remains available in MongoDB GridFS.</p></div><button onClick={load}><RefreshCw size={17}/> Refresh</button></div><div className="inline"><input placeholder="Search filename, plant or entity" value={search} onChange={e=>setSearch(e.target.value)}/><button onClick={load}>Search</button></div><div className="tableWrap"><table><thead><tr><th>Date/time</th><th>Plant</th><th>Region</th><th>Filename</th><th>Status</th><th></th></tr></thead><tbody>{rows.map(r=><tr key={r._id}><td>{new Date(r.sentAt).toLocaleString('en-IN')}</td><td>{r.displayName}</td><td>{r.region||'—'}</td><td>{r.filename}</td><td><span className={r.status==='sent'?'badge ok':'badge fail'}>{r.status}</span>{r.error&&<small>{r.error}</small>}</td><td><a className="download" href={`${import.meta.env.VITE_API_URL||'http://localhost:5000/api'}/logs/${r._id}/download`} onClick={e=>{e.preventDefault();download(r._id,r.filename)}}><Download size={16}/> Download</a></td></tr>)}</tbody></table></div></section></div>}
// async function download(id,name){const r=await api.get('/logs/'+id+'/download',{responseType:'blob'});const u=URL.createObjectURL(r.data);const a=document.createElement('a');a.href=u;a.download=name;a.click();URL.revokeObjectURL(u)}

// createRoot(document.getElementById('root')).render(<App/>);


import React,{useState,useEffect,useRef,useCallback,useMemo,createContext,useContext}from'react';
import{createRoot}from'react-dom/client';
import{Zap,Home,Upload,Settings,History,LogOut,Lock,Download,Trash2,Plus,Send,RefreshCw,Sun,Moon,CheckCircle2,AlertCircle,X,Check}from'lucide-react';
import{api,isAdmin}from'./api';
import'./styles.css';

const DEFAULT_SUBJECT='Schedule Punch Update — {display_name} — {date} ({revision})';
const DEFAULT_BODY='Dear Team,\n\nPlease find attached the updated schedule for {display_name} ({entity_key}).\n\nDate: {date}\nRevision: {revision}\nSent at: {punch_time}\n\nRegards,\nScheduling Team\n';

/* ------------------------------------------------------------------ Theme */
function initialTheme(){try{return localStorage.getItem('theme')==='light'?'light':'dark'}catch{return'dark'}}
// Apply before the first render so there is no flash of the wrong theme.
document.documentElement.dataset.theme=initialTheme();

/* ------------------------------------------------------------------ Toasts */
const ToastCtx=createContext({success:()=>{},error:()=>{}});
const useToast=()=>useContext(ToastCtx);

function ToastProvider({children}){
  const[toasts,setToasts]=useState([]);
  const idRef=useRef(0);
  const dismiss=useCallback(id=>setToasts(t=>t.filter(x=>x.id!==id)),[]);
  const push=useCallback((type,message,ms)=>{
    const id=++idRef.current;
    setToasts(t=>[...t,{id,type,message}]);
    setTimeout(()=>dismiss(id),ms);
  },[dismiss]);
  const value=useMemo(()=>({success:m=>push('success',m,5000),error:m=>push('error',m,8000)}),[push]);
  return <ToastCtx.Provider value={value}>
    {children}
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map(t=><div key={t.id} className={`toast ${t.type}`}>
        {t.type==='success'?<CheckCircle2 size={18}/>:<AlertCircle size={18}/>}
        <span>{t.message}</span>
        <button className="toastClose" aria-label="Dismiss" onClick={()=>dismiss(t.id)}><X size={15}/></button>
      </div>)}
    </div>
  </ToastCtx.Provider>;
}

/* ------------------------------------------------------------------ App shell */
function App(){
  const toast=useToast();
  const[page,setPage]=useState('Home');
  const[admin,setAdmin]=useState(isAdmin());
  const[stats,setStats]=useState({entitiesCount:0,sentTodayCount:0});
  const[theme,setTheme]=useState(initialTheme);

  const refreshStats=useCallback(async()=>{try{setStats((await api.get('/stats')).data)}catch{}},[]);
  useEffect(()=>{refreshStats()},[page,admin,refreshStats]);

  useEffect(()=>{
    document.documentElement.dataset.theme=theme;
    try{localStorage.setItem('theme',theme)}catch{}
  },[theme]);

  // api.js fires this when an admin-only request comes back 401 (expired session).
  useEffect(()=>{
    const h=()=>{setAdmin(false);toast.error('Admin session expired. Please log in again.')};
    window.addEventListener('admin-expired',h);
    return()=>window.removeEventListener('admin-expired',h);
  },[toast]);

  const logout=()=>{localStorage.removeItem('adminToken');setAdmin(false);if(page==='Manage Entities')setPage('Home')};
  const next=theme==='dark'?'light':'dark';

  return <div className="app">
    <header>
      <div className="brand"><Zap size={20}/> EMSYS Energy Mail Automation Portal</div>
      <div className="stats">
        <span>{stats.entitiesCount} entities</span>
        <span>{stats.sentTodayCount} sent today</span>
        <button className="iconBtn" onClick={()=>setTheme(next)} title={`Switch to ${next} theme`} aria-label={`Switch to ${next} theme`}>
          {theme==='dark'?<Sun size={17}/>:<Moon size={17}/>}
        </button>
        {admin&&<button className="iconBtn" onClick={logout} title="Admin logout" aria-label="Admin logout"><LogOut size={17}/></button>}
      </div>
    </header>
    <aside><Nav active={page} setPage={setPage}/></aside>
    <main>
      {page==='Home'&&<HomePage setPage={setPage}/>}
      {page==='Upload & Send'&&<UploadPage onSent={refreshStats}/>}
      {page==='Manage Entities'&&<ManagePage admin={admin} setAdmin={setAdmin}/>}
      {page==='Send Log'&&<LogPage/>}
    </main>
  </div>;
}

function Nav({active,setPage}){
  const items=[['Home',Home],['Upload & Send',Upload],['Manage Entities',Settings],['Send Log',History]];
  return <nav>{items.map(([n,I])=><button key={n} className={active===n?'active':''} onClick={()=>setPage(n)}><I size={18}/>{n}</button>)}</nav>;
}

/* ------------------------------------------------------------------ Home */
function HomePage({setPage}){
  return <div className="stack">
    <section className="hero card">
      <h1>⚡EMSYS Mail Automation Portal</h1>
      <p>Upload the schedule CSV you already punch on NRLDC/WRLDC/SRLDC-style portals. The portal detects the plant by POS Name, splits combined files when needed, and emails the correct recipients with the CSV attached.</p>
      <div className="actions">
        <button className="primary" onClick={()=>setPage('Upload & Send')}><Upload size={17}/> Upload & Send</button>
        <button onClick={()=>setPage('Manage Entities')}><Settings size={17}/> Manage Entities</button>
      </div>
    </section>
    <section className="card"><h2>How it works</h2><div className="steps">
      <Step n="1" title="Upload & Send" text="Upload a schedule CSV and review the detected Scheduling Entity, POS Name, date and revision."/>
      <Step n="2" title="Match by POS Name" text="A shared scheduling entity can contain multiple plants. POS Name determines the recipient configuration."/>
      <Step n="3" title="Send & Archive" text="Emails are sent through the configured SMTP account and the exact attachment is archived in MongoDB GridFS."/>
    </div></section>
    {/* <section className="card"><h2>Persistent architecture</h2><p>Unlike the original local SQLite deployment, this version keeps application data in MongoDB and uploaded files in GridFS, so restarts and redeploys do not reset your portal data.</p></section> */}
  </div>;
}
function Step({n,title,text}){return <div className="step"><b>{n}</b><div><strong>{title}</strong><p>{text}</p></div></div>}

/* ------------------------------------------------------------------ Admin login (Manage Entities only) */
function Login({onLogin}){
  const[p,setP]=useState('');
  const[e,setE]=useState('');
  const login=async()=>{
    try{
      const r=await api.post('/auth/login',{password:p});
      localStorage.setItem('adminToken',r.data.token);
      onLogin(true);
    }catch(x){setE(x.response?.data?.error||'Login failed')}
  };
  return <div className="login card">
    <Lock size={30}/>
    <h2>Admin login</h2>
    <p>Manage Entities requires admin access.</p>
    <input type="password" placeholder="Admin password" value={p} onChange={x=>setP(x.target.value)} onKeyDown={x=>x.key==='Enter'&&login()}/>
    {e&&<div className="error">{e}</div>}
    <button className="primary" onClick={login}>Unlock</button>
  </div>;
}

/* ------------------------------------------------------------------ Upload & Send */
function UploadPage({onSent}){
  const toast=useToast();
  const[file,setFile]=useState(null);
  const[data,setData]=useState(null);
  const[reading,setReading]=useState(false);
  const[error,setError]=useState('');
  const[results,setResults]=useState({}); // group index -> {state:'sending'|'sent'|'failed', message}
  const[sending,setSending]=useState(false);
  const readId=useRef(0);

  // Choosing a CSV reads it immediately — no separate "Read CSV" step.
  const onPick=async e=>{
    const f=e.target.files[0]||null;
    const id=++readId.current;
    setFile(f);setData(null);setResults({});setError('');
    if(!f)return;
    setReading(true);
    try{
      const fd=new FormData();fd.append('file',f);
      const r=await api.post('/upload/parse',fd);
      if(id===readId.current)setData(r.data);
    }catch(err){
      if(id===readId.current)setError(err.response?.data?.error||err.message);
    }finally{
      if(id===readId.current)setReading(false);
    }
  };

  const sendAll=async()=>{
    if(!data||!file)return;
    setSending(true);
    for(let i=0;i<data.groups.length;i++){
      if(results[i]?.state==='sent')continue; // on retry, only resend the failed ones
      const g=data.groups[i];
      setResults(r=>({...r,[i]:{state:'sending'}}));
      try{
        const fd=new FormData();
        fd.append('file',file);
        fd.append('targetPosNames',JSON.stringify(g.posNames));
        fd.append('totalGroups',String(data.totalGroups));
        fd.append('entityId',g.entity._id);
        const r=await api.post('/send',fd);
        const n=r.data.log?.recipients?.length||0;
        setResults(x=>({...x,[i]:{state:'sent'}}));
        toast.success(`Mail sent successfully for ${g.entity.displayName}${n?` to ${n} recipient${n===1?'':'s'}`:''}.`);
      }catch(err){
        const message=err.response?.data?.error||err.message;
        setResults(x=>({...x,[i]:{state:'failed',message}}));
        toast.error(`${g.entity.displayName}: ${message}`);
      }
    }
    setSending(false);
    onSent?.();
  };

  const groups=data?.groups||[];
  const sentCount=groups.filter((_,i)=>results[i]?.state==='sent').length;
  const failedCount=groups.filter((_,i)=>results[i]?.state==='failed').length;
  const allSent=groups.length>0&&sentCount===groups.length;
  const label=allSent?'Sent'
    :failedCount>0?'Retry failed'
    :groups.length>1?`Send ${groups.length} Mails`:'Send Mail';

  return <div className="stack">
    <section className="card">
      <h2>Upload & Send</h2>
      <p className="muted">No time-window restriction — the file is used exactly as uploaded.</p>
      <div className="uploadRow">
        <input type="file" accept=".csv" onChange={onPick}/>
        {reading&&<span className="muted"><RefreshCw size={17} className="spin"/></span>}
      </div>
      {error&&<div className="error">{error}</div>}
    </section>

    {data&&<>
      <section className="card">
        <div className="grid4">
          <Field l="Revision Type" v={data.meta.revision||'—'}/>
          <Field l="Scheduling Entity" v={data.meta.entityKey}/>
          <Field l="Date" v={data.meta.dateStr||'—'}/>
          <Field l="POS Name" v={data.meta.posNames.join(', ')||'—'}/>
        </div>
        {data.meta.excludedPosNames.length>0&&<div className="info">Excluded POS Names: {data.meta.excludedPosNames.join(', ')}</div>}
        {groups.length===0&&<div className="info">
          None of the POS Names in this file are configured, so there is nothing to send.
          {data.meta.unconfiguredPosNames.length>0&&<> Not configured: {data.meta.unconfiguredPosNames.join(', ')}. An admin can add them under Manage Entities.</>}
        </div>}
      </section>

      {groups.map((g,i)=><GroupRow key={i} group={g} result={results[i]}/>)}

      {groups.length>0&&<div className="sendBar">
        <button className="primary" disabled={sending||allSent} onClick={sendAll}>
          {sending?<RefreshCw size={17} className="spin"/>:allSent?<Check size={17}/>:<Send size={17}/>} {sending?'Sending…':label}
        </button>
      </div>}
    </>}
  </div>;
}

function Field({l,v}){return <div className="field"><label>{l}</label><strong>{v}</strong></div>}

function GroupRow({group,result}){
  const state=result?.state||'idle';
  const badge={
    idle:<span className="badge idle">Ready</span>,
    sending:<span className="badge busy"><RefreshCw size={12} className="spin"/> Sending…</span>,
    sent:<span className="badge ok"><Check size={12}/> Sent</span>,
    failed:<span className="badge fail">Failed</span>
  }[state];
  return <section className="card group">
    <div className="groupHead">
      <div><h3>{group.posNames.join(', ')}</h3><span className="muted">Configured: {group.entity.displayName}{group.entity.region?` · ${group.entity.region}`:''}</span></div>
      {badge}
    </div>
    {state==='failed'&&<p className="groupMsg">{result.message}</p>}
  </section>;
}

/* ------------------------------------------------------------------ Manage Entities (admin only) */
function ManagePage({admin,setAdmin}){
  if(!admin)return <Login onLogin={setAdmin}/>;
  return <ManageContent/>;
}

function ManageContent(){
  const toast=useToast();
  const[entities,setEntities]=useState([]),[excluded,setExcluded]=useState([]),[newEx,setNewEx]=useState(''),[showAdd,setShowAdd]=useState(false);
  const load=async()=>{
    try{
      setEntities((await api.get('/entities')).data);
      setExcluded((await api.get('/excluded')).data);
    }catch(err){
      if(err.response?.status!==401)toast.error(err.response?.data?.error||err.message);
    }
  };
  useEffect(()=>{load()},[]);
  const addEntity=async form=>{await api.post('/entities',form);setShowAdd(false);toast.success('Entity added.');load()};
  const remove=async id=>{
    if(!confirm('Delete this entity?'))return;
    try{await api.delete('/entities/'+id);toast.success('Entity deleted.');load()}
    catch(err){toast.error(err.response?.data?.error||err.message)}
  };
  const addExcluded=async()=>{
    if(!newEx.trim())return;
    try{await api.post('/excluded',{posName:newEx,note:'Added manually via Manage Entities'});setNewEx('');load()}
    catch(err){toast.error(err.response?.data?.error||err.message)}
  };
  return <div className="stack">
    <section className="card">
      <div className="sectionHead">
        <div><h2>Manage Entities</h2><p className="muted">Plants, recipients, templates and SMTP account selection.</p></div>
        <button onClick={()=>setShowAdd(!showAdd)}><Plus size={17}/> Add entity</button>
      </div>
      {showAdd&&<EntityEditor onSave={addEntity} onCancel={()=>setShowAdd(false)}/>}
    </section>
    <section className="card">
      <h2>Excluded POS Names</h2>
      <div className="inline"><input placeholder="POS Name to ignore" value={newEx} onChange={e=>setNewEx(e.target.value)}/><button onClick={addExcluded}>Exclude</button></div>
      {excluded.map(x=><div className="listRow" key={x._id}>
        <span><b>{x.originalCase}</b><small>{x.note}</small></span>
        <button className="dangerGhost" onClick={async()=>{await api.delete('/excluded/'+encodeURIComponent(x.posName));load()}}><Trash2 size={16}/></button>
      </div>)}
    </section>
    {entities.map(e=><EntityEditor key={e._id} entity={e} onDelete={()=>remove(e._id)} onSaved={load}/>)}
  </div>;
}

function EntityEditor({entity,onSave,onCancel,onDelete,onSaved}){
  const toast=useToast();
  const f0=entity||{entityKey:'',displayName:'',region:'',posName:'',energyType:'',smtpAccount:'default',subjectTemplate:DEFAULT_SUBJECT,bodyTemplate:DEFAULT_BODY,recipients:[]};
  const[f,setF]=useState({...f0,
    to:f0.recipients.filter(r=>r.kind==='to').map(r=>r.email).join('\n'),
    cc:f0.recipients.filter(r=>r.kind==='cc').map(r=>r.email).join('\n'),
    bcc:f0.recipients.filter(r=>r.kind==='bcc').map(r=>r.email).join('\n')});
  const[open,setOpen]=useState(!entity);
  const set=(k,v)=>setF(x=>({...x,[k]:v}));
  const lines=s=>s.split('\n').map(x=>x.trim()).filter(Boolean);
  const save=async()=>{
    const body={...f,to:lines(f.to),cc:lines(f.cc),bcc:lines(f.bcc)};
    delete body.recipients;
    try{
      if(entity){await api.put('/entities/'+entity._id,body);toast.success('Entity saved.');onSaved?.()}
      else await onSave(body);
    }catch(err){toast.error(err.response?.data?.error||err.message)}
  };
  return <section className="card entity">
    <div className="sectionHead">
      <div><h3>{entity?.displayName||'New Entity'}</h3>{entity&&<span className="muted">{entity.entityKey} · {entity.posName||'No POS Name'}</span>}</div>
      <button onClick={()=>setOpen(!open)}>{open?'Collapse':'Edit'}</button>
    </div>
    {open&&<div className="formGrid">
      <label>Entity key<input value={f.entityKey} onChange={e=>set('entityKey',e.target.value)}/></label>
      <label>Display name<input value={f.displayName} onChange={e=>set('displayName',e.target.value)}/></label>
      <label>Region<input value={f.region} onChange={e=>set('region',e.target.value)}/></label>
      <label>POS Name(s)<input value={f.posName} onChange={e=>set('posName',e.target.value)}/></label>
      <label>Energy Type(s)<input value={f.energyType} onChange={e=>set('energyType',e.target.value)}/></label>
      <label>SMTP account<input value={f.smtpAccount} onChange={e=>set('smtpAccount',e.target.value)}/></label>
      <label>To<textarea value={f.to} onChange={e=>set('to',e.target.value)}/></label>
      <label>Cc<textarea value={f.cc} onChange={e=>set('cc',e.target.value)}/></label>
      <label>Bcc<textarea value={f.bcc} onChange={e=>set('bcc',e.target.value)}/></label>
      <label>Subject<input value={f.subjectTemplate} onChange={e=>set('subjectTemplate',e.target.value)}/></label>
      <label className="full">Body<textarea className="big" value={f.bodyTemplate} onChange={e=>set('bodyTemplate',e.target.value)}/></label>
      <div className="actions full">
        <button className="primary" onClick={save}>Save</button>
        {onCancel&&<button onClick={onCancel}>Cancel</button>}
        {onDelete&&<button className="danger" onClick={onDelete}>Delete</button>}
      </div>
    </div>}
  </section>;
}

/* ------------------------------------------------------------------ Send Log */
function LogPage(){
  const toast=useToast();
  const[rows,setRows]=useState([]),[search,setSearch]=useState('');
  const load=async()=>{
    try{setRows((await api.get('/logs',{params:{search:search||undefined,limit:1000}})).data)}
    catch(err){toast.error(err.response?.data?.error||err.message)}
  };
  useEffect(()=>{load()},[]);
  const onDownload=async(id,name)=>{try{await download(id,name)}catch(err){toast.error(err.response?.data?.error||err.message)}};
  return <div className="stack"><section className="card">
    <div className="sectionHead">
      <div><h2>File Archive & Send Log</h2><p className="muted">Every successfully sent attachment remains available in MongoDB GridFS.</p></div>
      <button onClick={load}><RefreshCw size={17}/> Refresh</button>
    </div>
    <div className="inline"><input placeholder="Search filename, plant or entity" value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&load()}/><button onClick={load}>Search</button></div>
    <div className="tableWrap"><table>
      <thead><tr><th>Date/time</th><th>Plant</th><th>Region</th><th>Filename</th><th>Status</th><th></th></tr></thead>
      <tbody>{rows.map(r=><tr key={r._id}>
        <td>{new Date(r.sentAt).toLocaleString('en-IN')}</td>
        <td>{r.displayName}</td>
        <td>{r.region||'—'}</td>
        <td>{r.filename}</td>
        <td><span className={r.status==='sent'?'badge ok':'badge fail'}>{r.status}</span>{r.error&&<small>{r.error}</small>}</td>
        <td><a className="download" href={`${import.meta.env.VITE_API_URL||'http://localhost:5000/api'}/logs/${r._id}/download`} onClick={e=>{e.preventDefault();onDownload(r._id,r.filename)}}><Download size={16}/> Download</a></td>
      </tr>)}</tbody>
    </table></div>
  </section></div>;
}
async function download(id,name){
  const r=await api.get('/logs/'+id+'/download',{responseType:'blob'});
  const u=URL.createObjectURL(r.data);
  const a=document.createElement('a');a.href=u;a.download=name;a.click();URL.revokeObjectURL(u);
}

createRoot(document.getElementById('root')).render(<ToastProvider><App/></ToastProvider>);