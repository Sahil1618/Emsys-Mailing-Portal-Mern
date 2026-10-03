import mongoose from 'mongoose';

const RecipientSchema = new mongoose.Schema({
  email: {type:String, required:true, trim:true},
  kind: {type:String, enum:['to','cc','bcc'], required:true}
},{_id:true});

export const Entity = mongoose.model('Entity', new mongoose.Schema({
  entityKey:{type:String, required:true, trim:true},
  displayName:{type:String, required:true, trim:true},
  region:{type:String, default:''},
  posName:{type:String, default:''},
  energyType:{type:String, default:''},
  smtpAccount:{type:String, default:'default'},
  subjectTemplate:{type:String, default:'Schedule Punch Update — {display_name} — {date} ({revision})'},
  bodyTemplate:{type:String, default:'Dear Team,\n\nPlease find attached the updated schedule for {display_name} ({entity_key}).\n\nDate: {date}\nRevision: {revision}\nSent at: {punch_time}\n\nRegards,\nScheduling Team\n'},
  recipients:[RecipientSchema]
},{timestamps:true}));

export const ExcludedPosName = mongoose.model('ExcludedPosName', new mongoose.Schema({
  posName:{type:String,required:true,unique:true,lowercase:true,trim:true},
  originalCase:{type:String,required:true},
  note:{type:String,default:''}
},{timestamps:true}));

export const SendLog = mongoose.model('SendLog', new mongoose.Schema({
  entityId:{type:mongoose.Schema.Types.ObjectId,ref:'Entity'},
  entityKey:String,
  displayName:String,
  region:String,
  filename:String,
  sentAt:{type:Date,default:Date.now},
  block1Num:Number,
  block2Num:Number,
  recipients:[String],
  status:{type:String,enum:['sent','failed'],required:true},
  error:String,
  fileId:{type:mongoose.Schema.Types.ObjectId},
  fileSize:Number
},{timestamps:true}));
