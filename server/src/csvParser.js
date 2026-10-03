import {parse} from 'csv-parse/sync';

function cleanRows(bytes){return parse(bytes.toString('utf8').replace(/^\uFEFF/,''),{relax_column_count:true,skip_empty_lines:false});}
function distinct(values){const out=[]; for(const x of values||[]){const v=String(x??'').trim(); if(v&&!out.includes(v)) out.push(v);} return out;}

export function parseScheduleCsv(bytes,filename='schedule.csv'){
  const rows=cleanRows(bytes); let entityKey=null,dateStr=null,revision=null,blockHeaderIdx=null,posNameRowIdx=null; const meta={};
  for(let i=0;i<rows.length;i++){
    const row=rows[i]||[]; const label=String(row[0]??'').trim(); if(label.toLowerCase()==='block'){blockHeaderIdx=i;break;}
    if(label.toLowerCase()==='pos name') posNameRowIdx=i;
    if(row.length>1){const key=String(row[1]??'').trim().toLowerCase(); if(key==='scheduling entity') entityKey=String(row[2]??'').trim(); else if(key==='date') dateStr=String(row[2]??'').trim(); else if(key==='revision no') revision=String(row[2]??'').trim();}
    if(label) meta[label]=row.slice(1);
  }
  if(blockHeaderIdx===null) throw new Error("Could not find the 'Block' header row in this CSV — is this a standard schedule template export?");
  if(!entityKey) throw new Error("Could not find a 'Scheduling entity' value in this file — cannot identify which plant this belongs to.");
  const header=rows[blockHeaderIdx]; const columnHeaders=header.slice(1).map(x=>String(x??'').trim()); const n=columnHeaders.length;
  const source=(...keys)=>{for(const k of keys){const key=Object.keys(meta).find(x=>x.toLowerCase()===k); if(key) return meta[key];} return null;};
  const posValues=source('pos name')||[]; const posNames=distinct(posValues); const energyTypes=distinct(source('energy type')||[]); const genNames=source('buyer name','stu name','re generator name','down stream name','pos name');
  const columnPosNames=Array.from({length:n},(_,i)=>String(posValues[i]??'').trim());
  const columnLabels=columnHeaders.map((h,i)=>{const extra=String(genNames?.[i]??'').trim(); return extra?`${h} (${extra})`:`${h} [col ${i+1}]`;});
  const blocks={}; for(const row of rows.slice(blockHeaderIdx+1)){const raw=String(row?.[0]??'').trim(); if(!raw) continue; const bn=Number.parseInt(raw,10); if(Number.isNaN(bn)) continue; const values=row.slice(1,n+1).map(v=>String(v??'')); while(values.length<n) values.push(''); blocks[bn]=values;}
  return {entityKey,dateStr:dateStr||'',revision:revision||'',columnHeaders,columnLabels,blocks,filename,rows,blockHeaderIdx,posNames,energyTypes,columnPosNames,posNameRowIdx};
}

function csvString(rows){return '\uFEFF'+rows.map(row=>row.map(v=>{const s=String(v??''); return /[",\r\n]/.test(s)?`"${s.replaceAll('"','""')}"`:s;}).join(',')).join('\r\n')+'\r\n';}
export function extractPosNamesSubset(parsed,targetPosNames){
  if(parsed.posNameRowIdx===null || parsed.posNameRowIdx===undefined) return rebuild(parsed);
  const target=new Set(targetPosNames.map(x=>x.trim().toLowerCase())); const idx=[];
  for(let i=0;i<parsed.columnHeaders.length;i++) if(target.has((parsed.columnPosNames[i]||'').trim().toLowerCase())) idx.push(i);
  if(!idx.length || idx.length===parsed.columnHeaders.length) return rebuild(parsed);
  const rows=[]; rows.push(...parsed.rows.slice(0,parsed.posNameRowIdx));
  for(const row of parsed.rows.slice(parsed.posNameRowIdx)){const label=row[0]??''; const vals=row.slice(1); rows.push([label,...idx.map(i=>vals[i]??'')]);}
  return Buffer.from(csvString(rows),'utf8');
}
export function rebuild(parsed,mergedBlocks=parsed.blocks){
  const rows=[...parsed.rows.slice(0,parsed.blockHeaderIdx+1)]; const n=parsed.columnHeaders.length;
  for(let bn=1;bn<=96;bn++){const vals=mergedBlocks[bn]||[]; rows.push([String(bn),...Array.from({length:n},(_,i)=>vals[i]??'')]);}
  return Buffer.from(csvString(rows),'utf8');
}
export function splitByPosName(parsed){if(!parsed.posNames?.length || parsed.posNames.length<=1) return {[parsed.posNames?.[0]||'']:rebuild(parsed)}; const out={}; for(const p of parsed.posNames) out[p]=extractPosNamesSubset(parsed,[p]); return out;}
export function validateScheduleSums(parsed,tolerance=.5){let declared=-1; parsed.columnHeaders.forEach((h,i)=>{if(declared<0&&h.trim().toLowerCase().startsWith('declared')) declared=i;}); const schedules=parsed.columnHeaders.map((h,i)=>h.trim().toLowerCase()==='schedule'?i:-1).filter(i=>i>=0); if(declared<0||!schedules.length)return[]; const out=[]; for(const [bn,vals] of Object.entries(parsed.blocks)){const num=v=>Number.parseFloat(v)||0; const d=num(vals[declared]); const sum=schedules.reduce((a,i)=>a+num(vals[i]),0); const diff=Math.abs(d-sum); const allowed=Math.max(tolerance,.01*Math.abs(d)); if(diff>allowed) out.push({block:Number(bn),declared:d,scheduleSum:sum,diff});} return out;}
export function blocksTableText(parsed,nums){return nums.map(bn=>{const vals=parsed.blocks[bn]; return vals?`  Block ${bn}: `+parsed.columnLabels.map((l,i)=>`${l}=${vals[i]??''}`).join(', '):`  Block ${bn}: (not found in file)`;}).join('\n');}
export function blocksTableHtml(parsed,nums){const th=parsed.columnLabels.map(h=>`<th style="padding:4px 8px;border:1px solid #ccc">${esc(h)}</th>`).join(''); const rows=nums.map(bn=>{const vals=parsed.blocks[bn]; if(!vals)return ''; return `<tr><td style="padding:4px 8px;border:1px solid #ccc;font-weight:bold">${bn}</td>${vals.map(v=>`<td style="padding:4px 8px;border:1px solid #ccc">${esc(v)}</td>`).join('')}</tr>`;}).join(''); return `<table style="border-collapse:collapse;font-family:sans-serif;font-size:13px"><tr><th style="padding:4px 8px;border:1px solid #ccc">Block</th>${th}</tr>${rows}</table>`;}
function esc(x){return String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');}
