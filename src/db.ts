import * as Mongo from "mongodb";
let _db: Mongo.Db = null;
let _client: Mongo.MongoClient = null;

export async function setupMongo() {
  _client = new Mongo.MongoClient(
    `mongodb+srv://${process.env.MONGODB_URI}@stemsharemetadata1.1sxnt.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`
  );
  await _client.connect();
  _db = _client.db("prod");
}

export async function getDB() {
  if (_db) {
    return _db;
  }
  throw new Error("Database not initialized");
}
