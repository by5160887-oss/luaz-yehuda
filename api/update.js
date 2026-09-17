import { neon } from '@neondatabase/serverless';
import { seed } from './state.js';
export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'method_not_allowed'});
  if(!process.env.DATABASE_URL) return res.status(503).json({error:'database_not_configured'});
  const isTaskOnly = req.body?.action==='toggle_task' && typeof req.body?.taskId==='string';
  const authorized = process.env.WRITE_TOKEN && req.headers.authorization===`Bearer ${process.env.WRITE_TOKEN}`;
  if(!isTaskOnly && !authorized) return res.status(401).json({error:'unauthorized'});
  try {
    const sql=neon(process.env.DATABASE_URL);
    await sql`CREATE TABLE IF NOT EXISTS app_state (id text PRIMARY KEY, data jsonb NOT NULL, updated_at timestamptz DEFAULT now())`;
    await sql`INSERT INTO app_state (id,data) VALUES ('main', ${seed}) ON CONFLICT (id) DO NOTHING`;
    const [row]=await sql`SELECT data FROM app_state WHERE id='main'`; let data=row.data;
    if(isTaskOnly){
      for(const day of data.days||[]) for(const task of day.tasks||[]) if(task.id===req.body.taskId) task.done=Boolean(req.body.done);
    } else if(req.body?.state && Array.isArray(req.body.state.days) && Array.isArray(req.body.state.goals)) {
      data={...req.body.state,updatedAt:new Date().toISOString()};
    } else return res.status(400).json({error:'invalid_payload'});
    await sql`UPDATE app_state SET data=${data}, updated_at=now() WHERE id='main'`;
    return res.status(200).json({ok:true,state:data});
  } catch(e){return res.status(500).json({error:'update_failed'});}
}
