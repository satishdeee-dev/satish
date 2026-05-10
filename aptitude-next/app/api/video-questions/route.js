// Video Round API — returns multiple-choice questions, each paired with a YouTube
// video the candidate watches before answering. Embedded via the YouTube iframe API
// (no key required). The pool below uses well-known evergreen videos.
//
// Hit GET /api/video-questions?count=5 to get N randomised questions.

const VIDEO_POOL = [
  {
    videoId: 'jNQXAC9IVRw', // "Me at the zoo" — first ever YouTube video (April 23, 2005)
    q: "This is YouTube's first-ever video. What's the subject?",
    o: ['Cats at home', 'Elephants at the zoo', 'A skateboarding clip', 'A music performance'],
    a: 1,
  },
  {
    videoId: 'kJQP7kiw5Fk', // "Despacito" — one of YouTube's most-watched videos
    q: 'In what language is the song in this video performed?',
    o: ['Portuguese', 'Italian', 'Spanish', 'French'],
    a: 2,
  },
  {
    videoId: '9bZkp7q19f0', // "Gangnam Style" — first video to hit 1B views
    q: 'This was the first YouTube video ever to reach 1 billion views. From which country is the artist?',
    o: ['Japan', 'China', 'South Korea', 'Thailand'],
    a: 2,
  },
  {
    videoId: 'fJ9rUzIMcZQ', // Queen — Bohemian Rhapsody (Official Video)
    q: 'Which legendary band performs in this music video?',
    o: ['The Beatles', 'Queen', 'Pink Floyd', 'Led Zeppelin'],
    a: 1,
  },
  {
    videoId: 'dQw4w9WgXcQ', // Rick Astley — Never Gonna Give You Up
    q: 'This song is famously associated with which internet phenomenon?',
    o: ['Trolling', 'Rickrolling', 'Caturday', 'Doge memes'],
    a: 1,
  },
  {
    videoId: 'hT_nvWreIhg', // OneRepublic — Counting Stars
    q: 'Which band released the song in this video?',
    o: ['Imagine Dragons', 'Coldplay', 'OneRepublic', 'Maroon 5'],
    a: 2,
  },
  {
    videoId: 'OPf0YbXqDm0', // Mark Ronson ft. Bruno Mars — Uptown Funk
    q: 'Who is the lead vocalist featured on this track?',
    o: ['Bruno Mars', 'Justin Timberlake', 'Pharrell Williams', 'The Weeknd'],
    a: 0,
  },
  {
    videoId: 'YQHsXMglC9A', // Adele — Hello
    q: 'Which artist performs this song?',
    o: ['Sia', 'Adele', 'Beyoncé', 'Lana Del Rey'],
    a: 1,
  },
  {
    videoId: 'RgKAFK5djSk', // Wiz Khalifa ft. Charlie Puth — See You Again
    q: 'This song was a tribute featured in which film franchise?',
    o: ['The Avengers', 'Fast & Furious', 'Mission: Impossible', 'Transformers'],
    a: 1,
  },
  {
    videoId: 'CevxZvSJLk8', // Katy Perry — Roar
    q: 'Which pop artist performs the song in this video?',
    o: ['Lady Gaga', 'Taylor Swift', 'Katy Perry', 'Rihanna'],
    a: 2,
  },
];

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function GET(req) {
  const url = new URL(req.url);
  const countParam = parseInt(url.searchParams.get('count') || '5', 10);
  const count = Math.max(1, Math.min(countParam, VIDEO_POOL.length));

  const picked = shuffle(VIDEO_POOL).slice(0, count);
  const questions = picked.map((item) => {
    const indexed = item.o.map((text, i) => ({ text, wasCorrect: i === item.a }));
    const shuffled = shuffle(indexed);
    return {
      videoId: item.videoId,
      embedUrl: `https://www.youtube.com/embed/${item.videoId}?modestbranding=1&rel=0`,
      q: item.q,
      o: shuffled.map((x) => x.text),
      a: shuffled.findIndex((x) => x.wasCorrect),
    };
  });

  return Response.json(
    {
      round: 'video',
      count: questions.length,
      poolSize: VIDEO_POOL.length,
      questions,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
