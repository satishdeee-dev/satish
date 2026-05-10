// HR Round API — returns behavioural / situational MCQs for the HR interview round.
// Hit GET /api/hr?count=5 to get N randomised questions with shuffled options.
//
// Each question has exactly one "best" (textbook professional) answer. The frontend
// scores using the `a` index just like the aptitude round.

const HR_POOL = [
  {
    q: "A coworker takes credit for your work in a meeting. What's the most professional response?",
    o: [
      "Confront them publicly mid-meeting",
      "Send a passive-aggressive email to the team",
      "Talk to them privately first; escalate to your manager if it continues",
      "Ignore it to keep the peace",
    ],
    a: 2,
  },
  {
    q: "You realise you'll miss a deadline due to unforeseen issues. The best action is:",
    o: [
      "Stay quiet and hope nobody notices",
      "Tell your manager immediately with a recovery plan",
      "Blame the rest of the team",
      "Ship something incomplete to hit the date",
    ],
    a: 1,
  },
  {
    q: "A teammate proposes an approach you believe is technically wrong. You should:",
    o: [
      "Mock the idea in front of others",
      "Stay silent and watch them fail",
      "Privately share your concerns with data and reasoning",
      "Refuse to work with them",
    ],
    a: 2,
  },
  {
    q: "Your manager gives feedback you disagree with. The right move is:",
    o: [
      "Argue immediately and dismiss it",
      "Listen, ask clarifying questions, then share your perspective respectfully",
      "Agree on the surface and ignore it",
      "Quit on the spot",
    ],
    a: 1,
  },
  {
    q: "You're given a task outside your expertise. The best approach is:",
    o: [
      "Refuse to take it on",
      "Pretend you know how and improvise",
      "Acknowledge the gap, research, ask for guidance, and deliver",
      "Hand it off to a coworker without telling anyone",
    ],
    a: 2,
  },
  {
    q: "A bug you wrote ships to production. You should:",
    o: [
      "Blame the QA team",
      "Own it, fix it fast, then run a blameless postmortem",
      "Patch it quietly and hope nobody noticed",
      "Argue it's technically not your fault",
    ],
    a: 1,
  },
  {
    q: "You finish your work early. What's the best move?",
    o: [
      "Browse social media until end of day",
      "Ask the team where you can help or pick up extra work",
      "Pretend to look busy",
      "Leave early without telling anyone",
    ],
    a: 1,
  },
  {
    q: "A junior asks you a question you find very basic. You:",
    o: [
      "Make them feel bad for not knowing",
      "Patiently explain and share resources for follow-up",
      "Tell them to figure it out alone",
      "Ignore them",
    ],
    a: 1,
  },
  {
    q: "You believe you're underpaid for your role. The right approach is:",
    o: [
      "Quietly slack off",
      "Vent to colleagues",
      "Document your impact and request a structured comp review with your manager",
      "Quit without warning",
    ],
    a: 2,
  },
  {
    q: "A team meeting drifts off-topic. You:",
    o: [
      "Stay silent and waste the hour",
      "Politely steer it back: 'Can we refocus on X?'",
      "Storm out of the room",
      "Argue with everyone",
    ],
    a: 1,
  },
  {
    q: "You strongly disagree with a decision the team has already made. You should:",
    o: [
      "Refuse to support it",
      "Disagree-and-commit: voice your concerns, then back the team once it's decided",
      "Sabotage the rollout to prove you were right",
      "Resign over it",
    ],
    a: 1,
  },
  {
    q: "What's the best way to handle stress on a high-stakes project?",
    o: [
      "Hide it and grind through",
      "Break work into smaller goals, communicate blockers early, take breaks",
      "Pull all-nighters and burn out",
      "Pass the work to teammates silently",
    ],
    a: 1,
  },
  {
    q: "Why do you want to work here? The strongest answer is:",
    o: [
      "Because I need a job",
      "Because the salary is high",
      "I researched the company and it aligns with my goals and values; here's a specific reason",
      "Because my friend works here",
    ],
    a: 2,
  },
  {
    q: "Where do you see yourself in five years?",
    o: [
      "I haven't thought about it",
      "Doing exactly this same job",
      "Growing into a senior IC or lead role, deepening expertise, and mentoring others",
      "Running my own company",
    ],
    a: 2,
  },
  {
    q: "What is your greatest weakness?",
    o: [
      "I'm a perfectionist (cliché humble-brag)",
      "I have no weaknesses",
      "Honest weakness + concrete steps you're taking to improve",
      "I prefer not to answer",
    ],
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
  const count = Math.max(1, Math.min(countParam, HR_POOL.length));

  const picked = shuffle(HR_POOL).slice(0, count);
  const questions = picked.map((item) => {
    const indexed = item.o.map((text, i) => ({ text, wasCorrect: i === item.a }));
    const shuffled = shuffle(indexed);
    return {
      q: item.q,
      o: shuffled.map((x) => x.text),
      a: shuffled.findIndex((x) => x.wasCorrect),
    };
  });

  return Response.json(
    {
      round: 'hr',
      count: questions.length,
      poolSize: HR_POOL.length,
      questions,
    },
    {
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}
