import * as ytdl from "ytdl-core";
import * as spotify from "./spotify";

export async function getInfo(url: string) {
  if (!ytdl.validateURL(url)) {
    throw new Error("Invalid URL");
  }

  const info = await (await ytdl.getInfo(url)).videoDetails;
  let songData = null;
  console.log(info);
  if (info?.media?.song) {
    songData = await spotify.getSongData(
      info.media.song + " " + info.media.artist,
      false
    );
  } else {
    songData = await spotify.getSongData(info.title, false);
  }
  return songData;
}
