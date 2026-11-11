import {icon} from './dashboard.mjs';
import {PAPER_PAIRS,INTERVALS} from './paper-bot.mjs';

export function botWorkspaceHTML({real=false}={}){
 const badge=real?'REAL ACCOUNT':'SIMULATED';
 return `<div class="bots-page paper-bots">
  <div class="paper-heading">
   <div><h1>${real?'Real Trading Bots':'Trading Bots'}</h1><p>Configure and run your ${real?'real':'paper'} trading strategies</p></div>
   <span class="paper-label">${real?badge:'SIMULATED · PAPER TRADING'}</span>
  </div>
  <div class="paper-notice">
   <strong>${real?'Real trading account':'Practice account only'}</strong>
   <p>${real?'Strategy controls and results use your connected trading service.':'Trades, prices and profits are generated. They are not real orders or investment returns. Paper funds cannot be deposited, withdrawn or transferred to your funded wallet.'}</p>
  </div>
  <section class="bots-panel bot-passkey" id="bot-activation">
   ${real?`<h2>${icon('shield')} Trading Service</h2><p id="real-bot-status" role="status">Connecting to trading service…</p>
   <button id="real-bot-refresh" type="button" class="secondary-button">Refresh</button>`:
   `<h2>${icon('shield')} Activate Your Bot</h2><p>Enter your activation code to unlock Pro Trading Bot v2.1.</p>
   <form id="bot-passkey-form"><label for="bot-passkey">Bot activation code</label><input id="bot-passkey" placeholder="Enter activation code" autocomplete="off" maxlength="40" required><button class="deposit-continue" type="submit">${icon('bolt')} Activate Bot</button></form>
   <p id="bot-passkey-feedback" role="status" class="transfer-caption"></p><p class="transfer-caption">This code unlocks a browser simulation. It is not an account sign-in passkey.</p>`}
  </section>
  <div id="paper-bot-workspace"${real?'':' hidden'}>
   <section class="bots-panel bot-settings"><h2>${icon('settings')} Bot Settings</h2><p>Stop the bot before changing its settings.</p>
    <form id="paper-settings"><fieldset class="bot-settings-fields"${real?' disabled':''}>
     <div class="bot-settings-grid">
      <div class="transfer-field"><label for="bot-asset">Trading Pair</label><select id="bot-asset" name="pair" required>${real?'<option value="">Choose a pair</option>':Object.keys(PAPER_PAIRS).map(pair=>`<option>${pair}</option>`).join('')}</select></div>
      <div class="transfer-field"><label for="bot-amount">${real?'Trade Amount (quote currency)':'Paper Trade Amount ($)'}</label><input id="bot-amount" name="amount" inputmode="decimal" ${real?'':'value="200.00" '}required></div>
      <div class="transfer-field"><label for="bot-interval">Trade Interval${real?' (seconds)':''}</label>${real?
       '<input id="bot-interval" name="interval" type="number" min="1" step="1" required>':
       `<select id="bot-interval" name="interval">${INTERVALS.map(n=>`<option value="${n}">${n===3600?'1 hour':n/60+' minute'+(n===60?'':'s')}</option>`).join('')}</select>`}</div>
      <div class="transfer-field"><label for="bot-leverage">${real?'Leverage':'Paper Leverage'}</label><input id="bot-leverage" name="leverage" type="number" min="1" ${real?'step="1"':'max="100" value="20"'} required></div>
     </div>
     <button class="secondary-button" type="submit">Save Settings</button><p id="bot-settings-feedback" role="status" class="transfer-caption"></p>
    </fieldset></form>
   </section>
   <section class="bots-panel my-bots"><h2>${icon('bots')} My Bots (1)</h2>
    <article class="paper-bot-card">
     <div class="paper-card-heading"><span class="paper-bot-symbol">${icon('bots')}</span><div><h3>Pro Trading Bot v2.1</h3><p>Algorithmic trading interface · ${real?'real strategy':'simulated strategy'}</p></div><span id="paper-status" class="paper-state">${real?'Unavailable':'Stopped'}</span></div>
     <div class="paper-bot-tags"><span id="paper-pair">${real?'Pair unavailable':'XAU/USD'}</span>${real?'':'<span>Balanced scenario</span>'}<span>${badge}</span></div>
     <div class="paper-progress"><div><span>Next ${real?'strategy run':'paper trade'}</span><strong id="paper-countdown">${real?'—':'Not running'}</strong></div><progress id="paper-progress" max="100" value="0"></progress></div>
     <div class="paper-stats">
      <div><span>Trades</span><strong id="paper-trades">${real?'—':'0'}</strong></div>
      <div><span>Win Rate</span><strong id="paper-win-rate">${real?'—':'0.0%'}</strong></div>
      <div><span>${real?'Realized P&amp;L':'Paper Profit'}</span><strong id="paper-profit">${real?'—':'$0.00'}</strong></div>
      <div><span>${real?'Strategy Balance':'Paper Balance'}</span><strong id="paper-balance">${real?'—':'$10,000.00'}</strong></div>
     </div>
     ${real?'':'<p class="transfer-caption">Generated scenario: 7 wins and 3 losses per completed block of 10 trades. Wins: $50–$60; losses: at most $15 per trade. Short sessions can have a different win rate. These are simulation rules, not a forecast.</p>'}
     <div class="paper-controls">
      <button id="paper-start" class="deposit-continue" type="button"${real?' disabled':''}>${icon('bolt')} Start ${real?'Real':'Paper'} Bot</button>
      <button id="paper-stop" class="transfer-back" type="button" disabled>Stop</button>
      ${real?'':'<button id="paper-reset" class="transfer-back" type="button">Reset Paper Account</button>'}
     </div>
     <p id="paper-feedback" role="status" class="transfer-caption"></p><div id="paper-last-trade"></div>
     <section class="paper-log"><div><h4>Bot Logs <span class="paper-label">${badge}</span></h4><small id="paper-log-count">0 entries</small></div><div id="paper-log"></div></section>
    </article>
   </section>
   <section class="bots-panel"><h2>${icon('trade')} ${real?'Real':'Paper'} Trade Log</h2><div id="paper-history"><p class="transfer-caption">${real?'Trade history unavailable.':'No simulated trades yet.'}</p></div></section>
  </div>
  ${real?'':'<p class="transfer-caption">Paper state is saved in this browser for the signed-in account. The bot runs while this page stays open, stops when you leave, and does not backfill trades while closed. No exchange connection is used.</p>'}
 </div>`;
}
