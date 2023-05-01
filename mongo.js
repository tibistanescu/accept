const MongoClient = require('mongodb').MongoClient;

MongoClient.connect(MONGO_URL, function(err, client) {
  if (err) throw err;
  console.log("Connected successfully to server");

  const db = client.db('myproject');
  // perform actions on the collection object
  client.close();
});