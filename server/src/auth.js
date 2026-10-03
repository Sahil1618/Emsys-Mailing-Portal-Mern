import jwt from 'jsonwebtoken';

export function adminLogin(req,res){
  const {password=''}=req.body||{};
  if(!process.env.ADMIN_PASSWORD || password!==process.env.ADMIN_PASSWORD) return res.status(401).json({error:'Incorrect password.'});
  const token=jwt.sign({role:'admin'},process.env.JWT_SECRET,{expiresIn:'12h'});
  res.json({token});
}
export function requireAdmin(req,res,next){
  try{
    const h=req.headers.authorization||'';
    const token=h.startsWith('Bearer ')?h.slice(7):'';
    const p=jwt.verify(token,process.env.JWT_SECRET);
    if(p.role!=='admin') throw new Error('not admin');
    next();
  }catch{res.status(401).json({error:'Admin authentication required.'});}
}
