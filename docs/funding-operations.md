# Manual finance operations

Production finance admin: https://aurexmarkets.vercel.app/#/admin

Sign in with the existing verified owner account nestaamwangi@gmail.com. Admin membership is held in a protected database table, never in editable profile metadata. No new owner password is created or needed. The header and account settings show Admin for an authorized account.

## Deposits

Seven owner-supplied routes are active with the expressly approved zero Aurex deposit charge: BTC/Bitcoin, ETH/Ethereum, USDT/TRON, USDT/BSC, USDT/Ethereum, USDC/BSC, USDC/Ethereum. All other routes remain unavailable. The supplied USDT/Solana address was an EVM address and is not configured. BSC token contracts are Binance-Peg USDT (BSC-USD) and USDC, displayed on the payment card. Stablecoin input precision is limited to six decimals, including BSC.

The customer selects a coin, network and native-asset amount. Generate Payment saves an intent and displays the owner's receiving address and a locally generated QR. The QR contains the address only; any memo must be entered separately. The customer reports the full transaction hash and transfer index. Reporting does not credit a balance.

In Admin, open the review queue, independently verify the chain, correct token contract, settlement/confirmations, actual received amount, destination address/memo, transaction transfer index, and depositor attribution. A public transaction hash alone does not prove ownership. Select Approve & Credit, enter the actual verified amount and review evidence. Approval credits the available wallet once and records a ledger entry. Reject invalid reports with a reason. Unsigned payment intents appear under All statuses.

## Withdrawals

Customers enter an external receiving address, the correct network, optional memo/tag, and amount. Only supported active routes accept requests. The database atomically moves the amount from available to reserved; overspending is blocked. Users can cancel a pending review request to restore their funds.

Use Start Processing before sending any funds. This claims the request for the current administrator and blocks customer cancellation. Independently verify the destination and network, then use your own wallet to send the requested amount. This application never broadcasts a transaction or holds wallet private keys.

After verifying the external payment, select Record Payment, enter its full transaction hash and actual network fee in the chain's native gas coin (BTC, ETH, BNB or TRX), and record evidence. This consumes the reserved balance once and shows the payout hash to the customer. The sending-wallet fee is recorded separately and is not silently deducted from customer site balances. One payout transaction hash is permitted per request; batch payouts are not supported.

Reject & Release is appropriate only when no funds were sent. It returns the reserved amount to available. Never reject/refund after broadcasting a payout. Previously created legacy test holds can be cancelled by their owners but are not payable withdrawal requests.

## Balance corrections

Select an account using email/name search, then choose asset, credit or debit, amount and a meaningful reason. Confirm the selected account and submit. This creates an audited available-balance adjustment; it never edits reserved withdrawals. Use deposit approval for received deposits to prevent duplicate manual credits. Negative available balances are blocked. Amounts are in native asset units; different coins are never added together as a fabricated USD balance.

## Fees and records

Current blockchain fee rates are shown with source and timestamp. Bitcoin illustrates 140 vB and native ETH/BNB illustrates 21,000 gas; actual wallet transactions can differ. Token totals require sender-specific gas/resource estimation. TRON displays live energy and bandwidth rates. Kraken supplies informational USD conversions when a native transfer estimate is available. Estimates expire after 60 seconds and are never charged automatically. Sending wallets determine the actual network fee.

Every privileged action records its administrator, reason, request/account, time and result. Wallet ledger entries reconcile available and reserved deltas. Public clients cannot edit balances, grant admin roles or mark requests paid directly. Sensitive operations require an existing live authenticated session and finance membership. Admin privileges can be revoked by a database operator.

## Verification

Run the Node test suite and tests/funding-database.sql as a single SQL editor execution. The SQL suite runs synthetic users, session claims, deposit approval, withdrawal reservation/cancellation/processing/payment, corrections and access checks inside a transaction and rolls everything back. No funds are sent. tests/manual-finance-live-check.cjs is an optional authenticated API check for explicitly authorized disposable accounts supplied through stdin, preferably in a separate test project. No test credentials are committed.
