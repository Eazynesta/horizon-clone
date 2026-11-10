import {icon} from './dashboard.mjs';
import {PAPER_PAIRS,INTERVALS} from './paper-bot.mjs';

export function botWorkspaceHTML({real=true}={}){
 const badge='REAL ACCOUNT';
 return `<div class="bots-page paper-bots">
  <div class="paper-heading">
   <div><h1>Real Trading Bots</h1><p>Configure and run your real trading strategies</p></div>
   <span class="paper-label">${badge}</span>
  </div>
  <div class="paper-notice">
   <strong>Real trading account</strong>
   <p>Strategy controls and results use your connected trading service.</p>
  </div>
  <section class="bots-panel bot-passkey" id="bot-activation">
   <h2>${icon('shield')} Activate Your Bot</h2>
   <p>Enter your activation code to unlock Pro Trading Bot v2.1.</p>
   <form id="bot-passkey-form">
     <label for="bot-passkey">Bot activation code</label>
     <input id="bot-passkey" placeholder="Enter activation code" autocomplete="off" maxlength="40" required>
     <button class="deposit-continue" type="submit">${icon('bolt')} Activate Bot</button>
   </form>
   <p id="bot-passkey-feedback" role="status" class="transfer-caption"></p>
  </section>
  <div id="paper-bot-workspace" hidden>
   <section class="bots-panel bot-settings"><h2>${icon('settings')} Bot Settings</h2><p>Stop the bot before changing its settings.</p>
    <form id="paper-settings"><fieldset class="bot-settings-fields">
     <div class="bot-settings-grid">
      <div class="transfer-field"><label for="bot-asset">Trading Pair</label><select id="bot-asset" name="pair" required>${Object.keys(PAPER_PAIRS).map(pair=>`<option>${pair}</option>`).join('')}</select></div>
      <div class="transfer-field"><label for="bot-amount">Trade Amount (quote currency)</label><input id="bot-amount" name="amount" inputmode="decimal" value="200.00" required></div>
      <div class="transfer-field"><label for="bot-interval">Trade Interval (seconds)</label>
       <select id="bot-interval" name="interval">${INTERVALS.map(n=>`<option value="${n}">${n===3600?'1 hour':n/60+' minute'+(n===60?'':'s')}</option>`).join('')}</select></div>
      <div class="transfer-field"><label for="bot-leverage">Leverage</label><input id="bot-leverage" name="leverage" type="number" min="1" max="100" value="20" required></div>
     </div>
     <button class="secondary-button" type="submit">Save Settings</button><p id="bot-settings-feedback" role="status" class="transfer-caption"></p>
    </fieldset></form>
   </section>
   <section class="bots-panel my-bots"><h2>${icon('bots')} My Bots (1)</h2>
    <article class="paper-bot-card">
     <div class="paper-card-heading"><span class="paper-bot-symbol">${icon('bots')}</span><div><h3>Pro Trading Bot v2.1</h3><p>Algorithmic trading interface · real strategy</p></div><span id="paper-status" class="paper-state">Unavailable</span></div>
     <div class="paper-bot-tags"><span id="paper-pair">XAU/USD</span><span>${badge}</span></div>
     <div class="paper-progress"><div><span>Next strategy run</span><strong id="paper-countdown">Not running</strong></div><progress id="paper-progress" max="100" value="0"></progress></div>
     <div class="paper-stats">
      <div><span>Trades</span><strong id="paper-trades">0</strong></div>
      <div><span>Win Rate</span><strong id="paper-win-rate">0.0%</strong></div>
      <div><span>Realized P&amp;L</span><strong id="paper-profit">$0.00</strong></div>
      <div><span>Strategy Balance</span><strong id="paper-balance">$10,000.00</strong></div>
     </div>
     <div class="paper-controls">
      <button id="paper-start" class="deposit-continue" type="button">${icon('bolt')} Start Real Bot</button>
      <button id="paper-stop" class="transfer-back" type="button" disabled>Stop</button>
     </div>
     <p id="paper-feedback" role="status" class="transfer-caption"></p><div id="paper-last-trade"></div>
     <section class="paper-log"><div><h4>Bot Logs <span class="paper-label">${badge}</span></h4><small id="paper-log-count">0 entries</small></div><div id="paper-log"></div></section>
    </article>
   </section>
   <section class="bots-panel"><h2>${icon('trade')} Real Trade Log</h2><div id="paper-history"><p class="transfer-caption">Trade history unavailable.</p></div></section>
  </div>
 </div>`;
}