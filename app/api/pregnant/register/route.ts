import {NextRequest,NextResponse} from 'next/server';
import {requireApiPermission} from '@/utils/auth/api';
import {normalizeZone} from '@/utils/maternalRegistration';
import {isValidBloodPressure} from '@/utils/maternalForm';
import {validDate,localDate} from '@/utils/calendar';

export async function POST(request:NextRequest){
  try {
    if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return new Response(null,{status:403});
    const auth=await requireApiPermission();if(auth.error)return auth.error;
    if(auth.role!=='bhw')return NextResponse.json({error:'Only an active BHW can register patients.'},{status:403});
    const body=await request.json();const form=body?.form;
    if(!form||typeof form!=='object'||!/^[-0-9a-f]{36}$/i.test(body.requestId??'')||!Array.isArray(body.indicatorIds)||body.indicatorIds.length>100||body.indicatorIds.some((id:unknown)=>typeof id!=='string'||!/^[-0-9a-f]{36}$/i.test(id)))return NextResponse.json({error:'Invalid registration request.'},{status:400});
    const zone=normalizeZone(form.purok);
    if(!zone||(!auth.profile.access_all_zones&&auth.profile.purok!==zone))return NextResponse.json({error:'Choose your assigned zone. Contact an administrator if your assignment is missing or incorrect.'},{status:403});
    for(const key of ['first_name','last_name'])if(typeof form[key]!=='string'||!form[key].trim()||form[key].length>150)return NextResponse.json({error:'First and last name are required (maximum 150 characters). '},{status:400});
    for(const key of ['middle_name','address','contact_number','blood_pressure'])if(form[key]!=null&&(typeof form[key]!=='string'||form[key].length>1000))return NextResponse.json({error:'Invalid patient information.'},{status:400});
    if(!validDate(form.date_registered)||form.date_registered>localDate()||(['lmp','edd'].some(key=>form[key]&&!validDate(form[key]))))return NextResponse.json({error:'Provide valid registration and pregnancy dates.'},{status:400});
    for(const [key,min,max] of [['age',10,55],['gravida',0,30],['para',0,30],['height_cm',50,250],['weight_kg',1,300],['latitude',-90,90],['longitude',-180,180]] as const){
      if(form[key]!=null&&form[key]!==''){const value=Number(form[key]);if(!Number.isFinite(value)||value<min||value>max||(['age','gravida','para'].includes(key)&&!Number.isInteger(value)))return NextResponse.json({error:`Invalid ${key.replaceAll('_',' ')}.`},{status:400});}
    }
    if(form.blood_pressure&&!isValidBloodPressure(form.blood_pressure))return NextResponse.json({error:'Blood pressure must use the format 120/80.'},{status:400});
    const {data,error}=await auth.supabase.rpc('register_mother',{request_uuid:body.requestId,mother_data:{...form,purok:zone},indicator_ids:body.indicatorIds});
    if(error)return NextResponse.json({error:error.code==='42501'?'Registration is not permitted for your assigned zone.':error.message},{status:error.code==='42501'?403:400});
    return NextResponse.json({data});
  }catch{return NextResponse.json({error:'Registration could not be completed. Your form is preserved; please try again.'},{status:500});}
}
