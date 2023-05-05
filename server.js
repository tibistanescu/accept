const app = require("express")();
require("dotenv").config();
const http = require("http").Server(app);
const Socketio = require("socket.io");
const { createClient } = require("redis");
const { createAdapter } = require("@socket.io/redis-adapter");
const { MongoClient } = require("mongodb");

const port = process.env.PORT || 3000;

const connectionString = process.env.DB_STRING;

io = Socketio(http, {
  transports: ["websocket"],
});

const pubClient = createClient({ host: "localhost", port: 6379 });
const subClient = pubClient.duplicate();

io.on("connection", (socket) => {
  //authenticate socket connection
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (token === process.env.SOCKETIO_TOKEN) {
      return next();
    }
    return next(new Error("authentication error"));
  });

  //store socket_id - driver_id pair in redis
  const driverId = JSON.parse(JSON.stringify(socket.handshake.query)).driver_id;
  pubClient.set(driverId, socket.id);

  socket.emit("welcome", {
    message: `User cluster pID = ${process.pid} succesfully authenticated.`,
  });

  socket.on("orderAccepted", (orderId) => {
    console.log((orderId.split("-")[2]));
    const routeId = orderId.split("-")[2];
    const monClient = new MongoClient(connectionString, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // connect to mongo and get all drivers that have assoc route_id
    monClient
      .connect()
      .then(() => {
        console.log("Connected to database");

        let query = { route_id: routeId };
        const collection = monClient.db().collection("orders_drivers");
        collection
          .find(query)
          .toArray()
          .then((result) => {
            for (let i = 0; i < result.length; i++) {
              console.log(result[i].driver_id);
              if(driverId === result[i].driver_id) continue;
              Promise.all([pubClient.get(result[i].driver_id)]).then((socket_id) => {
                console.log("from redis via mongodb", socket_id,result[i].driver_id);
                io.to(socket_id).volatile.emit("refreshAvailable", orderId);
              });
            }

            monClient.close();
          });
      })
      .catch((error) => console.error(error));
  });
});

Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
  io.adapter(createAdapter(pubClient, subClient));
  http.listen(port, () => {
    console.log(`Socket.IO server running at http://localhost:${port}/`);
  });
});
