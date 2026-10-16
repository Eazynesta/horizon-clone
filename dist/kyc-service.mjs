export const KYC_BUCKET='kyc-documents';
export const MAX_KYC_FILE_SIZE=6*1024*1024;
export function validateKycDetails(values,now=new Date()){
 const full_name=String(values.full_name||'').trim(),country=String(values.country||'').trim().toUpperCase(),document_type=values.document_type,date=String(values.date_of_birth||'');
 if(full_name.length<2||full_name.length>160)throw Error('Enter your full legal name (2–160 characters).');
 if(!/^[A-Z]{2}$/.test(country))throw Error('Choose your country of residence.');
 if(!['passport','national_id','drivers_license'].includes(document_type))throw Error('Choose a supported identity document.');
 const dob=new Date(date+'T00:00:00Z');const cutoff=new Date(Date.UTC(now.getUTCFullYear()-18,now.getUTCMonth(),now.getUTCDate()));
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(+dob)||dob.toISOString().slice(0,10)!==date||dob<new Date('1900-01-01')||dob>cutoff)throw Error('Enter a valid date of birth. You must be at least 18.');
 return {full_name,date_of_birth:date,country,document_type};
}
export async function validateKycFile(file){
 if(!file||!['image/jpeg','image/png'].includes(file.type))throw Error('Choose a JPG or PNG image.');
 if(file.size===0||file.size>MAX_KYC_FILE_SIZE)throw Error('Each photo must be smaller than 6 MB and cannot be empty.');
 const bytes=new Uint8Array(await file.slice(0,8).arrayBuffer()),png=[137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n),jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 if(!(file.type==='image/png'?png:jpeg))throw Error('The photo contents do not match its image format.');
 return file.type==='image/png'?'png':'jpg';
}
export function createKycService(accounts){const client=accounts.client;const checked=async result=>{const {data,error}=await result;if(error)throw error;return data;};
 async function user(){const u=await accounts.user({fresh:true});if(!u)throw Error('Please sign in to verify your identity.');return u;}
 async function load(){const u=await user();return checked(client.from('kyc_submissions').select('*').eq('user_id',u.id).maybeSingle());}
 async function draft(){const u=await user();let row=await checked(client.from('kyc_submissions').select('*').eq('user_id',u.id).maybeSingle());if(!row){const result=await client.from('kyc_submissions').insert({user_id:u.id}).select().single();if(result.error?.code==='23505')row=await load();else row=await checked(result);}if(['pending','verified'].includes(row.status))throw Error('Your submission is already in review or verified.');return row;}
 async function save(values){const details=validateKycDetails(values),row=await draft();return checked(client.from('kyc_submissions').update({...details,status:'draft'}).eq('id',row.id).select().single());}
 async function upload(slot,file){if(!['document_front','document_back','selfie'].includes(slot))throw Error('Invalid document slot.');const extension=await validateKycFile(file),row=await draft(),path=row.user_id+'/'+row.id+'/'+slot+'-'+crypto.randomUUID()+'.'+extension,storage=client.storage.from(KYC_BUCKET);await checked(storage.upload(path,file,{contentType:file.type,upsert:false,cacheControl:'0'}));const oldPath=row[slot+'_path'];try{const updated=await checked(client.from('kyc_submissions').update({[slot+'_path']:path,status:'draft'}).eq('id',row.id).select().single());if(oldPath)await storage.remove([oldPath]);return updated;}catch(error){await storage.remove([path]);throw error;}}
 async function submit(consent){if(consent!==true)throw Error('Confirm your consent before submitting.');const row=await draft();validateKycDetails(row);if(!row.document_front_path||!row.selfie_path||(row.document_type!=='passport'&&!row.document_back_path))throw Error('Upload all required photos before submitting.');return checked(client.from('kyc_submissions').update({status:'pending',consent_at:new Date().toISOString()}).eq('id',row.id).select().single());}
 async function removeDraft(){const row=await draft(),paths=[row.document_front_path,row.document_back_path,row.selfie_path].filter(Boolean);if(paths.length)await checked(client.storage.from(KYC_BUCKET).remove(paths));await checked(client.from('kyc_submissions').delete().eq('id',row.id));}
 return {load,save,upload,submit,removeDraft};
}
