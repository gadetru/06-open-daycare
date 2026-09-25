import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'fs';
function loadEnv(){
  const text=fs.readFileSync('.env','utf8');
  const env={};
  for(const line of text.split('\n')){
    const trimmed=line.trim();
    if(!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) continue;
    const idx=trimmed.indexOf('=');
    if(idx===-1) continue;
    const k=trimmed.slice(0,idx).trim();
    const v=trimmed.slice(idx+1).trim();
    env[k]=v;
  }
  return env;
}
const env=loadEnv();
const url=env.NEXT_PUBLIC_SUPABASE_URL;
const anon=env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const service=env.SUPABASE_SERVICE_ROLE_KEY;
console.log('url',url?.slice(0,30));
console.log('anon exists',!!anon);
console.log('service exists',!!service);
const admin=createClient(url, service, {auth:{autoRefreshToken:false,persistSession:false}});
const client=createClient(url, anon);

// try activation via admin directly mimicking activateParentAccount logic
const code='K9X2P';
const email='maria.test.e2e@example.com';
const password='Test123456';

let invitation;
{
  const {data,error}=await admin.from('invitations').select('*').eq('code',code).single();
  console.log('invitation fetch',error?.message, data?.status, data?.email);
  invitation=data;
}
// check if already accepted, need new code if so
if(invitation?.status==='accepted'){
  console.log('invitation already accepted, creating new one');
  const newCode='Q2W8Z';
  const {data,error}=await admin.from('invitations').insert({
    child_id: '4fb600bd-9227-4efe-91e1-6dc0214fb4f7',
    invited_by: 'dddcc2c3-3452-4fe2-b00d-29defaac39c3',
    full_name: 'Test Activation',
    email: 'activetest.e2e@example.com',
    relationship: 'mother',
    code: newCode,
    status: 'pending',
    expires_at: new Date(Date.now()+7*24*3600*1000).toISOString(),
  }).select().single();
  console.log('new invitation',error?.message, data?.code);
  // use new
  const code2=newCode;
  const email2='activetest.e2e@example.com';
  // try create user
  const {data:u,error:e1}=await admin.auth.admin.createUser({email:email2, password, email_confirm:true, user_metadata:{role:'parent', full_name:'Test Activation'}});
  console.log('createUser',e1?.message, u?.user?.id);
  if(u?.user){
    const uid=u.user.id;
    // need daycare id
    const {data:child}=await admin.from('children').select('room_id, rooms(daycare_id)').eq('id','4fb600bd-9227-4efe-91e1-6dc0214fb4f7').single();
    console.log('child',child);
    const daycareId=child.rooms.daycare_id;
    console.log('daycare',daycareId);
    const {error:e2}=await admin.from('users').insert({id:uid, daycare_id:daycareId, role:'parent', status:'active', full_name:'Test Activation'});
    console.log('users insert',e2?.message);
    const {error:e3}=await admin.from('parent_children').insert({parent_id:uid, child_id:'4fb600bd-9227-4efe-91e1-6dc0214fb4f7', relationship:'mother'});
    console.log('parent_children',e3?.message);
    const {error:e4}=await admin.from('invitations').update({status:'accepted', accepted_at:new Date().toISOString()}).eq('code',code2);
    console.log('inv update',e4?.message);
    // try login
    const {data:login,error:loginErr}=await client.auth.signInWithPassword({email:email2,password});
    console.log('login',loginErr?.message, login?.user?.id);
    // cleanup: delete user and invitation?
    // await admin.auth.admin.deleteUser(uid);
  }
} else {
  console.log('pending invitation exists, trying activation via admin flow');
  const {data:u,error:e1}=await admin.auth.admin.createUser({email, password, email_confirm:true, user_metadata:{role:'parent', full_name:invitation.full_name}});
  console.log('createUser pending',e1?.message, u?.user?.id);
  if(e1 && e1.message?.toLowerCase().includes('already')){
    console.log('already exists case works');
  }
  if(u?.user){
    const uid=u.user.id;
    const {data:child}=await admin.from('children').select('room_id, rooms(daycare_id)').eq('id',invitation.child_id).single();
    const daycareId=child.rooms.daycare_id;
    const {error:e2}=await admin.from('users').insert({id:uid, daycare_id:daycareId, role:'parent', status:'active', full_name:invitation.full_name});
    console.log('users insert pending',e2?.message);
    const {error:e3}=await admin.from('parent_children').insert({parent_id:uid, child_id:invitation.child_id, relationship:invitation.relationship});
    console.log('pc insert',e3?.message);
    const {error:e4}=await admin.from('invitations').update({status:'accepted', accepted_at:new Date().toISOString()}).eq('code',code);
    console.log('inv update',e4?.message);
    const {data:login,error:loginErr}=await client.auth.signInWithPassword({email,password});
    console.log('login pending',loginErr?.message, login?.user?.id);
  } else {
    // test invalid code case
    const {data:inv2}=await admin.from('invitations').select('*').eq('code','XXXXX').maybeSingle();
    console.log('invalid inv',inv2);
  }
}
