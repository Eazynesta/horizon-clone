import test from 'node:test';import assert from 'node:assert/strict';import {validateKycDetails,validateKycFile,createKycService} from '../dist/kyc-service.mjs';import {kycWelcomeHTML} from '../dist/kyc.mjs';
const details={full_name:'Test Person',date_of_birth:'1990-01-01',country:'ke',document_type:'passport'};
test('KYC details enforce age, valid calendar dates and supported documents',()=>{assert.equal(validateKycDetails(details).country,'KE');for(const v of [{...details,date_of_birth:'2026-01-01'},{...details,date_of_birth:'2000-02-30'},{...details,document_type:'other'},{...details,full_name:'x'},{...details,country:''}])assert.throws(()=>validateKycDetails(v));});
test('uploads reject empty, excessive, spoofed and unsupported files',async()=>{const png=new File([new Uint8Array([137,80,78,71,13,10,26,10])],'image.png',{type:'image/png'});assert.equal(await validateKycFile(png),'png');for(const file of [new File([],'empty.png',{type:'image/png'}),new File(['bad'],'fake.png',{type:'image/png'}),new File(['pdf'],'file.pdf',{type:'application/pdf'}),{type:'image/png',size:7*1024*1024}])await assert.rejects(validateKycFile(file));});
test('KYC service requires consent and rejects unrecognized slots before accessing storage',async()=>{const service=createKycService({client:{}});await assert.rejects(service.submit(false),/consent/);await assert.rejects(service.upload('unknown',null),/slot/);});
test('KYC welcome describes a real manual review without fake automatic approval or deletion promises',()=>{const html=kycWelcomeHTML();assert.match(html,/manual review/);assert.match(html,/Start Verification/);assert.doesNotMatch(html,/permanently deleted|less than 2 minutes|unlock higher/);});

test('all verification slots save private paths with canonical MIME types',async()=>{
 const row={id:'draft-id',user_id:'user-id',status:'draft'};
 const uploads=[];
 const storage={upload:async(path,file,options)=>{uploads.push({path,file,options});return {data:{path}};}};
 const client={
  storage:{from(bucket){assert.equal(bucket,'kyc-documents');return storage;}},
  from(table){
   assert.equal(table,'kyc_submissions');
   return {
    select:()=>({eq:()=>({maybeSingle:async()=>({data:{...row}})})}),
    update:patch=>({eq:()=>({select:()=>({single:async()=>({data:{...Object.assign(row,patch)}})})})})
   };
  }
 };
 const service=createKycService({client,user:async()=>({id:row.user_id})});
 const jpeg=new File([new Uint8Array([255,216,255,224])],'photo.jpg');
 for(const slot of ['document_front','document_back','selfie']){
  const updated=await service.upload(slot,jpeg);
  const upload=uploads.at(-1);
  assert.match(upload.path,new RegExp('^user-id/draft-id/'+slot+'-[a-f0-9-]+[.]jpg$'));
  assert.equal(upload.options.contentType,'image/jpeg');
  assert.equal(upload.file.type,'image/jpeg');
  assert.equal(updated[slot+'_path'],upload.path);
 }
 assert.equal(uploads.length,3);
});
