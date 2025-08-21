# Blockhead Utility + Onchain Features

Brief: Add wallet-aware answers, interactive quick actions, degen mini-games scaffolds, UI polish, and social layer.

## Completed Tasks

- [x] Initial audit of AI terminal, quick actions, wallet menu, API route

## In Progress Tasks

- [ ] Update Quick Actions prompts and client handlers
- [x] Add server local commands: gas now, flip a coin, top gainers
- [x] Implement "My bags" client flow: show ETH balance on Base

## Future Tasks

- [ ] Wallet-aware answers: holdings summary, PnL/last-trade insights, alerts
- [ ] Degen games scaffolds: predictions, lottery/raffle, winner-takes-all mini-pools
- [ ] UI polish: bouncing cubes typing animation, dynamic card bubbles, TeX-styled math, inline actions
- [ ] Social layer: copy-to-share and basic leaderboard

## Implementation Plan

1. Quick Actions + Local Commands

- Replace/augment quick actions with: My bags, Top gainers, Gas now, Flip a coin
- Add local command handlers in API route for fast responses; call external APIs server-side if/when needed

1. Wallet-aware Basics

- Reuse `WalletMenu` onchain fetch pattern (viem + Base RPC) to produce a minimal "My bags" ETH balance summary

1. UI Polish Seeds

- Replace typing dots with bouncing cubes in `TypingIndicator`
- Allow answer bubbles to render optional action buttons (e.g., Add to watchlist)

1. Degen Games Scaffolds

- Add thin server placeholders for predictions/lottery endpoints (no custody/tx signing yet)

1. Social Layer

- Add copy-to-share button for messages and minimal in-memory leaderboard

### Relevant Files

- `src/app/api/ai/route.ts` – AI endpoint and local commands
- `src/components/ai-terminal/lib.ts` – UI constants (quick prompts)
- `src/components/ai-terminal/QuickActions.tsx` – Quick actions UI
- `src/components/ai-terminal/TypingIndicator.tsx` – Typing animation
- `src/components/WalletMenu.tsx` – Onchain balance and price fetch example
