import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

const PORT = process.env.PORT || 3000;

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.get("/health", (_req, res) => res.json({ ok: true }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: true, credentials: true },
});

// room -> Map(socketId -> playerState)
const rooms = new Map();

function makeRoomCode() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 5; i++) out += chars[(Math.random() * chars.length) | 0];
  return out;
}

function ensureRoom(room) {
  if (!rooms.has(room)) rooms.set(room, new Map());
  return rooms.get(room);
}

function roomSize(room) {
  return rooms.get(room)?.size || 0;
}

io.on("connection", (socket) => {
  socket.data.room = null;

  socket.on("room:create", (payload, ack) => {
    try {
      let room = makeRoomCode();
      while (rooms.has(room)) room = makeRoomCode();
      const map = ensureRoom(room);
      socket.join(room);
      socket.data.room = room;

      map.set(socket.id, {
        id: socket.id,
        name: payload?.name || "Player",
        carId: payload?.carId || "coupe",
        colorId: payload?.colorId || "blue",
        x: 0,
        y: 0.9,
        z: 0,
        yaw: 0,
        speed: 0,
        t: Date.now(),
      });

      ack?.({ ok: true, room });
      io.to(room).emit("room:joined", { room, players: roomSize(room) });
      io.to(room).emit("room:players", { players: roomSize(room) });
      io.to(room).emit("state:batch", { players: Array.from(map.values()) });
    } catch (e) {
      ack?.({ ok: false, error: "create_failed" });
    }
  });

  socket.on("room:join", (payload, ack) => {
    const room = String(payload?.room || "").trim().toUpperCase();
    if (!room) return ack?.({ ok: false, error: "missing_room" });
    const map = ensureRoom(room);
    socket.join(room);
    socket.data.room = room;

    map.set(socket.id, {
      id: socket.id,
      name: payload?.name || "Player",
      carId: payload?.carId || "coupe",
      colorId: payload?.colorId || "blue",
      x: 0,
      y: 0.9,
      z: 0,
      yaw: 0,
      speed: 0,
      t: Date.now(),
    });

    ack?.({ ok: true, room });
    io.to(room).emit("room:joined", { room, players: roomSize(room) });
    io.to(room).emit("room:players", { players: roomSize(room) });
    io.to(room).emit("state:batch", { players: Array.from(map.values()) });
  });

  socket.on("state:update", (payload) => {
    const room = socket.data.room;
    if (!room) return;
    const map = rooms.get(room);
    if (!map) return;
    const st = map.get(socket.id);
    if (!st) return;

    // trust-but-clamp (basic anti-exploding payload)
    st.name = String(payload?.name || st.name).slice(0, 18);
    st.carId = String(payload?.carId || st.carId).slice(0, 24);
    st.colorId = String(payload?.colorId || st.colorId).slice(0, 24);
    st.x = Number(payload?.x ?? st.x);
    st.y = Number(payload?.y ?? st.y);
    st.z = Number(payload?.z ?? st.z);
    st.yaw = Number(payload?.yaw ?? st.yaw);
    st.speed = Number(payload?.speed ?? st.speed);
    st.t = Date.now();

    // Broadcast to others in room
    socket.to(room).emit("state:batch", { players: [st] });
  });

  socket.on("disconnect", () => {
    const room = socket.data.room;
    if (!room) return;
    const map = rooms.get(room);
    if (!map) return;
    map.delete(socket.id);
    socket.to(room).emit("player:left", { id: socket.id });
    io.to(room).emit("room:players", { players: roomSize(room) });
    if (map.size === 0) rooms.delete(room);
  });
});

server.listen(PORT, () => {
  console.log(`[server] socket.io listening on :${PORT}`);
});

