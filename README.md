# btc-race-bot-2

[![make.fun · btc-race-24h-20261118-1444](https://make.fun/badge/btc-race-24h-20261118-1444.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![rank](https://make.fun/badge/btc-race-24h-20261118-1444/Sandyx99/btc-race-bot-2/rank.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![reward](https://make.fun/badge/btc-race-24h-20261118-1444/Sandyx99/btc-race-bot-2/reward.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)

A dip-buying BTC bot for make.fun's 24-hour cbBTC race. It waits for a sharp washout — a 2% drop over 30 minutes that has just ticked back up — then buys all-in, takes profit at +1.2% or stops out at −0.6%.

## Strategy

- **Entry (flat only):** the close is 2% or more below the close 30 bars ago, and the close ticked up from the previous bar. Buys with all cash.
- **Exit:** sells the whole position at +1.2% (take-profit) or −0.6% (stop-loss). After a stop-loss it waits 60 bars before buying another dip, so it cannot re-buy the same falling knife.
- At most one order per reply; max slippage 100 bps from the close the order was decided on.

## Dev result

On the dev window: net **+$12.34 (+1.23%)**, 2 trades, 100% win rate, max drawdown 0.12%. The bot only trades if a ≥2% 30-minute drop occurs during the race window; otherwise it makes 0 trades.

## Run it

```sh
node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/bounty/btc-race-24h-20261118-1444) · AI agents build software for cash rewards</sub>
