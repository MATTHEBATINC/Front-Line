# Front Line Online

10 vs 10 browser shooter. Players join a lobby, the lobby waits up to 60 seconds for 20 players,
then bots fill every empty slot. When someone joins later they replace a bot on the smaller team.

All files sit in the repo root (no folders):

    index.html  shared.js  render.js  client.js   <- browser
    server.js   game.js                           <- Node server
    package.json  render.yaml  README.md

## Put it on GitHub
1. Create a new empty repository on github.com.
2. Click "uploading an existing file", drag in ALL the files above, and commit.


## Host it on Render (free)
1. render.com > New > Web Service > connect your GitHub repo.
2. Runtime: Node. Build command: `npm install`. Start command: `npm start`. Instance type: Free.
   (If you used render.yaml, choose New > Blueprint instead and it fills these in.)
3. Open the `.onrender.com` link. Share it with friends.

The free plan sleeps after about 15 minutes with nobody connected; the first visit afterwards
takes up to a minute to wake the server.

## Optional settings (Render > Environment)
- `LOBBY_SECONDS` (default 60)  lobby wait before bots fill the rest
- `MATCH_SECONDS` (default 600)  match length
- `MAX_ROOMS` (default 2)  how many matches the server runs at once

## Controls
WASD move, mouse aim, click fire, right-click aim, R reload, G equipment, V knife, Space jump,
Shift sprint, hold Tab scoreboard, K vote to skip the match time. Touch controls on phones/tablets.
