## Multiplayer server (Socket.IO)

### Run locally

1) Install deps:

```bash
cd server
npm install
```

2) Start server:

```bash
npm start
```

Server runs on `http://localhost:3000` (health: `http://localhost:3000/health`).

### Run the game client (separately)

From the project root:

```bash
python -m http.server 8080
```

Open `http://localhost:8080`, click **Multiplayer**, keep server URL as `http://localhost:3000`.

### Local test (2 tabs)

- Tab A: Multiplayer → Create Room → copy code
- Tab B: Multiplayer → paste code → Join Room

