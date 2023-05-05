const app = require("express")();
const http = require("http").createServer(app);
const io = require("socket.io")(http, { transports: ["websocket"] });
const { MongoClient } = require("mongodb");
const { createClient } = require("redis");
const { createAdapter } = require("@socket.io/redis-adapter");
const dotenv = require("dotenv");

dotenv.config();

const port = process.env.PORT || 3000;
const connectionString = process.env.DB_STRING;

const pubClient = createClient({ host: "localhost", port: 6379 });
const subClient = pubClient.duplicate();

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (token === process.env.SOCKETIO_TOKEN) {
    return next();
  }
  return next(new Error("authentication error"));
});

io.on("connection", (socket) => {
  const driverId = socket.handshake.query.driver_id;

  pubClient.set(driverId, socket.id);

  socket.emit("welcome", {
    message: `User cluster pID = ${process.pid} successfully authenticated.`,
  });

  socket.on("orderAccepted", async (orderId) => {
    const routeId = orderId.split("-")[2];
    const mongoClient = new MongoClient(connectionString, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    try {
      await mongoClient.connect();
      console.log("Connected to database");

      const query = { route_id: routeId };
      const collection = mongoClient.db().collection("orders_drivers");
      const result = await collection.find(query).toArray();

      for (let i = 0; i < result.length; i++) {
        const resultDriverId = result[i].driver_id;

        if (driverId === resultDriverId) {
          continue;
        }

        const socketId = await pubClient.get(resultDriverId);
        console.log("from redis via mongodb", socketId, resultDriverId);
        io.to(socketId).volatile.emit("refreshAvailable", orderId);
      }

      mongoClient.close();
    } catch (error) {
      console.error(error);
    }
  });
});

(async function() {
  try {
    await pubClient.connect();
    await subClient.connect();
    io.adapter(createAdapter(pubClient, subClient));
    http.listen(port, () => {
      console.log(`Socket.IO server running at http://localhost:${port}/`);
    });
  } catch (error) {
    console.error(`Failed to connect to Redis or start Socket.IO server: ${error}`);
  }
})();
