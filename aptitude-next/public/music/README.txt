Drop your own theme music here as `theme.mp3` to play it as background music
during the quiz instead of the built-in synthesized cinematic loop.

Why no Transformers movie soundtrack out of the box?
  The Transformers films' theme music (Steve Jablonsky's "Arrival to Earth",
  Linkin Park's "What I've Done", etc.) is copyrighted. Embedding it would
  be IP infringement.

If `theme.mp3` is present and loads, it will be used (looped, volume 0.5).
If it is missing or fails to load, a procedural Web Audio API "Cybertronian
drone" plays instead — a sustained D-minor drone with a pulsing arpeggio.

The mute/unmute button in the quiz HUD toggles whichever source is active.

Tip: trim your MP3 to a clean 1-2 minute loop. Keep it royalty-free or
licensed for your use.
