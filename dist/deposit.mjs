import { mountDashboard, icon } from './dashboard.mjs';
import { currencyFields, CURRENCIES, usd } from './transfer-ui.mjs';

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
    <ol class="deposit-steps" aria-label="Deposit progress"><li class="current" aria-current="step"><span>1</span><span class="sr-only">Enter amount</span></li><li><span>2</span><span class="sr-only">Currency and network</span></li><li><span>3</span><span class="sr-only">Payment</span></li></ol>
    <div id="deposit-step-content"><div class="deposit-step-heading"><h3>Enter Amount</h3><p>How much do you want to deposit?</p></div><form id="deposit-form" novalidate><label for="deposit-amount">Amount (USD)</label><div class="deposit-amount-field"><span aria-hidden="true">$</span><input id="deposit-amount" name="amount" type="number" inputmode="decimal" min="50" max="1000000" step="0.01" value="100.00" required aria-describedby="deposit-minimum deposit-error"></div><p id="deposit-minimum">Minimum deposit: $50</p><p id="deposit-error" class="deposit-error" role="alert" hidden></p><div class="deposit-presets" aria-label="Quick deposit amounts">${[50,100,250,500].map(value=>`<button type="button" data-amount="${value}">$${value}</button>`).join('')}</div><button class="deposit-continue" type="submit">Continue ${icon('arrow')}</button></form></div>
    <p class="deposit-availability">${preview?'Preview · ':''}Deposits are not enabled yet. No funds will be moved.</p></section>
    <section class="deposit-panel deposit-history" aria-labelledby="deposit-history-title"><h2 id="deposit-history-title"><svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 5v7l5 3"/></svg> Deposit History</h2><div class="deposit-history-empty">${icon('deposit')}<p>No deposit history</p></div></section>
  </div></div>`;
}
export function mountDeposit(root,options={}) {
  mountDashboard(root,{...options,view:'deposit',mainHTML:depositHTML(options)});
  const slot=root.querySelector('#deposit-step-content'),initial=slot.innerHTML;
  const steps=[...root.querySelectorAll('.deposit-steps li')];
  let cents=10000,currency='BTC',network=CURRENCIES.BTC.networks[0];
  function progress(step){steps.forEach((li,i)=>{li.classList.toggle('current',i===step-1);li.classList.toggle('complete',i<step-1);if(i===step-1)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current');});}
  function headingFocus(){slot.querySelector('h3')?.focus({preventScroll:true});}
  function amount(){progress(1);slot.innerHTML=initial;const form=root.querySelector('#deposit-form'),input=root.querySelector('#deposit-amount'),error=root.querySelector('#deposit-error');input.value=(cents/100).toFixed(2);
    function clearError(){input.removeAttribute('aria-invalid');error.hidden=true;error.textContent='';}
    input.addEventListener('input',clearError);
    form.querySelectorAll('[data-amount]').forEach(button=>button.onclick=()=>{input.value=Number(button.dataset.amount).toFixed(2);clearError();input.focus();});
    form.onsubmit=event=>{event.preventDefault();clearError();try{cents=parseDepositAmount(input.value);}catch(e){error.textContent=e.message;error.hidden=false;input.setAttribute('aria-invalid','true');input.focus();return;}selectCurrency();};
  }
  function selectCurrency(){progress(2);slot.innerHTML='<div class="deposit-step-heading"><h3 tabindex="-1">Select Currency &amp; Network</h3><p>Depositing '+usd(cents)+'</p></div><form id="deposit-network-form">'+currencyFields('deposit',currency,network)+'<div class="transfer-actions"><button type="button" class="transfer-back" id="deposit-back">← Back</button><button type="submit" class="deposit-continue">Generate Address '+icon('arrow')+'</button></div><p class="transfer-caption">Preview only. The next step shows an address placeholder.</p></form>';
    slot.querySelector('#deposit-currency').onchange=e=>{currency=e.target.value;network=CURRENCIES[currency].networks[0];selectCurrency();slot.querySelector('#deposit-currency').focus();};
    slot.querySelector('#deposit-network').onchange=e=>network=e.target.value;
    slot.querySelector('#deposit-back').onclick=()=>{amount();root.querySelector('#deposit-amount').focus();};
    slot.querySelector('form').onsubmit=e=>{e.preventDefault();payment();};headingFocus();
  }
  function payment(){progress(3);slot.innerHTML='<div class="deposit-step-heading"><h3 tabindex="-1">Deposit Address</h3><p>'+usd(cents)+' · '+currency+' · '+network+'</p></div><div class="qr-placeholder" aria-label="QR code placeholder"><span>'+icon('wallet')+'</span><strong>QR code placeholder</strong><small>Not a payment code</small></div><div class="transfer-field"><label for="placeholder-address">Wallet Address</label><input id="placeholder-address" value="Wallet address will appear here" readonly aria-describedby="address-note"></div><p id="address-note" class="transfer-caption">Placeholder only. No receiving wallet is connected. Do not send funds.</p><div class="deposit-review"><span>Deposit amount</span><strong>'+usd(cents)+'</strong></div><p class="transfer-placeholder-note" role="status">Waiting for payment integration. No deposit has been created.</p><div class="transfer-actions"><button type="button" id="deposit-currency-back" class="transfer-back">← Back</button><button type="button" id="deposit-start-over" class="deposit-continue">Start New Deposit</button></div>';slot.querySelector('#deposit-currency-back').onclick=selectCurrency;slot.querySelector('#deposit-start-over').onclick=()=>{amount();root.querySelector('#deposit-amount').focus();};headingFocus();}
  amount();window.scrollTo(0,0);
}
