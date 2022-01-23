import * as Mongo from "mongodb";
let _db: Mongo.Db = null;
let _client: Mongo.MongoClient = null;

export async function setupMongo() {
  _client = new Mongo.MongoClient(
    `mongodb+srv://${process.env.MONGODB_URI}@cluster0.osjjf.mongodb.net/prod?retryWrites=true&w=majority`
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
