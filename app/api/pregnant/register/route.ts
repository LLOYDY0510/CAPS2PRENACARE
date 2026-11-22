import { dispatchSmsEvent, dispatchRegistrationAdvice } from '@/utils/sms/events';

import {NextRequest,NextResponse} from 'next/server';
import {requireApiPermission} from '@/utils/auth/api';
import {normalizeZone} from '@/utils/maternalRegistration';
import {validateMaternalForm,MATERNAL_FIELDS} from '@/utils/maternalRecord';

export const maxDuration = 60;

export async function POST(request:NextRequest){
  try {
    if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return new Response(null,{status:403});
    const auth=await requireApiPermission();if(auth.error)return auth.error;
    if(auth.role!=='bhw')return NextResponse.json({error:'Only an active BHW can register patients.'},{status:403});
    const body=await request.json();const form=body?.form;
    if(!form||typeof form!=='object'||!/^[-0-9a-f]{36}$/i.test(body.requestId??'')||!Array.isArray(body.indicatorIds)||body.indicatorIds.length>100||body.indicatorIds.some((id:unknown)=>typeof id!=='string'||!/^[-0-9a-f]{36}$/i.test(id)))return NextResponse.json({error:'Invalid registration request.'},{status:400});
    const zone=normalizeZone(form.purok);
    if(!zone||(!auth.profile.access_all_zones&&auth.profile.purok!==zone))return NextResponse.json({error:'Choose your assigned zone. Contact an administrator if your assignment is missing or incorrect.'},{status:403});
    const validation=validateMaternalForm(form);
    if(validation)return NextResponse.json({error:validation},{status:400});
    const fields=Object.fromEntries(MATERNAL_FIELDS.map(key=>[key,form[key]??null]));
    const {data,error}=await auth.supabase.rpc('register_mother',{request_uuid:body.requestId,mother_data:{...fields,purok:zone},indicator_ids:body.indicatorIds});
    if(error)return NextResponse.json({error:error.code==='42501'?'Registration is not permitted for your assigned zone.':error.message},{status:error.code==='42501'?403:400});
    const savedMother = Array.isArray(data) ? data[0] : data;
    if (!savedMother || typeof savedMother.id !== 'string') return NextResponse.json({error:'The registration response is unavailable. Retry this same form to recover the saved record.'},{status:502});
    let sms;
    try { sms = await dispatchSmsEvent(`registration:${savedMother.id}`, auth.user.id); }
    catch { sms = { total: 1, submitted: 0, failed: 0, invalid: 0, blocked: 0, pending: 1, detail: 'Mother registered; SMS processing is unavailable. Check SMS status before retrying.' }; }
    if (savedMother.risk_level === 'high') {
      try {
        const advice = await dispatchRegistrationAdvice(savedMother.id, auth.user.id);
        if (advice) {
          sms = {
            total: sms.total + advice.total, submitted: sms.submitted + advice.submitted,
            failed: sms.failed + advice.failed, invalid: sms.invalid + advice.invalid,
            blocked: sms.blocked + advice.blocked, pending: sms.pending + advice.pending,
            dryRun: sms.dryRun ?? advice.dryRun,
            detail: [sms.detail, advice.detail].filter(Boolean).join(' ') || undefined,
          };
        } else {
          sms = { ...sms, detail: [sms.detail, 'High-risk advice is unavailable for this record.'].filter(Boolean).join(' ') };
        }
      } catch {
        sms = { ...sms, detail: [sms.detail, 'Mother registered; the high-risk advice SMS could not be sent.'].filter(Boolean).join(' ') };
      }
    }
    return NextResponse.json({data:savedMother,sms});
  }catch{return NextResponse.json({error:'Registration could not be completed. Your form is preserved; please try again.'},{status:500});}
}
