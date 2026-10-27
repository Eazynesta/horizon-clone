import {mountAdmin} from './admin.mjs';
import {mountHelpChat} from './help-chat.mjs';
import {bindMobileNavigation} from './navigation.mjs';
import {passwordField,bindPasswordVisibility,countryPhoneField,normalizeSignupPhone} from './form-ui.mjs';
import { mountKyc } from './kyc.mjs';
import { mountHomeMarkets } from './home-markets.mjs';
import { connectAccounts } from './auth.mjs';
import { mountDashboard } from './dashboard.mjs';
import { mountDeposit } from './deposit.mjs';
import { mountWithdrawal } from './withdraw.mjs';
import { mountBots } from './bots.mjs';
import { mountTrade } from './trade.mjs';

const root = document.getElementById('root');
const home = root.innerHTML;
let accounts, accountsReady, connectionError, timer, routeId = 0, recoveryMode = false;
let signedInUser = null;
const $ = (selector, node = document) => node.querySelector(selector);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const input = (name, label, type = 'text', extra = '') => type==='password'?passwordField(name,label,extra): `<label class="field" for="${name}"><span>${label}</span><input id="${name}" name="${name}" type="${type}" ${extra}></label>`;
const passwordFields = `${input('password', 'Password', 'password', 'required minlength="8" maxlength="128" autocomplete="new-password"')}${input('confirmPassword', 'Confirm password', 'password', 'required minlength="8" maxlength="128" autocomplete="new-password"')}<p class="field-hint">Use at least 8 characters. A password manager can help.</p>`;
const emailField = input('email', 'Email', 'email', 'required maxlength="254" autocomplete="email" placeholder="you@example.com"');

function notice(text) {
  $('.notice')?.remove();
  const node = document.createElement('div');
  node.className = 'notice'; node.setAttribute('role', 'status'); node.textContent = text;
  document.body.append(node); setTimeout(() => node.remove(), 6000);
}
function message(form, text, error = false) {
  const node = $('[data-message]', form);
  node.textContent = text; node.className = error ? 'form-message error' : 'form-message success';
  node.setAttribute('role', error ? 'alert' : 'status');
}
function bindForm(id, action) {
  const form = document.getElementById(id);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const submit = $('button[type="submit"]', form);
    if (submit.disabled) return;
    const values = Object.fromEntries(new FormData(form));
    submit.disabled = true; form.setAttribute('aria-busy', 'true');
    const text = submit.textContent; submit.textContent = 'Please wait…'; message(form, '');
    try {
      if (!accounts) throw new Error(connectionError || 'Account services are connecting. Please try again.');
      await action(values, form);
    } catch (error) {
      // Supabase returns safe, user-facing auth errors. Never log auth payloads.
      const detail = error.message || 'Something went wrong. Please try again.';
      message(form, detail.includes('Failed to fetch') ? 'Unable to connect. Check your connection and try again.' : detail, true);
    } finally {
      submit.disabled = false; submit.textContent = text; form.removeAttribute('aria-busy');
    }
  });
}
function form(id, content, button, foot = '') {
  return `<form id="${id}" class="account-form"><div data-message class="form-message" aria-live="polite"></div>${content}<button class="primary-button" type="submit">${button}</button>${foot}</form>`;
}
function shell(title, description, content, wide = false) {
  root.innerHTML = `<main class="account-page"><a href="#/" class="back-link">← Back to home</a><section class="account-card ${wide ? 'wide' : ''}"><a href="#/" class="account-brand"><img src="/assets/aurex-logo.png" alt="Aurexmarkets Exchange"></a><p class="eyebrow">YOUR AUREXMARKETS ACCOUNT</p><h1 tabindex="-1">${title}</h1><p class="account-description">${description}</p>${content}</section></main>`;
  bindPasswordVisibility(root);
  $('h1', root)?.focus({ preventScroll: true }); window.scrollTo(0, 0);
}
function connectionBanner() {
  return accounts ? '' : `<p class="service-banner" role="status">${escape(connectionError || 'Connecting account services…')}</p>`;
}
function renderAuth(page) {
  const signup = page === 'signup';
  const foot = signup ? '<p class="account-foot">Already have an account? <a href="#/login">Sign in</a></p>' : '<a class="forgot-link" href="#/forgot-password">Forgot password?</a><p class="account-foot">New here? <a href="#/signup">Create an account</a></p>';
  const fields = signup
    ? '<div class="field-row">' + input('firstName', 'First name', 'text', 'required maxlength="80" autocomplete="given-name"') + input('lastName', 'Last name', 'text', 'required maxlength="80" autocomplete="family-name"') + '</div>' + emailField + countryPhoneField() + passwordFields
    : emailField + input('password', 'Password', 'password', 'required autocomplete="current-password"');
  shell(signup ? 'Create your account' : 'Welcome back', signup ? 'One account. Your profile, your preferences, your next step.' : 'Sign in to manage your Aurexmarkets Exchange account.', connectionBanner() + form('auth-form', fields, signup ? 'Create account' : 'Sign in', foot));
  bindForm('auth-form', async (v, f) => {
    if (signup) {
      const data = await accounts.signUp(normalizeSignupPhone(v));
      if (data.session) { location.hash = '/dashboard'; return; }
      f.reset();
      shell('Check your inbox', 'Follow the confirmation link to verify your email, then sign in. Open the link in this browser to complete verification.', '<p class="verification-icon" aria-hidden="true">✉</p><a class="primary-button" href="#/login">Go to sign in</a><p class="account-foot">Need another confirmation email? <a href="#/verify-email">Resend email</a></p>');
    } else {
      await accounts.signIn(v.email, v.password);
      f.reset(); location.hash = '/dashboard';
    }
  });
}
function renderEmailFlow(page) {
  const resend = page === 'verify-email';
  shell(resend ? 'Verify your email' : 'Forgot your password?', resend ? 'We’ll send you another account confirmation link.' : 'Enter your email and we’ll send a secure password reset link.', connectionBanner() + form('email-form', emailField, resend ? 'Resend confirmation' : 'Send reset link', '<p class="account-foot"><a href="#/login">Back to sign in</a></p>'));
  bindForm('email-form', async (v, f) => {
    if (resend) await accounts.resendConfirmation(v.email);
    else await accounts.resetPassword(v.email);
    f.reset();
    message(f, 'If an eligible account exists for that email, a link is on its way. Check your inbox and spam folder.');
  });
}
async function requireUser() {
  await accountsReady;
  if (!accounts) throw new Error(connectionError || 'Account services are unavailable.');
  const user = await accounts.user(); // Verified by Supabase, not just browser storage.
  if (!user) throw new Error('Please sign in to continue.');
  signedInUser = user;
  return user;
}
function renderPasswordPage() {
  shell('Choose a new password', 'Use a strong password that you haven’t used before.', form('password-form', passwordFields, 'Update password'));
  bindForm('password-form', async (v, f) => {
    await accounts.changePassword(v.password, v.confirmPassword);
    f.reset(); recoveryMode = false;
    notice('Password updated.'); location.hash = '/account';
  });
}
async function renderAccount(token) {
  let user;
  try { user = await requireUser(); }
  catch {
    if (token !== routeId) return;
    signedInUser = null;
    if (!accounts) shell('Account services unavailable', 'Please try again shortly.', connectionBanner() + '<a class="primary-button" href="#/login">Back to sign in</a>');
    else { location.hash = '/login'; notice('Please sign in to view your account.'); }
    return;
  }
  if (token !== routeId) return;
  let profile, profileError;
  try { profile = await accounts.profile(user); } catch (error) { profileError = error; }
  if (token !== routeId) return;
  const p = profile || {};
  const fields = '<div class="field-row">' + input('firstName', 'First name', 'text', 'required maxlength="80" autocomplete="given-name"') + input('lastName', 'Last name', 'text', 'required maxlength="80" autocomplete="family-name"') + '</div>' + input('phone', 'Phone number (optional)', 'tel', 'maxlength="24" autocomplete="tel" placeholder="International phone number"');
  shell('Your account', 'Manage your personal details and account security.', `
    <div class="account-summary"><div class="avatar" aria-hidden="true">${escape((p.first_name || user.email || 'H')[0].toUpperCase())}</div><div><strong>${escape([p.first_name, p.last_name].filter(Boolean).join(' ') || 'Aurexmarkets Exchange member')}</strong><p>${escape(user.email)}</p><span class="status-pill">${user.email_confirmed_at ? 'Email verified' : 'Email verification pending'}</span></div><button id="logout" class="secondary-button">Sign out</button></div>
    <div class="settings-grid"><section class="settings-panel"><h2>Personal details</h2>${profileError ? '<p class="form-message error">Your profile could not be loaded. Please try again later.</p>' : form('profile-form', fields, 'Save profile')}</section>
    <section class="settings-panel"><h2>Email address</h2><p class="field-hint">Confirm the change from the emails Supabase sends to your current and new addresses.</p>${form('email-change-form', input('email', 'New email address', 'email', 'required maxlength="254" autocomplete="email"'), 'Request email change')}</section>
    <section class="settings-panel"><h2>Password</h2>${form('change-password-form', passwordFields, 'Change password')}</section>
    <section class="settings-panel"><h2>Account information</h2><dl class="account-facts"><dt>Account created</dt><dd>${escape(new Date(user.created_at).toLocaleDateString())}</dd><dt>Last sign in</dt><dd>${escape(user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'This session')}</dd></dl><p class="field-hint">Market prices come from Kraken. Trading execution is not enabled. Deposits and withdrawals are reviewed manually.</p><a href="#/admin" id="account-admin-link" class="secondary-button" hidden>Finance Admin</a><a href="#/kyc" class="secondary-button">Identity verification</a><a href="#/dashboard" class="secondary-button">Open dashboard</a></section></div>`, true);
  accounts.client.from('finance_admin_memberships').select('user_id').eq('user_id',user.id).maybeSingle().then(({data})=>{if(data&&token===routeId)document.querySelector('#account-admin-link')?.removeAttribute('hidden');});
  if (profile) {
    $('#firstName').value = p.first_name; $('#lastName').value = p.last_name; $('#phone').value = p.phone;
    bindForm('profile-form', async (v) => { await accounts.saveProfile(user.id, v); notice('Profile saved.'); await route(); });
  }
  bindForm('email-change-form', async (v, f) => { await accounts.changeEmail(v.email); f.reset(); message(f, 'Check your current and new email inboxes to confirm the change.'); });
  bindForm('change-password-form', async (v, f) => { await accounts.changePassword(v.password, v.confirmPassword); f.reset(); message(f, 'Your password has been updated.'); });
  $('#logout').onclick = async event => {
    event.target.disabled = true;
    try { await accounts.signOut(); signedInUser = null; location.hash = '/login'; notice('You’re signed out.'); }
    catch { event.target.disabled = false; notice('Could not sign out. Check your connection and try again.'); }
  };
}
const slides = [
  ['Trade Crypto Like a Pro', 'Our platform provides real-time market data and professional trading tools to maximize your returns.'],
  ['Turn Idle Funds Into Powerful Assets', 'Experience seamless cryptocurrency trading with cutting-edge technology built for consistent performance.'],
  ['Grow Your Wealth Faster', 'Explore the crypto market with powerful tools and a seamless trading experience.']
];
function initHome() {
  bindMobileNavigation(root);
  mountHomeMarkets(root);
  const hero = $('section');
  if (!hero) return;
  const backgrounds = [...hero.children].filter(x => x.className.includes('transition-opacity'));
  const buttons = [...hero.querySelectorAll('button')].filter(x => !x.textContent.trim());
  let active = 0;
  function slide(n) {
    active = (n + 3) % 3;
    backgrounds.forEach((x, i) => { x.classList.toggle('opacity-100', i === active); x.classList.toggle('opacity-0', i !== active); });
    $('h1', hero).textContent = slides[active][0];
    $('h1', hero).nextElementSibling.textContent = slides[active][1];
    buttons.slice(2).forEach((b, i) => { b.style.background = i === active ? '#00ed87' : '#555'; b.setAttribute('aria-pressed', i === active); });
  }
  buttons.forEach((b, i) => {
    b.setAttribute('aria-label', i === 0 ? 'Previous slide' : i === 1 ? 'Next slide' : 'Show slide ' + (i - 1));
    b.onclick = () => slide(i === 0 ? active - 1 : i === 1 ? active + 1 : i - 2);
  });
  hero.querySelectorAll('button').forEach(b => { if (/Google Play|App Store/.test(b.textContent)) b.onclick = () => notice('The mobile app is not available yet.'); });
  if (signedInUser) root.querySelectorAll('a[href="#/login"], a[href="#/signup"]').forEach(a => { a.href = '#/dashboard'; a.textContent = 'Dashboard'; });
  slide(0);
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) timer = setInterval(() => slide(active + 1), 6500);
}

async function renderExchange(token, view) {
  const options={firstName:signedInUser?.user_metadata?.first_name||'there',view,
    getAccounts:async()=>{await accountsReady;if(!accounts)throw Error(connectionError||'Account services are unavailable.');return accounts;},
    onLogout:async()=>{await accountsReady;if(!accounts)throw Error('Account services unavailable.');await accounts.signOut();signedInUser=null;location.hash='/login';notice('You’re signed out.');}
  };
  ({admin:mountAdmin,deposit:mountDeposit,withdraw:mountWithdrawal,bots:mountBots,trade:mountTrade,kyc:mountKyc}[view]||mountDashboard)(root,options);
  let user;
  try{user=await requireUser();}
  catch{if(token!==routeId)return;if(!accounts){const main=root.querySelector('main');const error=document.createElement('p');error.className='service-banner';error.textContent=connectionError||'Account services unavailable. Please try again.';main.prepend(error);}else{signedInUser=null;location.hash='/login';notice('Please sign in to continue.');}return;}
  let profile;try{profile=await accounts.profile(user);}catch{}
  if(token!==routeId)return;
  if(view==='dashboard'||view==='markets'){
    const heading=root.querySelector('.dashboard-welcome h1');if(heading&&view!=='markets')heading.textContent='Welcome back, '+(profile?.first_name||user.user_metadata?.first_name||'there');
  }
}

async function route() {
  clearInterval(timer);
  root.onclick = null;
  const token = ++routeId;
  const page = location.hash.slice(2);

  if (page === 'admin-preview') {mountAdmin(root,{preview:true});return;}
  if (page === 'kyc-preview') { mountKyc(root,{preview:true});return; }
  if (page === 'trade-preview') { mountTrade(root, {preview:true}); return; }
  if (page === 'withdraw-preview') { mountWithdrawal(root, {preview:true}); return; }
  if (page === 'bots-preview') { mountBots(root, {preview:true}); return; }
  if (page === 'deposit-preview') { mountDeposit(root, { firstName: 'there', preview: true }); return; }
  if (page === 'dashboard-preview') { mountDashboard(root, { firstName: 'there', preview: true }); window.scrollTo(0, 0); return; }
  if (['admin','dashboard','deposit','withdraw','bots','trade','kyc'].includes(page) || (page === 'markets' && signedInUser)) return renderExchange(token, page);
  if (page === 'login' || page === 'signup') return renderAuth(page);
  if (page === 'forgot-password' || page === 'verify-email') return renderEmailFlow(page);
  if (page === 'account') {
    return renderAccount(token);
  }
  if (page === 'reset-password') {
    try { await requireUser(); }
    catch { if (token === routeId) { location.hash = '/forgot-password'; notice('Open a valid reset link or sign in first.'); } return; }
    if (token === routeId) renderPasswordPage();
    return;
  }
  root.innerHTML = home; initHome(); window.scrollTo(0, 0);
  if (page === 'markets') $('table')?.scrollIntoView();
  if (page === 'trade') notice('Trading is not enabled. You can manage your account from My account.');
}
async function initializeAccounts() {
  const callbackFlow=location.pathname==='/auth/callback';
  try {
    accounts = await connectAccounts();
    accounts.client.auth.onAuthStateChange((event, session) => {
      if(event==='SIGNED_OUT'||(event==='SIGNED_IN'&&signedInUser?.id!==session?.user?.id))accounts.clearUserCache();
      signedInUser = session?.user || null;
      if (event === 'PASSWORD_RECOVERY') recoveryMode = true;
      // Defer SDK calls outside the auth callback to avoid a session-lock deadlock.
      if (event === 'SIGNED_OUT' && ['#/admin', '#/account', '#/dashboard', '#/deposit', '#/withdraw', '#/bots', '#/trade', '#/kyc', '#/markets', '#/reset-password'].includes(location.hash)) {
        setTimeout(() => { location.hash = '/login'; }, 0);
      }
    });
    const url = new URL(location.href);
    if (url.pathname === '/auth/callback') {
      recoveryMode = url.searchParams.get('flow') === 'recovery';
      const code = url.searchParams.get('code');
      const callbackError = url.searchParams.get('error_description');
      if (callbackError || !code) throw new Error(callbackError || 'This confirmation link is incomplete or expired. Request a new email.');
      const { error } = await accounts.client.auth.exchangeCodeForSession(code);
      if (error) throw new Error('This link could not be completed. Open it in the browser where you requested it, or request a new link.');
      history.replaceState(null, '', '/#/' + (recoveryMode ? 'reset-password' : 'dashboard'));
      notice(recoveryMode ? 'Choose your new password.' : 'Your email link has been confirmed.');
    }
    const { data } = await accounts.client.auth.getSession();
    signedInUser = data.session?.user || null;
  } catch (error) {
    if (location.pathname === '/auth/callback') {
      history.replaceState(null, '', '/#/login');
      notice(error.message || 'Unable to complete this email link.');
    } else connectionError = error.message || 'Account services are unavailable.';
  }
  document.querySelector('.service-banner')?.remove();
  if(callbackFlow)setTimeout(()=>route().catch(()=>notice('Unable to open your account.')),0);

}
window.addEventListener('hashchange', () => { route().catch(() => notice('Unable to load this page. Please try again.')); });
mountHelpChat();
accountsReady=initializeAccounts();
route().catch(()=>notice('Unable to open this page. Please try again.'));
