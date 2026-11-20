# SPACE JAM — GALACTIC POOL LEAGUE

A responsive, browser-based two-player billiards arcade prototype with a cosmic basketball-inspired visual theme, six selectable modes, room codes, three-round match scoring, and a Netlify serverless room API.

## Netlify drag-and-drop publishing

1. Download and unzip `netlify-ready-game.zip`.
2. Sign in to Netlify in your browser.
3. Open https://app.netlify.com/drop.
4. Drag the unzipped **project folder** (the folder containing `netlify.toml`, `package.json`, `package-lock.json`, and `netlify/functions/`) into the deploy area. Do not drag only the `public` or `dist` folder: the project build must run so Netlify can package the function.
5. Netlify reads `netlify.toml`, runs `npm run build`, publishes `dist`, and discovers `netlify/functions/game.ts`.
6. Open the published site in two separate browsers/devices. Create a private match in one and join with its six-character room code in the other.

The project does not require GitHub, a continuously running server, custom environment variables, API keys, or manual database provisioning. Netlify Functions and Netlify Blobs are provisioned by the Netlify site runtime. You must be signed in to Netlify for Drop to build an unbuilt project; anonymous Drop publishes files as-is.

## Architecture

- Frontend: plain HTML, CSS, and browser JavaScript in `public/`.
- API: `netlify/functions/game.ts`, available at `/.netlify/functions/game`.
- Persistence: site-wide Netlify Blobs store `galactic-pool-rooms` configured for strong consistency.
- Concurrency: room creation uses `onlyIfNew`; updates use an ETag read followed by `onlyIfMatch`. A conflicting move returns HTTP 409 instead of silently overwriting another player's update. The client refreshes room state on its polling interval.
- Shared game logic is in `src/game-logic.mjs`, outside `netlify/functions/`.

## Included game flow

- Create a room and share its six-character code.
- A second player joins from another device.
- Players alternate turns; drag backward from the cue ball and release to shoot.
- Pocketed balls score points; a dry shot is recorded as a foul with zero points.
- Both players must take a shot before a round can be ended.
- The match consists of three rounds. The champion is determined by round wins, then total points.

The six mode names are selectable. This build provides a shared arcade billiards ruleset and does **not** yet implement every official mode-specific rule distinction (for example, called-shot 10-ball, one-pocket target pockets, and bank-only 9-ball). The browser simulation is lightweight arcade physics, not a certified tournament-accurate billiards engine. The match scoring and winner calculation are implemented and covered by automated tests.

## Validation

The included test suite exercises two players completing all three rounds, score totals, round wins, final winner selection, and turn ownership. `npm run build` copies the production frontend to `dist/` and checks the function source syntax and required Blobs configuration. Netlify performs the actual TypeScript function packaging during its deployment build.

Netlify Blobs is a key-value store, not a transactional database. Conditional ETag writes make stale room updates fail with a conflict rather than being silently accepted; this design deliberately does not retry conflicting writes automatically. For higher-stakes transactional workloads, use a transactional database instead.
