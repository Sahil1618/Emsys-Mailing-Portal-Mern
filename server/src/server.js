// import 'dotenv/config';
// import express from 'express';
// import cors from 'cors';
// import multer from 'multer';
// import jwt from 'jsonwebtoken';
// import mongoose from 'mongoose';
// import {GridFSBucket,ObjectId} from 'mongodb';
// import {connectDb} from './db.js';
// import {Entity,ExcludedPosName,SendLog} from './models.js';
// import {parseScheduleCsv,extractPosNamesSubset} from './csvParser.js';
// import {adminLogin,requireAdmin} from './auth.js';
// import {listAccounts,sendEmail} from './smtp.js';

// const app=express(); const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:50*1024*1024}});
// app.use(cors({origin:process.env.CLIENT_URL||'http://localhost:5173'})); app.use(express.json({limit:'2mb'}));
// const DEFAULT_SUBJECT='Schedule Punch Update — {display_name} — {date} ({revision})';
// const DEFAULT_BODY='Dear Team,\n\nPlease find attached the updated schedule for {display_name} ({entity_key}).\n\nDate: {date}\nRevision: {revision}\nSent at: {punch_time}\n\nRegards,\nScheduling Team\n';
// let bucket;
// function istDate(){return new Date(new Date().toLocaleString('en-US',{timeZone:'Asia/Kolkata'}));}
// function fmtDate(d){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);}
// function fmtDateTime(d){const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(d).reduce((o,x)=>(o[x.type]=x.value,o),{}); return `${p.day}-${p.month}-${p.year} ${p.hour}:${p.minute}`;}
// function template(str,ctx){return String(str||'').replace(/\{(entity_key|display_name|date|revision|punch_time|filename|blocks_table)\}/g,(_,k)=>ctx[k]??'');}
// function groupPosNames(posNames,entities){const groups=[]; const map=new Map(); for(const p of posNames){const e=entities.find(x=>(x.posName||'').split(',').map(v=>v.trim().toLowerCase()).includes(p.toLowerCase())); const key=e?`entity:${e._id}`:`pos:${p.toLowerCase()}`; if(!map.has(key)){const g={entity:e||null,posNames:[]};map.set(key,g);groups.push(g);} map.get(key).posNames.push(p);} return groups;}

// app.get('/api/health',(req,res)=>res.json({ok:true}));
// app.post('/api/auth/login',adminLogin);
// app.get('/api/config/accounts',requireAdmin,(req,res)=>res.json({accounts:listAccounts()}));

// app.get('/api/entities',async(req,res)=>res.json(await Entity.find().sort({displayName:1}).lean()));
// app.post('/api/entities',requireAdmin,async(req,res)=>{try{const b=req.body; if(!b.entityKey||!b.displayName)return res.status(400).json({error:'Entity key and display name are required.'}); const recipients=[]; for(const kind of ['to','cc','bcc']) for(const email of (b[kind]||[]).map(x=>String(x).trim()).filter(Boolean)) recipients.push({email,kind}); const e=await Entity.create({entityKey:b.entityKey,displayName:b.displayName,region:b.region||'',posName:b.posName||'',energyType:b.energyType||'',smtpAccount:b.smtpAccount||'default',subjectTemplate:b.subjectTemplate||DEFAULT_SUBJECT,bodyTemplate:b.bodyTemplate||DEFAULT_BODY,recipients}); res.status(201).json(e);}catch(e){res.status(400).json({error:e.message});}});
// app.put('/api/entities/:id',requireAdmin,async(req,res)=>{try{const b=req.body; const update={}; for(const k of ['entityKey','displayName','region','posName','energyType','smtpAccount','subjectTemplate','bodyTemplate']) if(k in b) update[k]=b[k]; if(['to','cc','bcc'].some(k=>k in b)){update.recipients=[]; for(const kind of ['to','cc','bcc']) for(const email of (b[kind]||[]).map(x=>String(x).trim()).filter(Boolean)) update.recipients.push({email,kind});} const e=await Entity.findByIdAndUpdate(req.params.id,update,{new:true}); if(!e)return res.status(404).json({error:'Entity not found'}); res.json(e);}catch(e){res.status(400).json({error:e.message});}});
// app.delete('/api/entities/:id',requireAdmin,async(req,res)=>{await Entity.findByIdAndDelete(req.params.id); res.json({ok:true});});

// app.get('/api/excluded',requireAdmin,async(req,res)=>res.json(await ExcludedPosName.find().sort({originalCase:1}).lean()));
// app.post('/api/excluded',requireAdmin,async(req,res)=>{const p=String(req.body.posName||'').trim(); if(!p)return res.status(400).json({error:'POS Name required'}); const e=await ExcludedPosName.findOneAndUpdate({posName:p.toLowerCase()},{posName:p.toLowerCase(),originalCase:p,note:req.body.note||''},{upsert:true,new:true});res.json(e);});
// app.delete('/api/excluded/:posName',requireAdmin,async(req,res)=>{await ExcludedPosName.deleteOne({posName:req.params.posName.toLowerCase()});res.json({ok:true});});

// app.post('/api/upload/parse',upload.single('file'),async(req,res)=>{try{if(!req.file)return res.status(400).json({error:'CSV file required'}); const parsed=parseScheduleCsv(req.file.buffer,req.file.originalname); const excluded=new Set((await ExcludedPosName.find({posName:{$in:parsed.posNames.map(x=>x.toLowerCase())}}).lean()).map(x=>x.originalCase.toLowerCase())); const active=parsed.posNames.filter(p=>!excluded.has(p.toLowerCase())); const entities=await Entity.find().lean(); const groups=groupPosNames(active,entities); res.json({fileName:req.file.originalname,fileBase64:req.file.buffer.toString('base64'),meta:{entityKey:parsed.entityKey,dateStr:parsed.dateStr,revision:parsed.revision,posNames:parsed.posNames,activePosNames:active,excludedPosNames:parsed.posNames.filter(p=>excluded.has(p.toLowerCase())),energyTypes:parsed.energyTypes},groups:groups.map(g=>({posNames:g.posNames,entity:g.entity})),smtpAccounts:listAccounts()});}catch(e){res.status(400).json({error:e.message});}});

// app.post('/api/send',requireAdmin,upload.single('file'),async(req,res)=>{
//   let parsed; let outputBytes; let entity; let recipients=[]; let status='sent'; let error='';
//   try{
//     if(!req.file)return res.status(400).json({error:'CSV file required'});
//     parsed=parseScheduleCsv(req.file.buffer,req.file.originalname);
//     const target=JSON.parse(req.body.targetPosNames||'[]'); if(!target.length)return res.status(400).json({error:'targetPosNames required'});
//     if(req.body.entityId) entity=await Entity.findById(req.body.entityId); else if(req.body.inlineEntity){const b=JSON.parse(req.body.inlineEntity); const rs=[]; for(const k of ['to','cc','bcc']) for(const email of (b[k]||[]).map(x=>String(x).trim()).filter(Boolean)) rs.push({email,kind:k}); entity=await Entity.create({entityKey:parsed.entityKey,displayName:b.displayName||parsed.entityKey,region:b.region||'',posName:b.posName||target.join(', '),energyType:b.energyType||parsed.energyTypes.join(', '),smtpAccount:b.smtpAccount||'default',subjectTemplate:b.subjectTemplate||DEFAULT_SUBJECT,bodyTemplate:b.bodyTemplate||DEFAULT_BODY,recipients:rs});}
//     if(!entity)return res.status(400).json({error:'Entity is not configured.'});
//     outputBytes=extractPosNamesSubset(parsed,target); const attachmentFilename=JSON.parse(req.body.totalGroups||'1')>1?`${target.join('_')}_${req.file.originalname}`:req.file.originalname;
//     const to=entity.recipients.filter(r=>r.kind==='to').map(r=>r.email), cc=entity.recipients.filter(r=>r.kind==='cc').map(r=>r.email), bcc=entity.recipients.filter(r=>r.kind==='bcc').map(r=>r.email); if(!to.length)throw new Error(`'${entity.displayName}' has no 'To' recipients configured.`);
//     const now=new Date(); const isDA=['DA','DAYAHEAD','DAY AHEAD','DAY-AHEAD'].includes(parsed.revision.trim().toUpperCase()); const effectiveDate=isDA?new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(now.getTime()+86400000)).replaceAll('/','-'):parsed.dateStr;
//     const ctx={entity_key:parsed.entityKey,display_name:entity.displayName,date:effectiveDate,revision:parsed.revision,punch_time:fmtDateTime(now),filename:attachmentFilename,blocks_table:''}; let subject=template(entity.subjectTemplate,ctx), text=template(entity.bodyTemplate,ctx); if(isDA)subject=`${subject} — ${attachmentFilename}`;
//     recipients=[...to,...cc,...bcc]; await sendEmail({to,cc,bcc,subject,text,html:`<pre style="font-family:inherit">${escapeHtml(text)}</pre>`,attachment:{filename:attachmentFilename,bytes:outputBytes},account:entity.smtpAccount||'default'});
//     const fileId=await saveFile(attachmentFilename,outputBytes); const log=await SendLog.create({entityId:entity._id,entityKey:parsed.entityKey,displayName:entity.displayName,region:entity.region,filename:attachmentFilename,sentAt:now,recipients,status,error,fileId,fileSize:outputBytes.length}); res.json({ok:true,log,subject,text});
//   }catch(e){status='failed';error=e.message; if(entity){let fileId=null; if(outputBytes){try{fileId=await saveFile(req.file?.originalname||'failed.csv',outputBytes);}catch{}} const log=await SendLog.create({entityId:entity._id,entityKey:parsed?.entityKey||entity.entityKey,displayName:entity.displayName,region:entity.region,filename:req.file?.originalname||'unknown',sentAt:new Date(),recipients,status,error,fileId,fileSize:outputBytes?.length||0}); return res.status(500).json({error:e.message,log});} res.status(500).json({error:e.message});}
// });

// app.get('/api/logs',requireAdmin,async(req,res)=>{const q={}; if(req.query.from||req.query.to){q.sentAt={}; if(req.query.from)q.sentAt.$gte=new Date(`${req.query.from}T00:00:00+05:30`); if(req.query.to)q.sentAt.$lte=new Date(`${req.query.to}T23:59:59+05:30`);} if(req.query.region)q.region=req.query.region; if(req.query.search){const s=new RegExp(req.query.search,'i');q.$or=[{filename:s},{displayName:s},{entityKey:s}];} res.json(await SendLog.find(q).sort({sentAt:-1}).limit(Number(req.query.limit||1000)).lean());});
// app.get('/api/logs/today',requireAdmin,async(req,res)=>{const today=fmtDate(new Date()); const rows=await SendLog.find({status:'sent'}).sort({sentAt:-1}).limit(500).lean(); res.json(rows.filter(r=>fmtDate(r.sentAt)===today));});
// app.get('/api/logs/:id/download',requireAdmin,async(req,res)=>{const log=await SendLog.findById(req.params.id).lean(); if(!log?.fileId)return res.status(404).json({error:'File not found'}); const files=await mongoose.connection.db.collection('uploads.files').findOne({_id:new ObjectId(log.fileId)}); if(!files)return res.status(404).json({error:'File not found'}); res.setHeader('Content-Disposition',`attachment; filename="${log.filename.replaceAll('"','')}"`);res.setHeader('Content-Type','text/csv'); bucket.openDownloadStream(new ObjectId(log.fileId)).pipe(res);});
// app.get('/api/stats',requireAdmin,async(req,res)=>{const count=await Entity.countDocuments(); const rows=await SendLog.find({status:'sent'}).sort({sentAt:-1}).limit(500).lean(); const today=fmtDate(new Date()); res.json({entitiesCount:count,sentTodayCount:rows.filter(r=>fmtDate(r.sentAt)===today).length});});
// app.post('/api/seed/south',requireAdmin,async(req,res)=>{const plants=[{displayName:'PVG Adani KA Nine + Parampujya',posName:'PVG_AdaniKANine, PVG_PARAMPUJYA',energyType:'SOLAR',smtpAccount:'energymeteo_ops1',to:['ops_sch@reconnectenergy.com','ravi.kiran@reconnectenergy.com','ops_dynamic@reconnectenergy.com'],cc:['Rakesh.Dash@adani.com','Jairaj.Bayad@adani.com','Dixit.Pampaniya@adani.com','sabarigirishan.bhrugubanda@adani.com','indian-operations@energymeteo.com','indian-operations3@energymeteo.com']},{displayName:'PVG Avaada Solar',posName:'PVG_AVAADASOLAR',energyType:'SOLAR',smtpAccount:'gmail_forecasting2',to:['ops_sch@reconnectenergy.com','ops_dynamic@reconnectenergy.com'],cc:['mohammad.junaid@avaada.com','basavaraj.pujari@avaada.com','dhiren.bhatt@avaada.com']},{displayName:'PVG Avaada Solarise',posName:'PVG_AvaadaSolarise',energyType:'SOLAR',smtpAccount:'gmail_forecasting2',to:['ops_sch@reconnectenergy.com','ops_dynamic@reconnectenergy.com'],cc:['mohammad.junaid@avaada.com','basavaraj.pujari@avaada.com','dhiren.bhatt@avaada.com']}]; const messages=[]; for(const p of plants){const first=p.posName.split(',')[0].trim();let e=await Entity.findOne({posName:{$regex:`(^|,\\s*)${escapeRegex(first)}(\\s*,|$)`,$options:'i'}}); const recipients=[...p.to.map(email=>({email,kind:'to'})),...p.cc.map(email=>({email,kind:'cc'}))]; if(e){e.set({entityKey:'PVG_RES_QCA',displayName:p.displayName,region:'SRLDC',posName:p.posName,energyType:p.energyType,smtpAccount:p.smtpAccount,recipients});await e.save();messages.push(`Updated existing entity: ${p.displayName}`);}else{await Entity.create({entityKey:'PVG_RES_QCA',displayName:p.displayName,region:'SRLDC',posName:p.posName,energyType:p.energyType,smtpAccount:p.smtpAccount,subjectTemplate:DEFAULT_SUBJECT,bodyTemplate:DEFAULT_BODY,recipients});messages.push(`Created new entity: ${p.displayName}`);}} res.json({messages});});

// function escapeRegex(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
// function escapeHtml(s){return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');}
// async function saveFile(filename,bytes){const id=new ObjectId(); const uploadStream=bucket.openUploadStreamWithId(id,filename,{contentType:'text/csv'}); await new Promise((resolve,reject)=>{uploadStream.on('finish',resolve).on('error',reject);uploadStream.end(bytes);}); return id;}

// const PORT=Number(process.env.PORT||5000); connectDb().then(()=>{bucket=new GridFSBucket(mongoose.connection.db,{bucketName:'uploads'});app.listen(PORT,()=>console.log(`API listening on ${PORT}`));}).catch(e=>{console.error(e);process.exit(1);});


import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import {GridFSBucket,ObjectId} from 'mongodb';
import {connectDb} from './db.js';
import {Entity,ExcludedPosName,SendLog} from './models.js';
import {parseScheduleCsv,extractPosNamesSubset} from './csvParser.js';
import {adminLogin,requireAdmin} from './auth.js';
import {listAccounts,sendEmail} from './smtp.js';

const app=express(); const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:50*1024*1024}});
app.use(cors({origin:process.env.CLIENT_URL||'http://localhost:5173'})); app.use(express.json({limit:'2mb'}));
const DEFAULT_SUBJECT='Schedule Punch Update — {display_name} — {date} ({revision})';
const DEFAULT_BODY='Dear Team,\n\nPlease find attached the updated schedule for {display_name} ({entity_key}).\n\nDate: {date}\nRevision: {revision}\nSent at: {punch_time}\n\nRegards,\nScheduling Team\n';
let bucket;
function istDate(){return new Date(new Date().toLocaleString('en-US',{timeZone:'Asia/Kolkata'}));}
function fmtDate(d){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);}
function fmtDateTime(d){const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(d).reduce((o,x)=>(o[x.type]=x.value,o),{}); return `${p.day}-${p.month}-${p.year} ${p.hour}:${p.minute}`;}
function template(str,ctx){return String(str||'').replace(/\{(entity_key|display_name|date|revision|punch_time|filename|blocks_table)\}/g,(_,k)=>ctx[k]??'');}
function groupPosNames(posNames,entities){const groups=[]; const map=new Map(); for(const p of posNames){const e=entities.find(x=>(x.posName||'').split(',').map(v=>v.trim().toLowerCase()).includes(p.toLowerCase())); const key=e?`entity:${e._id}`:`pos:${p.toLowerCase()}`; if(!map.has(key)){const g={entity:e||null,posNames:[]};map.set(key,g);groups.push(g);} map.get(key).posNames.push(p);} return groups;}

app.get('/api/health',(req,res)=>res.json({ok:true}));
app.post('/api/auth/login',adminLogin);
app.get('/api/config/accounts',requireAdmin,(req,res)=>res.json({accounts:listAccounts()}));

app.get('/api/entities',requireAdmin,async(req,res)=>res.json(await Entity.find().sort({displayName:1}).lean()));
app.post('/api/entities',requireAdmin,async(req,res)=>{try{const b=req.body; if(!b.entityKey||!b.displayName)return res.status(400).json({error:'Entity key and display name are required.'}); const recipients=[]; for(const kind of ['to','cc','bcc']) for(const email of (b[kind]||[]).map(x=>String(x).trim()).filter(Boolean)) recipients.push({email,kind}); const e=await Entity.create({entityKey:b.entityKey,displayName:b.displayName,region:b.region||'',posName:b.posName||'',energyType:b.energyType||'',smtpAccount:b.smtpAccount||'default',subjectTemplate:b.subjectTemplate||DEFAULT_SUBJECT,bodyTemplate:b.bodyTemplate||DEFAULT_BODY,recipients}); res.status(201).json(e);}catch(e){res.status(400).json({error:e.message});}});
app.put('/api/entities/:id',requireAdmin,async(req,res)=>{try{const b=req.body; const update={}; for(const k of ['entityKey','displayName','region','posName','energyType','smtpAccount','subjectTemplate','bodyTemplate']) if(k in b) update[k]=b[k]; if(['to','cc','bcc'].some(k=>k in b)){update.recipients=[]; for(const kind of ['to','cc','bcc']) for(const email of (b[kind]||[]).map(x=>String(x).trim()).filter(Boolean)) update.recipients.push({email,kind});} const e=await Entity.findByIdAndUpdate(req.params.id,update,{new:true}); if(!e)return res.status(404).json({error:'Entity not found'}); res.json(e);}catch(e){res.status(400).json({error:e.message});}});
app.delete('/api/entities/:id',requireAdmin,async(req,res)=>{await Entity.findByIdAndDelete(req.params.id); res.json({ok:true});});

app.get('/api/excluded',requireAdmin,async(req,res)=>res.json(await ExcludedPosName.find().sort({originalCase:1}).lean()));
app.post('/api/excluded',requireAdmin,async(req,res)=>{const p=String(req.body.posName||'').trim(); if(!p)return res.status(400).json({error:'POS Name required'}); const e=await ExcludedPosName.findOneAndUpdate({posName:p.toLowerCase()},{posName:p.toLowerCase(),originalCase:p,note:req.body.note||''},{upsert:true,new:true});res.json(e);});
app.delete('/api/excluded/:posName',requireAdmin,async(req,res)=>{await ExcludedPosName.deleteOne({posName:req.params.posName.toLowerCase()});res.json({ok:true});});

app.post('/api/upload/parse',upload.single('file'),async(req,res)=>{try{if(!req.file)return res.status(400).json({error:'CSV file required'}); const parsed=parseScheduleCsv(req.file.buffer,req.file.originalname); const excluded=new Set((await ExcludedPosName.find({posName:{$in:parsed.posNames.map(x=>x.toLowerCase())}}).lean()).map(x=>x.originalCase.toLowerCase())); const active=parsed.posNames.filter(p=>!excluded.has(p.toLowerCase())); const entities=await Entity.find().lean(); const allGroups=groupPosNames(active,entities); const configured=allGroups.filter(g=>g.entity); const unconfigured=allGroups.filter(g=>!g.entity).flatMap(g=>g.posNames);
  /* Only configured POS Names are returned; this endpoint is public so only non-sensitive entity info is exposed (no recipients). */
  res.json({fileName:req.file.originalname,totalGroups:allGroups.length,meta:{entityKey:parsed.entityKey,dateStr:parsed.dateStr,revision:parsed.revision,posNames:configured.flatMap(g=>g.posNames),excludedPosNames:parsed.posNames.filter(p=>excluded.has(p.toLowerCase())),unconfiguredPosNames:unconfigured,energyTypes:parsed.energyTypes},groups:configured.map(g=>({posNames:g.posNames,entity:{_id:g.entity._id,displayName:g.entity.displayName,region:g.entity.region||''}}))});}catch(e){res.status(400).json({error:e.message});}});

app.post('/api/send',upload.single('file'),async(req,res)=>{
  let parsed; let outputBytes; let entity; let recipients=[]; let status='sent'; let error='';
  try{
    if(!req.file)return res.status(400).json({error:'CSV file required'});
    parsed=parseScheduleCsv(req.file.buffer,req.file.originalname);
    const target=JSON.parse(req.body.targetPosNames||'[]'); if(!target.length)return res.status(400).json({error:'targetPosNames required'});
    if(req.body.entityId&&mongoose.isValidObjectId(req.body.entityId)) entity=await Entity.findById(req.body.entityId);
    if(!entity)return res.status(400).json({error:'This POS Name is not configured. Ask an admin to add it in Manage Entities.'});
    outputBytes=extractPosNamesSubset(parsed,target); const attachmentFilename=JSON.parse(req.body.totalGroups||'1')>1?`${target.join('_')}_${req.file.originalname}`:req.file.originalname;
    const to=entity.recipients.filter(r=>r.kind==='to').map(r=>r.email), cc=entity.recipients.filter(r=>r.kind==='cc').map(r=>r.email), bcc=entity.recipients.filter(r=>r.kind==='bcc').map(r=>r.email); if(!to.length)throw new Error(`'${entity.displayName}' has no 'To' recipients configured.`);
    const now=new Date(); const isDA=['DA','DAYAHEAD','DAY AHEAD','DAY-AHEAD'].includes(parsed.revision.trim().toUpperCase()); const effectiveDate=isDA?new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(now.getTime()+86400000)).replaceAll('/','-'):parsed.dateStr;
    const ctx={entity_key:parsed.entityKey,display_name:entity.displayName,date:effectiveDate,revision:parsed.revision,punch_time:fmtDateTime(now),filename:attachmentFilename,blocks_table:''}; let subject=template(entity.subjectTemplate,ctx), text=template(entity.bodyTemplate,ctx); if(isDA)subject=`${subject} — ${attachmentFilename}`;
    recipients=[...to,...cc,...bcc]; await sendEmail({to,cc,bcc,subject,text,html:`<pre style="font-family:inherit">${escapeHtml(text)}</pre>`,attachment:{filename:attachmentFilename,bytes:outputBytes},account:entity.smtpAccount||'default'});
    const fileId=await saveFile(attachmentFilename,outputBytes); const log=await SendLog.create({entityId:entity._id,entityKey:parsed.entityKey,displayName:entity.displayName,region:entity.region,filename:attachmentFilename,sentAt:now,recipients,status,error,fileId,fileSize:outputBytes.length}); res.json({ok:true,log,subject,text});
  }catch(e){status='failed';error=e.message; if(entity){let fileId=null; if(outputBytes){try{fileId=await saveFile(req.file?.originalname||'failed.csv',outputBytes);}catch{}} const log=await SendLog.create({entityId:entity._id,entityKey:parsed?.entityKey||entity.entityKey,displayName:entity.displayName,region:entity.region,filename:req.file?.originalname||'unknown',sentAt:new Date(),recipients,status,error,fileId,fileSize:outputBytes?.length||0}); return res.status(500).json({error:e.message,log});} res.status(500).json({error:e.message});}
});

app.get('/api/logs',async(req,res)=>{const q={}; if(req.query.from||req.query.to){q.sentAt={}; if(req.query.from)q.sentAt.$gte=new Date(`${req.query.from}T00:00:00+05:30`); if(req.query.to)q.sentAt.$lte=new Date(`${req.query.to}T23:59:59+05:30`);} if(req.query.region)q.region=req.query.region; if(req.query.search){const s=new RegExp(escapeRegex(String(req.query.search)),'i');q.$or=[{filename:s},{displayName:s},{entityKey:s}];} res.json(await SendLog.find(q).sort({sentAt:-1}).limit(Number(req.query.limit||1000)).lean());});
app.get('/api/logs/today',async(req,res)=>{const today=fmtDate(new Date()); const rows=await SendLog.find({status:'sent'}).sort({sentAt:-1}).limit(500).lean(); res.json(rows.filter(r=>fmtDate(r.sentAt)===today));});
app.get('/api/logs/:id/download',async(req,res)=>{const log=await SendLog.findById(req.params.id).lean(); if(!log?.fileId)return res.status(404).json({error:'File not found'}); const files=await mongoose.connection.db.collection('uploads.files').findOne({_id:new ObjectId(log.fileId)}); if(!files)return res.status(404).json({error:'File not found'}); res.setHeader('Content-Disposition',`attachment; filename="${log.filename.replaceAll('"','')}"`);res.setHeader('Content-Type','text/csv'); bucket.openDownloadStream(new ObjectId(log.fileId)).pipe(res);});
app.get('/api/stats',async(req,res)=>{const count=await Entity.countDocuments(); const rows=await SendLog.find({status:'sent'}).sort({sentAt:-1}).limit(500).lean(); const today=fmtDate(new Date()); res.json({entitiesCount:count,sentTodayCount:rows.filter(r=>fmtDate(r.sentAt)===today).length});});
app.post('/api/seed/south',requireAdmin,async(req,res)=>{const plants=[{displayName:'PVG Adani KA Nine + Parampujya',posName:'PVG_AdaniKANine, PVG_PARAMPUJYA',energyType:'SOLAR',smtpAccount:'energymeteo_ops1',to:['ops_sch@reconnectenergy.com','ravi.kiran@reconnectenergy.com','ops_dynamic@reconnectenergy.com'],cc:['Rakesh.Dash@adani.com','Jairaj.Bayad@adani.com','Dixit.Pampaniya@adani.com','sabarigirishan.bhrugubanda@adani.com','indian-operations@energymeteo.com','indian-operations3@energymeteo.com']},{displayName:'PVG Avaada Solar',posName:'PVG_AVAADASOLAR',energyType:'SOLAR',smtpAccount:'gmail_forecasting2',to:['ops_sch@reconnectenergy.com','ops_dynamic@reconnectenergy.com'],cc:['mohammad.junaid@avaada.com','basavaraj.pujari@avaada.com','dhiren.bhatt@avaada.com']},{displayName:'PVG Avaada Solarise',posName:'PVG_AvaadaSolarise',energyType:'SOLAR',smtpAccount:'gmail_forecasting2',to:['ops_sch@reconnectenergy.com','ops_dynamic@reconnectenergy.com'],cc:['mohammad.junaid@avaada.com','basavaraj.pujari@avaada.com','dhiren.bhatt@avaada.com']}]; const messages=[]; for(const p of plants){const first=p.posName.split(',')[0].trim();let e=await Entity.findOne({posName:{$regex:`(^|,\\s*)${escapeRegex(first)}(\\s*,|$)`,$options:'i'}}); const recipients=[...p.to.map(email=>({email,kind:'to'})),...p.cc.map(email=>({email,kind:'cc'}))]; if(e){e.set({entityKey:'PVG_RES_QCA',displayName:p.displayName,region:'SRLDC',posName:p.posName,energyType:p.energyType,smtpAccount:p.smtpAccount,recipients});await e.save();messages.push(`Updated existing entity: ${p.displayName}`);}else{await Entity.create({entityKey:'PVG_RES_QCA',displayName:p.displayName,region:'SRLDC',posName:p.posName,energyType:p.energyType,smtpAccount:p.smtpAccount,subjectTemplate:DEFAULT_SUBJECT,bodyTemplate:DEFAULT_BODY,recipients});messages.push(`Created new entity: ${p.displayName}`);}} res.json({messages});});

function escapeRegex(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
function escapeHtml(s){return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');}
async function saveFile(filename,bytes){const id=new ObjectId(); const uploadStream=bucket.openUploadStreamWithId(id,filename,{contentType:'text/csv'}); await new Promise((resolve,reject)=>{uploadStream.on('finish',resolve).on('error',reject);uploadStream.end(bytes);}); return id;}

const PORT=Number(process.env.PORT||5000); connectDb().then(()=>{bucket=new GridFSBucket(mongoose.connection.db,{bucketName:'uploads'});app.listen(PORT,()=>console.log(`API listening on ${PORT}`));}).catch(e=>{console.error(e);process.exit(1);});