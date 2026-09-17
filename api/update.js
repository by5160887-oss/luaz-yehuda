export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'method_not_allowed'});
  if(req.body?.action==='toggle_task' && typeof req.body?.taskId==='string') return res.status(200).json({ok:true,local:true});
  if(process.env.WRITE_TOKEN && req.headers.authorization===`Bearer ${process.env.WRITE_TOKEN}`) return res.status(503).json({error:'database_not_configured'});
  return res.status(401).json({error:'unauthorized'});
}
