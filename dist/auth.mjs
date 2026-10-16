// Exact SDK version; never use an admin or service-role credential in this client.
export const SDK_URL = '/vendor/supabase-2.57.4.js';
let sdkPromise;
function loadSDK() {
  if (window.supabase) return Promise.resolve(window.supabase);
  if (!sdkPromise) sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script'); script.src = SDK_URL;
    script.onload = () => window.supabase ? resolve(window.supabase) : reject(new Error('Account client could not load. Please reload.'));
    script.onerror = () => { sdkPromise = null; script.remove(); reject(new Error('Account client could not load. Please reload.')); };
    document.head.append(script);
  });
  return sdkPromise;
}
export const PASSWORD_MIN_LENGTH = 8;

export function validatePassword(password, confirmation) {
  if (password.length < PASSWORD_MIN_LENGTH) throw new Error('Use a password with at least 8 characters.');
  if (password !== confirmation) throw new Error('Your passwords do not match.');
}
export function profileValues(values) {
  const first_name = String(values.firstName || '').trim();
  const last_name = String(values.lastName || '').trim();
  const phone = String(values.phone || '').replace(/[\s()-]/g, '');
  if (!first_name || !last_name || first_name.length > 80 || last_name.length > 80) {
    throw new Error('Enter your first and last name (up to 80 characters each).');
  }
  if (phone && !/^\+[1-9][0-9]{6,14}$/.test(phone)) {
    throw new Error('Enter your phone number with a country code, for example +254712345678.');
  }
  return { first_name, last_name, phone };
}
export function createAccountService(client, origin) {
  let verifiedUser=null, verifiedAt=0, userRequest, generation=0; const profiles=new Map();
  const clearUserCache=()=>{generation++;verifiedUser=null;verifiedAt=0;profiles.clear();};
  async function checked(result) {
    const { data, error } = await result;
    if (error) throw error;
    return data;
  }
  return {
    client,
    clearUserCache,
    async user({fresh=false}={}) {
      if(!fresh&&verifiedUser&&Date.now()-verifiedAt<60000)return verifiedUser;
      if(!userRequest){const current=generation;userRequest=checked(client.auth.getUser()).then(data=>{if(current!==generation)throw Error('Your session changed. Please sign in again.');verifiedUser=data.user;verifiedAt=Date.now();return verifiedUser;}).catch(error=>{clearUserCache();throw error;}).finally(()=>{userRequest=null;});}
      return userRequest;
    },
    async signUp(values) {
      validatePassword(values.password, values.confirmPassword);
      const data = profileValues(values);
      return checked(client.auth.signUp({
        email: values.email.trim(), password: values.password,
        options: { data, emailRedirectTo: `${origin}/auth/callback` }
      }));
    },
    async signIn(email, password) {
      clearUserCache();
      const data=await checked(client.auth.signInWithPassword({ email: email.trim(), password }));if(data.user){verifiedUser=data.user;verifiedAt=Date.now();}return data;
    },
    async signOut() { await checked(client.auth.signOut({ scope: 'local' })); clearUserCache(); },
    async resetPassword(email) {
      await checked(client.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${origin}/auth/callback?flow=recovery` }));
    },
    async resendConfirmation(email) {
      await checked(client.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: `${origin}/auth/callback` } }));
    },
    async changePassword(password, confirmation) {
      validatePassword(password, confirmation);
      await checked(client.auth.updateUser({ password }));
    },
    async changeEmail(email) {
      await checked(client.auth.updateUser({ email: email.trim() }, { emailRedirectTo: `${origin}/auth/callback` }));
    },
    async profile(user) {
      const cached=profiles.get(user.id);if(cached&&Date.now()-cached.at<60000)return cached.value;
      const row = await checked(client.from('profiles').select('id, first_name, last_name, phone, created_at').eq('id', user.id).maybeSingle());
      if (row) {profiles.set(user.id,{value:row,at:Date.now()});return row;}
      // Metadata is cosmetic only. Ownership always comes from the verified user.
      const metadata = user.user_metadata || {};
      const data = { id: user.id, first_name: String(metadata.first_name || '').slice(0, 80), last_name: String(metadata.last_name || '').slice(0, 80), phone: /^\+[1-9][0-9]{6,14}$/.test(metadata.phone || '') ? metadata.phone : '' };
      const result = await client.from('profiles').insert(data).select().single();
      if (result.error?.code === '23505') {
        return checked(client.from('profiles').select('*').eq('id', user.id).single());
      }
      return checked(result);
    },
    async saveProfile(userId, values) {
      const row=await checked(client.from('profiles').update(profileValues(values)).eq('id', userId).select().single());profiles.set(userId,{value:row,at:Date.now()});return row;
    }
  };
}
export async function connectAccounts() {
  const response = await fetch('/api/config', { cache: 'no-store', signal: AbortSignal.timeout(10000) });
  const config = await response.json();
  if (!response.ok) throw new Error(config.error || 'Account services are unavailable.');
  const { createClient } = await loadSDK();
  const client = createClient(config.supabaseUrl, config.supabasePublishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: 'pkce' }
  });
  return createAccountService(client, location.origin);
}
