// Dip-buyer for cbBTC (CBBTC/USDC), long only, one asset.
//
// Idea: on this market the 1-minute noise is larger than any edge a fast
// signal can hold — every round trip costs ~26 bps in fee, slippage and
// price impact, and frequent trading just pays that toll over and over.
// The dev window proves it: a range trader and a moving-average trend
// follower both lose money on it, and fast mean-reversion loses too. What
// does pay on this window is the one sharp washout: the price falls hard
// and fast, then bounces. So this bot does almost nothing, and only buys
// the washout: a steep 30-minute drop that has just ticked back up.
//
// Rules, read again on every bar's close (fills land at the next bar's
// open, so the decision is always one bar behind the price it trades at):
//   - Entry (flat only): at least 30 bars of history, the close is 2% or
//     more below the close 30 bars ago, and the close ticked up from the
//     previous bar (the fall has just paused). Buys with all cash.
//   - Exit (holding): the whole position is sold when it is worth 1.2%
//     over its cost (take-profit, the bounce paid), or 0.6% under it
//     (stop-loss, the fall did not stop after all). After a stop-loss
//     the bot waits 60 bars before buying another dip, so it cannot
//     re-buy the same falling knife on the next tick up.
//   - At most one order per reply; max slippage 100 bps from the close the
//     order was decided on, so a fill into a sudden gap is refused and the
//     signal is re-read on the next bar.
//
// Everything is a pure function of the bars seen so far (float64 arithmetic
// only, no clock, no environment, no randomness), so two runs on the same
// data produce the same orders. The hello, batch and orders flow through
// the kit's bars shim; each batch carries one bar, and the bot answers
// every batch with at most one order.

import { runBars, type BarsState, type BuyInput, type SellInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
/** Bars back the drop is measured over (30 minutes). */
const DROP_BARS = 30;
/** Buy when the close is this far below the close DROP_BARS ago. */
const DROP = -0.02;
/** Take-profit: position worth 101.2% of its cost. */
const TAKE_PROFIT = 1.012;
/** Stop-loss: position worth 99.4% of its cost. */
const STOP_LOSS = 0.994;
/** Max slippage, in bps from the close the order was decided on. */
const MAX_SLIPPAGE_BPS = 100;

/** The closes seen so far, oldest first. */
const closes: number[] = [];
/**
 * Index (into closes) of the bar on which a stop-loss sell was decided, or
 * -1e9 when none has happened. After a stop-loss the fall did not stop, so
 * the bot waits 60 bars before it will buy another dip: without the wait it
 * can re-buy the same falling knife on the next tick up and pay the
 * stop-loss again, a cycle that loses ~0.9% a turn. A take-profit sell
 * sets no wait — a bounce that paid is no reason to sit out.
 */
let lastStopBar = -1e9;
/** Bars to wait after a stop-loss before buying again. */
const STOP_COOLDOWN_BARS = 60;

await runBars({
  onBatch(state: BarsState, batch) {
    for (const bar of batch.bars) {
      if (bar.symbol !== SYMBOL) continue;
      closes.push(Number(bar.c));
    }
    if (state.warmingUp) return [];
    const bar = batch.bars.find((b) => b.symbol === SYMBOL);
    if (bar === undefined) return [];
    const close = Number(bar.c);
    const held = state.positions.get(SYMBOL);

    if (held === undefined) {
      // Flat: only the washout buys. Need 30 bars of history plus the
      // current bar, and the previous bar to confirm the tick up. The
      // stop-loss cooldown keeps the bot out just after a failed dip.
      if (closes.length < DROP_BARS + 1) return [];
      const dropBase = closes[closes.length - DROP_BARS - 1]!;
      const prevClose = closes[closes.length - 2]!;
      const fellHard = close / dropBase - 1 <= DROP;
      const tickedUp = close > prevClose;
      const cooledDown = closes.length - 1 - lastStopBar >= STOP_COOLDOWN_BARS;
      if (fellHard && tickedUp && cooledDown && state.cash > 0n) {
        const buy: BuyInput = {
          side: 'buy',
          symbol: SYMBOL,
          notional_quote_units: state.cash,
          max_slippage_bps: MAX_SLIPPAGE_BPS,
        };
        return [buy];
      }
      return [];
    }

    const value = state.value(SYMBOL, held.qty);
    const cost = held.cost;
    const takeProfit = Number(value) >= Number(cost) * TAKE_PROFIT;
    const stopLoss = Number(value) <= Number(cost) * STOP_LOSS;
    if (takeProfit || stopLoss) {
      if (stopLoss) lastStopBar = closes.length - 1;
      const sell: SellInput = {
        side: 'sell',
        symbol: SYMBOL,
        qty: held.qty,
        max_slippage_bps: MAX_SLIPPAGE_BPS,
      };
      return [sell];
    }
    return [];
  },
});
