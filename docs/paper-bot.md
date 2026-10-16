# Paper bot

Activation code: AT64KJ9Q1. This is a reusable browser simulation unlock code, not a WebAuthn credential, account authentication factor or secret payment credential.

The unlocked Pro Trading Bot v2.1 has editable pair, paper amount, interval and paper leverage. Its default paper balance is $10,000. Start produces one generated trade per selected interval while the page is open. Stop pauses the scenario; settings become editable. Leaving the page stops the timer. Reload restores history and settings in a stopped state. Reset clears only the browser paper account.

Each shuffled block of ten completed trades has seven wins and three losses. Winning paper trades generate $50–$60 inclusive; losses are at most $15 and remain below the paper stake for small trades. Synthetic entry and exit prices are consistent with side, paper leverage and generated P/L. Short sessions can show another observed win rate. All prices, logs and results are simulated and labelled. No order is submitted to an exchange.

State is stored in browser localStorage under a key containing the signed-in user ID, with a separate key for the anonymous preview. History and logs keep at most 100 entries. Paper profits never touch Supabase wallets, deposit requests, withdrawals or ledger entries, and cannot be withdrawn. Clearing browser storage removes paper history; there is no cross-device or closed-page execution.
