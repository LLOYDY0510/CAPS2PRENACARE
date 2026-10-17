import 'server-only';
import { headers } from 'next/headers';
import { isIP } from 'node:net';
import { createAdminClient } from '@/utils/supabase/admin';
import type { Profile } from '@/types';

export async function recordActivity(profile: Profile|null, action:string, description:string, target?:string) {
  const requestHeaders=await headers(); const agent=requestHeaders.get('user-agent')?.slice(0,512)??null;
  const candidate=process.env.TRUSTED_CLIENT_IP_HEADER ? requestHeaders.get(process.env.TRUSTED_CLIENT_IP_HEADER)?.split(',')[0]?.trim() : undefined;
  const browser=agent?.includes('Edg/')?'Edge':agent?.includes('Firefox/')?'Firefox':agent?.includes('Chrome/')?'Chrome':agent?.includes('Safari/')?'Safari':agent?'Other':'Unknown';
  const {error}=await createAdminClient().from('activity_logs').insert({actor_id:profile?.id??null,actor_name:profile?.full_name??'System',actor_role:profile?.role??null,action,description:description.slice(0,1000),target_id:target??null,ip_address:candidate&&isIP(candidate)?candidate:null,user_agent:agent,browser,request_id:crypto.randomUUID()});
  if(error) throw new Error('Activity could not be recorded.');
}
