import{timingSafeEqual,createHash}from'node:crypto';
import{connect}from'./db.js';
const h=s=>createHash('sha256').update(String(s)).digest();
export const sha256hex=s=>createHash('sha256').update(String(s)).digest('hex');
let tablesReady=null;
export function ensureAuthTables(sql){tablesReady||=(async()=>{
 await sql`CREATE TABLE IF NOT EXISTS auth_codes(hash text PRIMARY KEY,id text NOT NULL,enabled boolean NOT NULL DEFAULT true,created_at timestamptz DEFAULT now())`;
 await sql`CREATE TABLE IF NOT EXISTS reset_records(hash text PRIMARY KEY,id text NOT NULL,enabled boolean NOT NULL DEFAULT true,code_keys jsonb NOT NULL,created_at timestamptz DEFAULT now())`;
 await sql`CREATE TABLE IF NOT EXISTS reset_attempts(key text PRIMARY KEY,count integer NOT NULL)`;
 await sql`CREATE TABLE IF NOT EXISTS settings(key text PRIMARY KEY,value text NOT NULL)`;
})();return tablesReady}
function envOk(code){let ok=false;for(const k of['APP_TOKEN','WRITE_TOKEN']){const v=process.env[k];if(v&&timingSafeEqual(h(code),h(v)))ok=true}return ok}
// A code is accepted when its SHA-256 is an enabled row in auth_codes. Otherwise, if the
// env bootstrap is not disabled (settings.auth_env_disabled='1', set by a successful
// reset), fall back to the APP_TOKEN/WRITE_TOKEN env vars so the original code keeps
// working until provisioning/reset moves it into the table.
export async function authorized(req){
 const m=/^Bearer (.+)$/.exec(req.headers?.authorization||'');
 if(!m)return false;
 const code=m[1];if(code.length>512)return false;
 let sql;
 try{sql=await connect();await ensureAuthTables(sql)}catch(e){return envOk(code)}
 const rows=await sql`SELECT enabled FROM auth_codes WHERE hash=${sha256hex(code)}`;
 if(rows.length)return rows[0].enabled===true;
 const flag=await sql`SELECT value FROM settings WHERE key='auth_env_disabled'`;
 if(flag.length&&flag[0].value==='1')return false;
 return envOk(code);
}
export async function requireAuth(req,res){
 if(await authorized(req))return true;
 res.status(401).json({error:'unauthorized'});
 return false;
}
