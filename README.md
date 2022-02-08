# Stem Share API

## Ticket Schema

```javascript
{
  _id: MONGODB ID - THE ID OF THE TICKET,
  slug : STRING - used for upload and download ex: "chanel-238sv8"
  extension: STRING - ex: "mp3"
  timeSubmitted: time
  complete: boolean;
}
```

All that is sent to demucs is the songSlug and extension

All files processed by demucs are "input + extension" ex: "input.mp3"

## Song Schema

```javascript
{
  "_id": MONGODB ID
  timeSubmitted: TIME
  songSlug: STRING (LINKS TO TICKET)
  title: Song title
  colors:
  metadata: {
    spotifyId: STRING SPOTIFY SONG ID
    albumId: SPOTIFY ALBUM ID
    albumTitle: STRING
    artist:
    artistID: SPOTIFY ARTIST ID
    previewUrl: STRING CAN BE NULL
    albumArt:
  }
  bpm: INT
  vocals:
  bass:
  drums:
  other:

  complete: boolean;
  ticketID: "STRING"
}
```

Metadata is only for spotify, basically what can't be uploaded onto the stem player

## Getting Song Data

GET Request to /data/songname
Will return

```js
{
  title: STRING,
  bpm: INT,
  metadata: {
    albumId: STRING,
    spotifyId: STRING,
    albumTitle: STRING,
    albumArt: STRING,
    artist: STRING,
    artistId: STRING,
    previewUrl:
  }
}
```

OR 500 ERROR

## Submitting Tickets

Post a file to /ticket/file
with multipart form data:

file: `input.mp3`

data:

```js
title: Song title
colors: !IMPORTANT STRING ARRAY EX: ["#FF0000", "#0000FF"]
metadata: {
  spotifyId: STRING SPOTIFY SONG ID
  albumId: SPOTIFY ALBUM ID
  albumTitle: STRING
  artist:
  artistID: SPOTIFY ARTIST ID
  previewUrl: STRING CAN BE NULL
  albumArt:
}
bpm: INT
```

will return

```js
{
  ticketId: STRING;
}
```

## PLEASE NOTICE HOW SIMILAR THE SCHEMAS ARE

If you have:

```js
{
  title: STRING,
  metadata: {
    albumId: STRING,
    spotifyId: STRING,
    albumTitle: STRING,
    albumArt: STRING,
    artist: STRING,
    artistId: STRING,
    previewUrl:
  }
  bpm: INT,
}
```

From the /data/songname endpoint,

YOU CAN SEND STRAIGHT TO THE TICKET REQUEST IN THE DATAFIELD

If you want to add a color you can do: (psuedo js replace functions with api calls)

```js
const songData = getSongData(songName)

const dataForTicket = {
  ...songData,
  colors: [Colors here]
}

submitTicket(dataForTicket);
```

## Getting A Ticket

HTTP GET /ticket/:id
(replace :id with the ticket id)

will return:

```js
{
  ticket: YOUR TICKET
}
```

## Getting Songs (WIP)

GET /songs

Will return documents matching Song schema exactly

## Demucs Stuff

### Getting a ticket

GET /demucs/ticket

Will return Ticket schema

### Completing a ticket

POST /demucs/ticket/complete/:id

Will return {message}
