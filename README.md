# Battle Cats Deck

A Balatro-style poker roguelike where Battle Cats characters act as your Jokers.

Play poker hands from a standard 52-card deck to beat each blind's target score, recruit cats
in the shop between rounds for passive scoring bonuses, and climb through antes to a boss blind
gauntlet themed on classic Battle Cats enemies.

## Running it

```bash
npm install
npm run dev      # start the dev server
npm run test     # run the game-logic unit tests
npm run build    # typecheck + production build
```

## How it plays

- Select up to 5 cards from your hand and **Play** them as a poker hand (pair, flush, full
  house, etc.) to score chips × mult against the blind's target.
- Out of a good hand? **Discard** up to 5 cards to draw fresh ones (limited discards per round).
- Beat the target before you run out of hands to win the round, earn money, and enter the shop.
- In the shop, buy cats (up to 5 owned at once), sell ones you don't need, or reroll the offers.
- Small and Big blinds can be skipped for a small cash bonus; Boss blinds (Doge, Teacher Bear,
  Those Guys, Camelle) apply a themed debuff for the round and must be played.
- Clear the Boss Blind of Ante 8 to win the run.

## Project layout

- `src/game/` — pure game logic (deck, poker hand evaluation, scoring, cats, blinds, shop, the
  run state machine). No React here, fully unit-tested.
- `src/state/useGameStore.ts` — Zustand store wiring the game logic to React, persisted to
  `localStorage` so an in-progress run survives a refresh.
- `src/components/` — UI screens (blind select, playing, shop, end screen).
