# Front Line Online

10 vs 10 browser shooter. Players join a lobby, the lobby waits up to 60 seconds for 20 players,
then bots fill every empty slot. When someone joins later they replace a bot on the smaller team.

All files sit in the repo root (no folders):

    index.html  shared.js  render.js  client.js   <- browser
    server.js   game.js                           <- Node server
    package.json  render.yaml  README.md

## Update an existing deployment
Replace the files in your GitHub repo with these (drag them in, commit). Render redeploys by itself.

## First time: GitHub + Render
1. Create a new empty repository on github.com, click "uploading an existing file",
   drag in ALL the files above, and commit.
2. render.com > New > Web Service > connect the repo. Runtime Node, Build `npm install`,
   Start `npm start`, Instance type Free.
3. Open the `.onrender.com` link and share it.

The free plan sleeps after about 15 minutes with nobody connected; the first visit afterwards
takes up to a minute to wake the server.

## Optional settings (Render > Environment)
- `LOBBY_SECONDS` (default 60)  lobby wait before bots fill the rest
- `MATCH_SECONDS` (default 600)  match length
- `MAX_ROOMS` (default 2)  how many matches the server runs at once

## Controls
WASD move, mouse aim, click fire, right-click aim, R reload, G equipment, V knife, Space jump,
Shift sprint, Q dash, hold Tab scoreboard, K vote to skip the match time. Touch controls on phones.

## Content
13 maps (Depot, Dust, Midnight, Frostbite, Harbor, Ridge, Mesa, Marsh, Quarry, Meadow, Twilight,
Ashfall, Jungle), 28 weapons, 6 perks, armor, heavy soldiers, and a 12-step killstreak chain:
2 adrenaline, 3 UAV, 4 body armor, 5 airstrike, 6 sentry, 7 care package, 8 resupply,
9 juggernaut, 10 helicopter, 11 mortar, 12 nuke, 14 last stand.
