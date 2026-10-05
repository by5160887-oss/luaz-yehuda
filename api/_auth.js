import{timingSafeEqual,createHash}from'node:crypto';
const h=s=>createHash('sha256').update(String(s)).digest();
// True only if the request carries "Authorization: Bearer <token>" matching APP_TOKEN or WRITE_TOKEN.
// Fails closed: if neither env var is set, nothing is authorized.
export function authorized(req){
 const m=/^Bearer (.+)$/.exec(req.headers?.authorization||'');
 if(!m)return false;
 let ok=false;
 for(const k of['APP_TOKEN','WRITE_TOKEN']){const v=process.env[k];if(v&&timingSafeEqual(h(m[1]),h(v)))ok=true}
 return ok;
}
export function requireAuth(req,res){
 if(authorized(req))return true;
 res.status(401).json({error:'unauthorized'});
 return false;
}
