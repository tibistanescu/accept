const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
console.log("starting...");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { /* options */ });


io.on("connection", (socket) => {
  console.log(socket.id);

  socket.on("order_accepted", (order_id) => {
    console.log(order_id);

    //show me code for: connect to mongodb, database: orders, collection: orders, get all driver_ids where order_id = order_id

    
  });
});

httpServer.listen(3000);