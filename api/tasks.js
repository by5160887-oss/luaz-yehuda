import{connect}from'./db.js';
const valid=t=>t&&typeof t.id==='string'&&typeof t.title==='string'&&t.title.trim()&&/^\d{4}-\d{2}-\d{2}$/.test(t.date)&&/^\d{2}:\d{2}$/.test(t.time);
export default async function(req,res){
 if(req.method!=='POST')return res.status(405).json({error:'method_not_allowed'});
 try{const sql=await connect(),[r]=await sql`SELECT data FROM app_state WHERE id='main'`,data=r.data,a=req.body?.action;data.syncQueue||=[];
 let found;for(const d of data.days||[]){let i=d.tasks.findIndex(t=>t.id===(req.body.taskId||req.body.task?.id));if(i>=0){found={d,i,t:d.tasks[i]};break}}
 if(a==='toggle_task'){if(!found)return res.status(404).json({error:'not_found'});found.t.done=!!req.body.done}
 else if(a==='add_task'||a==='edit_task'){let x=req.body.task;if(!valid(x))return res.status(400).json({error:'invalid_task'});if(a==='edit_task'&&!found)return res.status(404).json({error:'not_found'});let day=data.days.find(d=>d.date===x.date);if(!day){day={date:x.date,label:'יום',tasks:[]};data.days.push(day)}let item={...(found?.t||{}),id:x.id,title:x.title.trim(),time:x.time,kind:found?.t.kind||'work',done:found?.t.done||false,syncStatus:'pending'};if(found)found.d.tasks.splice(found.i,1);day.tasks.push(item);day.tasks.sort((p,q)=>p.time.localeCompare(q.time));data.syncQueue.push({operationId:'op-'+Date.now(),op:a==='add_task'?'create':'update',itemId:item.id,eventId:item.calendarEventId||null,payload:{title:item.title,date:x.date,time:item.time},queuedAt:new Date().toISOString()})}
 else if(a==='delete_task'){if(!found)return res.status(404).json({error:'not_found'});found.d.tasks.splice(found.i,1);data.syncQueue.push({operationId:'op-'+Date.now(),op:'delete',itemId:found.t.id,eventId:found.t.calendarEventId||null,queuedAt:new Date().toISOString()})}
 else return res.status(400).json({error:'invalid_action'});
 await sql`UPDATE app_state SET data=${JSON.stringify(data)}::jsonb,updated_at=now() WHERE id='main'`;res.json({ok:true,state:data})
 }catch(e){res.status(500).json({error:'update_failed'})}}
