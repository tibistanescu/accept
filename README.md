# Project Title

A microservice built with Node.js, Express, Socket.IO, Redis adapter, Redis, and Kubernetes.

## Overview

This microservice uses a Redis adapter with Kubernetes for scaling and Redis service for storage. Authentication is done using a token sent from the client with Socket.IO handshake. After a client connects to the server, the server stores driverId - socket.id pair (values from the socket handshake) in the Redis database. The server then listens for the orderAccepted event from all connected clients.

When it receives this event, it connects to the MongoDB database and retrieves a list of driver IDs associated with the accepted routeId value. For each driver ID, except for the one associated with the current socket connection, the server retrieves the corresponding socketId value from Redis. It then uses the io instance to emit a refreshAvailable event to the corresponding sockets, passing the orderId value as the payload.


#install:

git clone https://github.com/ npm install

#install redis locally for socket.io redis adapter brew install redis

#verify redis is starting redis-server

#start redis in background brew services start redis brew services info redis brew services stop redis

#install pm2 npm install pm2 -g

#start node server with load balancing enabled via pm2 pm2 start index.js -i max pm2 delete all pm2 flush pm2 logs

#auth clients send token SOCKETIO_TOKEN

#ngrok npm install -g ngrok ngrok http 3000 (after pm2 started)
