import { mountDashboard, icon } from './dashboard.mjs';

export function parseDepositAmount(value) {
  const text=String(value).trim();
  if(!/^\d+(\.\d{1,2})?$/.test(text)) throw new Error('Enter a valid USD amount with up to two decimal places.');
  const cents=Math.round(Number(text)*100);
  if(!Number.isSafeInteger(cents)||cents>100000000) throw new Error('Enter an amount no greater than $1,000,000.');
  if(cents<5000) throw new Error('The minimum deposit is $50.');
  return cents;
}
export function depositHTML({preview=false}={}) {
  return `<div class="deposit-page"><div class="deposit-page-heading"><span class="deposit-heading-icon">${icon('deposit')}</span><div><h1>Deposit Crypto</h1><p>Deposit cryptocurrency to fund your account</p></div></div><div class="deposit-columns">
    <section class="deposit-panel new-deposit" aria-labelledby="new-deposit-title"><h2 id="new-deposit-title">${icon('wallet')} New Deposit</h2><div class="deposit-current-balance"><span>Current Balance</span><strong>$0.00</strong></div>
    <ol class="deposit-steps" aria-label="Deposit progress"><li class="current" aria-current="step"><span>1</span><span class="sr-only">Enter amount</span></li><li><span>2</span><span class="sr-only">Review amount</span></li><li><span>3</span><span class="sr-only">Payment</span></li></ol>
    <div id="deposit-step-content"><div class="deposit-step-heading"><h3>Enter Amount</h3><p>How much do you want to deposit?</p></div><form id="deposit-form" novalidate><label for="deposit-amount">Amount (USD)</label><div class="deposit-amount-field"><span aria-hidden="true">$</span><input id="deposit-amount" name="amount" type="number" inputmode="decimal" min="50" max="1000000" step="0.01" value="100.00" required aria-describedby="deposit-minimum deposit-error"></div><p id="deposit-minimum">Minimum deposit: $50</p><p id="deposit-error" class="deposit-error" role="alert" hidden></p><div class="deposit-presets" aria-label="Quick deposit amounts">${[50,100,250,500].map(value=>`<button type="button" data-amount="${value}">$${value}</button>`).join('')}</div><button class="deposit-continue" type="submit">Continue ${icon('arrow')}</button></form></div>
    <p class="deposit-availability">${preview?'Preview · ':''}Deposits are not enabled yet. No funds will be moved.</p></section>
    <section class="deposit-panel deposit-history" aria-labelledby="deposit-history-title"><h2 id="deposit-history-title"><svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 5v7l5 3"/></svg> Deposit History</h2><div class="deposit-history-empty">${icon('deposit')}<p>No deposit history</p></div></section>
  </div></div>`;
}
export function mountDeposit(root,options) {
  mountDashboard(root,{...options,view:'deposit',mainHTML:depositHTML(options)});
  const slot=root.querySelector('#deposit-step-content');
  const initial=slot.innerHTML;
  const steps=[...root.querySelectorAll('.deposit-steps li')];
  function bindAmount() {
    const form=root.querySelector('#deposit-form'),input=root.querySelector('#deposit-amount'),error=root.querySelector('#deposit-error');
    function clearError(){input.removeAttribute('aria-invalid');error.hidden=true;error.textContent='';}
    input.addEventListener('input',clearError);
    form.querySelectorAll('[data-amount]').forEach(button=>button.onclick=()=>{input.value=Number(button.dataset.amount).toFixed(2);clearError();input.focus();});
    form.onsubmit=event=>{
      event.preventDefault();clearError();
      let cents;
      try{cents=parseDepositAmount(input.value);}catch(e){error.textContent=e.message;error.hidden=false;input.setAttribute('aria-invalid','true');input.focus();return;}
      steps[0].classList.remove('current');steps[0].classList.add('complete');steps[0].removeAttribute('aria-current');steps[1].classList.add('current');steps[1].setAttribute('aria-current','step');
      slot.innerHTML=`<div class="deposit-step-heading"><h3 tabindex="-1">Review Amount</h3><p>Check your deposit details</p></div><div class="deposit-review"><span>Requested amount</span><strong>$${(cents/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</strong></div><div class="deposit-not-connected" role="status">${icon('shield')}<div><strong>Deposits are not available yet</strong><p>A payment provider and receiving wallets have not been connected. This amount has not been submitted. No deposit has been created.</p></div></div><button type="button" class="deposit-continue" disabled>Payment unavailable</button><button type="button" id="edit-deposit-amount" class="deposit-edit">Back to amount</button>`;
      slot.querySelector('h3').focus();
      root.querySelector('#edit-deposit-amount').onclick=()=>{steps[0].classList.add('current');steps[0].classList.remove('complete');steps[0].setAttribute('aria-current','step');steps[1].classList.remove('current');steps[1].removeAttribute('aria-current');slot.innerHTML=initial;bindAmount();root.querySelector('#deposit-amount').value=(cents/100).toFixed(2);root.querySelector('#deposit-amount').focus();};
    };
  }
  bindAmount();
  window.scrollTo(0,0);
}
