/* One-time migration from the supplied Streamlit SQLite database to MongoDB.
 * Usage:
 *   node src/migrateSqlite.js /path/to/old/portal.db
 *
 * This migrates entities, recipients, excluded POS names and send-log metadata.
 * It also copies send_log.file_blob into MongoDB GridFS when present.
 */
import 'dotenv/config';
import Database from 'better-sqlite3';
import mongoose from 'mongoose';
import {ObjectId,GridFSBucket} from 'mongodb';
import {connectDb} from './db.js';
import {Entity,ExcludedPosName,SendLog} from './models.js';

const path=process.argv[2];
if(!path){console.error('Usage: node src/migrateSqlite.js /path/to/portal.db');process.exit(1)}
await connectDb(); const sqlite=new Database(path,{readonly:true}); const bucket=new GridFSBucket(mongoose.connection.db,{bucketName:'uploads'});
const entityMap=new Map();
for(const r of sqlite.prepare('SELECT * FROM entities ORDER BY id').all()){
  const oldRecipients=sqlite.prepare('SELECT email,kind FROM recipients WHERE entity_id=?').all(r.id);
  const e=await Entity.findOneAndUpdate({entityKey:r.entity_key,displayName:r.display_name,posName:r.pos_name||''},{entityKey:r.entity_key,displayName:r.display_name,region:r.region||'',posName:r.pos_name||'',energyType:r.energy_type||'',smtpAccount:r.smtp_account||'default',subjectTemplate:r.subject_template,bodyTemplate:r.body_template,recipients:oldRecipients},{upsert:true,new:true,setDefaultsOnInsert:true});
  entityMap.set(r.id,e._id);
}
for(const r of sqlite.prepare('SELECT * FROM excluded_pos_names').all()) await ExcludedPosName.updateOne({posName:r.pos_name},{posName:r.pos_name,originalCase:r.original_case,note:r.note||''},{upsert:true});
for(const r of sqlite.prepare('SELECT * FROM send_log ORDER BY id').all()){
  let fileId=null; if(r.file_blob){fileId=new ObjectId(); const s=bucket.openUploadStreamWithId(fileId,r.filename||`legacy-${r.id}.csv`,{contentType:'text/csv'}); await new Promise((resolve,reject)=>{s.on('finish',resolve).on('error',reject);s.end(r.file_blob)});}
  await SendLog.create({entityId:entityMap.get(r.entity_id)||undefined,entityKey:r.entity_key,displayName:r.display_name,filename:r.filename,sentAt:r.sent_at?new Date(r.sent_at):new Date(),block1Num:r.block1_num||undefined,block2Num:r.block2_num||undefined,recipients:(r.recipients||'').split(',').map(x=>x.trim()).filter(Boolean),status:r.status==='failed'?'failed':'sent',error:r.error||'',fileId,fileSize:r.file_blob?.length||0});
}
console.log('Migration completed.'); sqlite.close(); await mongoose.disconnect();
