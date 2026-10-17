import 'server-only';
import type { SemaphoreSendResult } from './semaphore';
const BASE='https://api.sms-gate.app/3rdparty/v1';
let cached:{token:string;expires:number;account:string}|null=null;
export function gatewayConfigured(){return !!(process.env.SMS_GATEWAY_DEVICE_ID&&(process.env.SMS_GATEWAY_TOKEN||(process.env.SMS_GATEWAY_USERNAME&&process.env.SMS_GATEWAY_PASSWORD)));}
async function authorization(){
  if(process.env.SMS_GATEWAY_TOKEN)return `Bearer ${process.env.SMS_GATEWAY_TOKEN}`;
  const username=process.env.SMS_GATEWAY_USERNAME;const password=process.env.SMS_GATEWAY_PASSWORD;
  if(!username||!password)throw new Error('SMS Gateway cloud credentials are not configured.');
  if(cached&&cached.account===username&&cached.expires>Date.now()+60_000)return `Bearer ${cached.token}`;
  const response=await fetch(`${BASE}/auth/token`,{method:'POST',headers:{Authorization:'Basic '+Buffer.from(username+':'+password).toString('base64'),'Content-Type':'application/json'},body:JSON.stringify({ttl:3600,scopes:['messages:send','messages:read','devices:read']}),signal:AbortSignal.timeout(10_000),cache:'no-store'});
  if(!response.ok)throw new Error('SMS Gateway authentication failed. Check the cloud credentials.');
  const data=await response.json();if(typeof data.access_token!=='string')throw new Error('SMS Gateway returned no access token.');
  cached={token:data.access_token,expires:Math.min(Date.now()+3500_000,Date.parse(data.expires_at)||Date.now()+3500_000),account:username};
  return `Bearer ${cached.token}`;
}
export async function sendGatewayBatch(input:{numbers:string[];message:string}):Promise<SemaphoreSendResult>{
  const failure=(message:string,httpStatus:number):SemaphoreSendResult=>({ok:false,httpStatus,raw:null,recipients:[],batchError:message,accepted:false});
  if(!gatewayConfigured())return failure('Configure SMS Gateway Public Cloud credentials and a target device.',400);
  let auth:string;
  try{auth=await authorization();}catch{return failure('SMS Gateway authentication could not be established. No message was submitted.',401);}
  if(!input.numbers.length)return failure('No valid recipients.',400);
  let response:Response;
  try{response=await fetch(`${BASE}/messages`,{method:'POST',headers:{Authorization:auth,'Content-Type':'application/json'},body:JSON.stringify({textMessage:{text:input.message},phoneNumbers:input.numbers,deviceId:process.env.SMS_GATEWAY_DEVICE_ID,withDeliveryReport:true,...(process.env.SMS_GATEWAY_SIM_NUMBER?{simNumber:Number(process.env.SMS_GATEWAY_SIM_NUMBER)}:{})}),signal:AbortSignal.timeout(15_000),cache:'no-store'});}catch{return failure('Gateway submission outcome is unknown. Reconcile before retrying.',0);}
  let data:Record<string,unknown>;
  try{data=await response.json();}catch{return failure('Gateway response was unreadable; submission needs review.',response.ok?0:response.status);}
  if(!response.ok){if(response.status===401)cached=null;return failure(`SMS Gateway rejected the request (HTTP ${response.status}).`,response.status);}
  if(typeof data.id!=='string')return failure('Gateway returned no message identifier; review submission before retrying.',0);
  return {ok:true,httpStatus:response.status,raw:{id:data.id,state:data.state,deviceId:process.env.SMS_GATEWAY_DEVICE_ID},batchError:null,accepted:true,recipients:input.numbers.map(number=>({number,messageId:String(data.id),status:'queued',error:null}))};
}
export async function gatewayStatus(){
  return {accountId:process.env.SMS_GATEWAY_DEVICE_ID??null,accountName:'SMS Gateway Public Cloud',status:gatewayConfigured()?'Configured; delivery requires connected phone':'Not configured',creditBalance:null};
}
