import nodemailer from 'nodemailer';

export function accounts(){
  try{return JSON.parse(process.env.SMTP_ACCOUNTS_JSON||'{}');}catch{return {};}
}
export function listAccounts(){return Object.keys(accounts());}
export async function sendEmail({to,cc,bcc,subject,text,html,attachment,account='default'}){
  const cfg=accounts()[account];
  if(!cfg) throw new Error(`SMTP account '${account}' is not configured. Available: ${listAccounts().join(', ')||'(none)'}`);
  const transporter=nodemailer.createTransport({host:cfg.host,port:Number(cfg.port),secure:Number(cfg.port)===465,auth:{user:cfg.username,pass:cfg.password},tls:cfg.use_tls===false?{rejectUnauthorized:false}:undefined});
  const info=await transporter.sendMail({from:cfg.from_email||cfg.username,to,cc,bcc,subject,text,html,attachments:attachment?[{filename:attachment.filename,content:attachment.bytes}]:[]});
  return info;
}
