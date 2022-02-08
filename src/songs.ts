import { getDB } from "./db";
import * as Mongo from "mongodb";
import slugify from "slugify";

/**
 * Will throw error if songID is already in database
 */
export async function checkForSongs(songData: any) {
  // Can't check for duplicates with no trackID
  if (!songData.metadata.trackId) {
    return;
  }
  const db = await getDB();
  const searchedSong = await db
    .collection("songs")
    .find({
      "metadata.trackId": songData.metadata.trackId,
    })
    .toArray();

  if (searchedSong[0]) {
    throw new Error("Song already in database");
  }
}

export async function makeSong(
  data: any,
  extension: string,
  youtubeLink = null
) {
  const songId = new Mongo.ObjectId();
  const ticketId = new Mongo.ObjectId();

  const slug =
    slugify(data.title, { lower: true }) +
    "-" +
    songId.toString().substring(18, 25);
  //TODO: validate data

  if (!data.title) {
    throw new Error("Title is required");
    return;
  }

  const song = {
    _id: songId,
    timeSubmitted: Date.now(),
    songSlug: slug,
    title: data.title,
    downloads: 0,
    colors: data.colors || ["#FF0000", "#0000FF"],
    metadata: {
      trackId: data.metadata.trackId || null,
      trackNum: data.metadata.trackNum || null,
      albumId: data.metadata.albumId || null,
      albumTitle: data.metadata.albumTitle || null,
      albumArt: data.metadata.albumArt || null,
      artist: data.metadata.artist || null,
      artistId: data.metadata.artistId || null,
      previewUrl: data.metadata.previewUrl || null,
    },
    bpm: data.bpm || 120,

    vocals: `https://storage.googleapis.com/stem-share-demucs-output/${slug}/vocals.${extension}`,
    bass: `https://storage.googleapis.com/stem-share-demucs-output/${slug}/bass.${extension}`,
    drums: `https://storage.googleapis.com/stem-share-demucs-output/${slug}/drums.${extension}`,
    other: `https://storage.googleapis.com/stem-share-demucs-output/${slug}/other.${extension}`,

    extension: extension || "mp3",
    youtubeUrl: youtubeLink || null,
    complete: false,
    approved: false,
    ticketId: ticketId,
  };

  const ticket = {
    _id: ticketId,
    timeSubmitted: Date.now(),
    slug: slug,
    started: null,
    extension: song.extension,
    pending: false,
    complete: false,
  };

  try {
    const db = await getDB();
    //TODO Promise all or something
    await db.collection("songs").insertOne(song);
    await db.collection("tickets").insertOne(ticket);
    return song;
  } catch (error) {
    throw new Error("Unabe to submit ticket");
  }
}

export async function getTrackNum(trackId: string) {}
