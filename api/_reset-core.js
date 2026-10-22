// One-time recovery-code reset. Pure logic with an injected query function so it is
// unit-testable without a database. Mirrors the Travel Bot design (tb:v1:*) on Neon.
// Recovery record row: reset_records.hash = SHA-256(recovery) ->
//   {id, enabled, code_keys:[SHA-256 of each active access-code hash to disable]}.
// Provisioning of that row is manual and approval-gated; this module only consumes it.
import{createHash}from'node:crypto';
const sha256hex=s=>createHash('sha256').update(String(s)).digest('hex');
const dayJerusalem=d=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
export class ResetError extends Error{constructor(error,status){super(error);this.error=error;this.status=status}}
export async function runReset({query,body,now=new Date(),hourLimit=5,dayLimit=20}){
 const rec=typeof body==='object'&&body?body.recovery:'',code=typeof body==='object'&&body?body.code:'';
 if(typeof rec!=='string'||!/^[A-Za-z0-9_-]{32,128}$/.test(rec))throw new ResetError('unauthorized',401);
 if(typeof code!=='string'||!/^[A-Za-z0-9_-]{12,128}$/.test(code))throw new ResetError('invalid_new_code',400);
 // Attempt caps counted before authentication; over the cap answers 429 and the recovery stays valid.
 const bump=async k=>{const r=await query('INSERT INTO reset_attempts(key,count) VALUES($1,1) ON CONFLICT(key) DO UPDATE SET count=reset_attempts.count+1 RETURNING count',[k]);return r[0].count};
 if(await bump('h:'+Math.floor(now.getTime()/3600000))>hourLimit)throw new ResetError('request_rate_limited',429);
 if(await bump('d:'+dayJerusalem(now))>dayLimit)throw new ResetError('request_rate_limited',429);
 const recHash=sha256hex(rec);
 const rows=await query('SELECT id,enabled,code_keys FROM reset_records WHERE hash=$1',[recHash]);
 const r=rows[0];
 if(!r||r.enabled!==true||typeof r.id!=='string'||!/^[\w-]{1,64}$/.test(r.id)||!Array.isArray(r.code_keys))throw new ResetError('unauthorized',401);
 // Order is crash-safe: the new code is live before anything is disabled or burned.
 await query('INSERT INTO auth_codes(hash,id,enabled) VALUES($1,$2,true) ON CONFLICT(hash) DO UPDATE SET id=$2,enabled=true',[sha256hex(code),r.id]);
 for(const k of r.code_keys)if(typeof k==='string'&&/^[0-9a-f]{64}$/.test(k))await query('UPDATE auth_codes SET enabled=false WHERE hash=$1 AND id=$2',[k,r.id]);
 await query("INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=$2",['auth_env_disabled','1']);
 await query('DELETE FROM reset_records WHERE hash=$1',[recHash]);
 return{id:r.id};
}
