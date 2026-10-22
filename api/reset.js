import{connect}from'./db.js';
import{ensureAuthTables}from'./_auth.js';
import{runReset,ResetError}from'./_reset-core.js';
export default async function(req,res){
 if(req.method!=='POST')return res.status(405).json({error:'method_not_allowed'});
 try{
  const sql=await connect();
  await ensureAuthTables(sql);
  // @neondatabase/serverless v1 HTTP driver: sql.transaction expects an array of
  // queries, and the conventional sql(text,params) form is rejected - use sql.query.
  // The reset's crash-safe ordering (new code live before anything is disabled or
  // burned) does not need a transaction.
  const result=await runReset({query:(t,p)=>sql.query(t,p),body:req.body||{}});
  res.json({ok:true,id:result.id});
 }catch(e){
  if(e instanceof ResetError)return res.status(e.status).json({error:e.error});
  res.status(503).json({error:'reset_unavailable'});
 }
}
