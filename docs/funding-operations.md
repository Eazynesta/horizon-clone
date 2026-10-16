# Funding operations

Deposits are manual review. All 27 routes start disabled. Never enable a route until the owner confirms the exact public receiving address, network, optional memo/tag, and Aurex deposit charge. Never request private keys or seed phrases.

## Configuration

Use the Supabase SQL editor with an operator account. Validate each address using `validateAddress(network,address)` in `dist/funding-catalog.mjs`, independently verify that the owner controls it and supports the selected asset/network, and validate memo/tag using `validateMemo`. The QR encodes the address only; memos are displayed separately. An EVM address format does not prove support for every EVM network. Set `address`, `memo`, `deposit_fee` (native asset units, exact supported precision) and `enabled=true` on the matching row in `public.funding_routes`. Existing deposit requests retain their address and fee snapshots after rotation.

## Review

Inspect `public.funding_requests` for `kind=deposit,status=pending_review`. Independently verify the chain, receiving address, asset/token contract, memo/tag, successful settlement and confirmations, actual amount, transfer index, and depositor attribution. A submitted public hash alone does not prove who paid. Do not approve based on the claimed amount.

After verification, run `select finance.confirm_deposit(request_uuid, actual_native_asset_amount, verification_evidence);` as an operator. The function credits the net amount once and writes an immutable ledger entry. Reject invalid claims with an operator update to `status=rejected,review_note=...`; never mark confirmed by directly changing status. No operator browser key or service role key is shipped to clients.

## Simulation withdrawals

Only available funds can be held. Each request atomically moves the amount from available to reserved and records a ledger hold. No transfer, network fee or payout occurs. The account owner can cancel a held request once, returning the amount to available. There is no completed payout state. Wallet amounts are displayed per asset, without adding unlike coin units or inventing USD valuations.

## Verification

Run the Node test suite and `tests/funding-database.sql` in a single SQL editor execution. The SQL test creates synthetic records inside a transaction and rolls everything back, including its temporary receiving address and balances. It covers owner isolation, reporting without credit, privileged confirmation, duplicate hashes/credits, overspending, holds and double cancellation. The supplied address is solely a rollback fixture and is never a configured production payment address.

Remaining setup: owner receiving addresses and charges; operator review process. There is no automatic chain monitoring, fixed USD quote, payment expiry timer or actual withdrawal execution. Sending-wallet network fees are determined by that wallet.

## Owner receiving routes, 16 October 2026

Seven validated routes and address-only QR SVGs are saved in `dist/receiving-routes.mjs` and `dist/assets/deposit-qr/`. The supplied USDT/Solana address is an EVM address and is not configured. BSC routes use Binance-Peg USDT (BSC-USD) and USDC; their exact token contracts appear on the payment card. Global USDT/USDC input precision is limited to six decimals, including BSC.

All receiving routes remain disabled pending explicit approval of the Aurex deposit charge. Automatic review rejected activation with an implicit zero charge. `supabase/receiving-addresses.sql` only stores public receiving addresses and keeps payment generation disabled.

The live fee endpoint uses fixed allowlisted provider URLs and never receives wallet private data. Bitcoin uses current sat/vB with a disclosed 140 vB illustration. Native ETH/BNB uses live gas price and a disclosed 21,000 gas illustration. Token transfers show live gas/resource rates and require the sending wallet to calculate transaction-specific totals. Kraken USD conversions apply only to illustrative native fees. Estimates expire after 60 seconds, fail closed on provider errors, are informational, and are never silently deducted from deposits or demo holds.
