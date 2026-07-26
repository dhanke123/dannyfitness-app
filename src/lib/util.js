/* Tiny shared utilities: seeded RNG for demo variety, id generator. */

// Per-week demo variety: deterministic extra PT bookings so each week looks different
// (lets you visibly test week-to-week navigation). Current week (0) stays curated.
export function mulberry(seed){ return function(){ seed|=0; seed=seed+0x6D2B79F5|0; let t=Math.imul(seed^seed>>>15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }

export let _id = 0;
export const nid = () => "x" + ++_id;
