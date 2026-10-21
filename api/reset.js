import{connect}from'./db.js';
import{ensureAuthTables}from'./_auth.js';
import{runReset,ResetError}from'./_reset-core.js';
export default async function(req,res){
 if(req.method!=='POST')return res.status(405).json({error:'method_not_allowed'});
 try{
  const sql=await connect();
  await ensureAuthTables(sql);
  const run=tx=>runReset({query:(t,p)=>tx(t,p),body:req.body||{}});
  const result=typeof sql.transaction==='function'?await sql.transaction(run):await run(sql);
  res.json({ok:true,id:result.id});
 }catch(e){
  if(e instanceof ResetError)return res.status(e.status).json({error:e.error});
  res.status(503).json({error:'reset_unavailable'});
 }
}
