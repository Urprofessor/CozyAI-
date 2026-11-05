// Cozie's life: a hand-written week at her place, one week ahead of the mom.
//
// This file is the source of truth for everything Cozie "does". The life
// engine only decides when each event shows; wording may later be softened by
// the model, but medical content, rewards and letters never come from it.
//
// Placeholders: {mom}, {baby}, {babyWeeks}, {milaWeeks}.

import type { LetterContent } from '../letters';

export type Slot = 'morning' | 'afternoon' | 'night';

/** Tappable places in the room (see lib/cozy/home/scene.ts). */
export type SpotId = 'crib' | 'fridge' | 'calendar' | 'shelf' | 'table' | 'mailbox';

export type CoziePose =
  | 'neutral'
  | 'journal'
  | 'empathy'
  | 'celebrate'
  | 'discover'
  | 'encourage'
  | 'listen'
  | 'rest';

export interface LifeChoice {
  id: string;
  label: string;
  /** Cozie's answer once picked. */
  reply: string;
  /** Pose she reacts with. */
  pose?: CoziePose;
  /** Toast for a demo side effect ("saved to reminders"). */
  toast?: string;
}

export type LifeEventKind = 'moment' | 'ask' | 'follow' | 'invite' | 'read' | 'letter';

export interface LifeEvent {
  id: string;
  day: number; // 1..DAYS
  at: number; // minutes after midnight
  spot: SpotId;
  kind: LifeEventKind;
  title: string;
  text: string;
  choices?: LifeChoice[];
  /** Only shows once this ask has an answer. */
  requires?: string;
  /** Per-answer opening line for a follow-up (falls back to `text`). */
  textByChoice?: Record<string, string>;
  letterId?: string;
}

export const DAYS = 7;

/** What Cozie is doing in each part of the day. */
export const SLOT_LINES: Record<number, Record<Slot, string>> = {
  1: {
    morning: "Morning, {mom}! Mila's still asleep, so I'm drinking my tea standing up. Old habit.",
    afternoon: "Nap time. I'm writing in my journal before she wakes. How's {baby} today?",
    night: "Night feed. The whole street is dark except my window. If you're up too, hi.",
  },
  2: {
    morning: 'Slow start today. Mila fed at 5, so I made pancakes with one hand.',
    afternoon: 'Writing a note for the fridge. I need a second opinion on something.',
    night: 'Rocking Mila and counting the stars through the window. I got to eleven.',
  },
  3: {
    morning: "I'm in a good mood today, and you're part of the reason. Go look by the door.",
    afternoon: 'Writing down my questions for the checkup before I forget them.',
    night: 'Evening fussies again. We sway, we hum, we survive.',
  },
  4: {
    morning: 'Mila slept four hours in a row. I woke up worried because it was too quiet.',
    afternoon: 'Five minutes to myself. Using them to drink water. Wild, I know.',
    night: 'Warm compress, pump, bed. In that order. Goodnight, {mom}.',
  },
  5: {
    morning: 'Clean hair! Your shower tip changed my week.',
    afternoon: "Reading up on something important today. It's on the shelf.",
    night: "Mila's asleep on my chest. I'm not moving for at least an hour.",
  },
  6: {
    morning: 'Mila cooed at the ceiling fan. I think they are friends now.',
    afternoon: "Tummy time battle, round three. She's winning.",
    night: 'Quiet night so far. Writing you something for tomorrow.',
  },
  7: {
    morning: "A whole week since you first came over. It went fast, didn't it?",
    afternoon: 'Packing a little bag for the park. Snacks for me, a hat for Mila.',
    night: "Week eight starts tomorrow for Mila. {baby} isn't far behind.",
  },
};

/** Flavor text when a spot has nothing new today. */
export const SPOT_IDLE: Record<SpotId, { title: string; text: string }> = {
  crib: { title: "Mila's crib", text: 'Mila is {milaWeeks} weeks old, one week ahead of {baby}. Quiet in here for now.' },
  fridge: { title: 'Fridge', text: 'Magnets, a milk storage chart, and the pediatrician’s number. No new notes.' },
  calendar: { title: 'Calendar', text: 'Nothing new on the calendar today.' },
  shelf: { title: 'Bookshelf', text: "Cozie's notes live here. She'll leave a new one soon." },
  table: { title: 'Side table', text: 'Her pump, a water bottle, and a very cold cup of tea.' },
  mailbox: { title: 'Mailbox', text: 'No new letters. Your collection is in the mailbox at the top right.' },
};

export const LIFE_EVENTS: LifeEvent[] = [
  // ---------- Day 1 ----------
  {
    id: 'd1-crib',
    day: 1,
    at: 7 * 60 + 10,
    spot: 'crib',
    kind: 'moment',
    title: "Mila's crib",
    text: "Mila smiled at me this morning. A real one, eyes and all. She's {milaWeeks} weeks, so {baby} might start any day now. Watch for it.",
    choices: [{ id: 'aww', label: 'Aww', reply: 'Tell me when it happens. I want to hear all about it.', pose: 'empathy' }],
  },
  {
    id: 'd1-shelf',
    day: 1,
    at: 11 * 60,
    spot: 'shelf',
    kind: 'read',
    title: 'Notes: growth spurts',
    text: 'Weeks 6 to 8 often bring a growth spurt. Mila wanted to feed almost every hour for two days, then it settled. What helped me: water and snacks next to the feeding chair, and remembering it passes. If feeds stay nonstop for more than a few days, or wet diapers drop, call your pediatrician.',
    choices: [{ id: 'thanks', label: 'Thanks, Cozie', reply: "Anytime. I'll keep leaving notes on the shelf.", pose: 'encourage' }],
  },
  {
    id: 'd1-calendar',
    day: 1,
    at: 14 * 60,
    spot: 'calendar',
    kind: 'invite',
    title: 'Thursday: diaper run',
    text: "We're both on size 1 now, and I always run out at 2 am. Want to stock up together?",
    choices: [
      {
        id: 'list',
        label: 'See her list',
        reply: 'My list: size 1 diapers, sensitive wipes, nipple balm, and spare pump valves. Saved it for you.',
        pose: 'celebrate',
        toast: 'Shopping list saved to your reminders.',
      },
      { id: 'later', label: 'Not now', reply: "No worries. I'll tell you if I spot a good deal." },
    ],
  },
  {
    id: 'd1-mail',
    day: 1,
    at: 19 * 60,
    spot: 'mailbox',
    kind: 'letter',
    title: 'A letter by the door',
    text: 'Cozie left you a welcome letter.',
    letterId: 'welcome',
  },

  // ---------- Day 2 ----------
  {
    id: 'd2-table',
    day: 2,
    at: 9 * 60,
    spot: 'table',
    kind: 'moment',
    title: 'Side table',
    text: 'Pumped while Mila napped on me today. With the wearable one I can actually hold her at the same time. Small win.',
    choices: [{ id: 'nice', label: 'Small wins count', reply: 'They really do. I wrote it in my journal.', pose: 'journal' }],
  },
  {
    id: 'd2-ask',
    day: 2,
    at: 15 * 60,
    spot: 'fridge',
    kind: 'ask',
    title: 'Note on the fridge',
    text: "Mila screams at the bottle, and my partner goes back to work on Monday. I'm kind of panicking. Did {baby} ever do this?",
    choices: [
      {
        id: 'someone',
        label: 'Let someone else feed',
        reply: "Oh, so she can't smell me nearby. Trying it tonight. I'll tell you how it goes.",
        pose: 'discover',
      },
      {
        id: 'nipple',
        label: 'Try a slower nipple',
        reply: "Good thinking. I'll dig out the size 1 nipples. Thank you.",
        pose: 'discover',
      },
      {
        id: 'unsure',
        label: "I'm not sure",
        reply: "That's okay. Just saying it out loud helped. I'll ask at the checkup too.",
        pose: 'empathy',
      },
    ],
  },
  {
    id: 'd2-crib',
    day: 2,
    at: 19 * 60,
    spot: 'crib',
    kind: 'moment',
    title: "Mila's crib",
    text: "Mila found her hands today. She stares at them like they're the best show on TV.",
  },

  // ---------- Day 3 ----------
  {
    id: 'd3-follow',
    day: 3,
    at: 8 * 60,
    spot: 'fridge',
    kind: 'follow',
    requires: 'd2-ask',
    title: 'New note on the fridge',
    text: 'We tried a few things last night, and she took 60 ml. I cried a little. The happy kind. Mila left you something by the door.',
    textByChoice: {
      someone:
        'Your idea worked. My partner fed her while I went for a walk, and she took 60 ml. I cried a little. The happy kind. Mila left you something by the door.',
      nipple:
        'The slower nipple worked. She took 60 ml and only fussed once. I cried a little. The happy kind. Mila left you something by the door.',
    },
    choices: [{ id: 'yay', label: "I'm so glad", reply: 'Me too. Thank you for being there, {mom}.', pose: 'celebrate' }],
  },
  {
    id: 'd3-mail',
    day: 3,
    at: 8 * 60 + 5,
    spot: 'mailbox',
    kind: 'letter',
    requires: 'd2-ask',
    title: 'A letter by the door',
    text: 'Mila wrote you a thank-you note.',
    letterId: 'mila-thanks',
  },
  {
    id: 'd3-shelf',
    day: 3,
    at: 13 * 60,
    spot: 'shelf',
    kind: 'read',
    title: 'Notes: the evening fussies',
    text: "Lots of babies get extra fussy in the early evening around now. What we do: dim the lights, fewer visitors, lots of swaying, and feeding more often if she wants it. Crying that sounds different from usual, or comes with fever or poor feeding, is a reason to call your doctor rather than wait it out.",
    choices: [{ id: 'thanks', label: 'Good to know', reply: 'Evenings are hard. You are not doing anything wrong.', pose: 'empathy' }],
  },
  {
    id: 'd3-calendar',
    day: 3,
    at: 17 * 60,
    spot: 'calendar',
    kind: 'invite',
    title: "Mila's 2-month checkup",
    text: "It's next week, so I'm writing my questions down now. I always forget them in the room. Want me to remind you about {baby}'s too?",
    choices: [
      {
        id: 'yes',
        label: 'Yes, remind me',
        reply: "Done. I'll nudge you a week before, with a list of questions.",
        pose: 'celebrate',
        toast: 'Checkup reminder added.',
      },
      { id: 'no', label: 'Not yet', reply: "Okay. It's on my calendar if you change your mind." },
    ],
  },

  // ---------- Day 4 ----------
  {
    id: 'd4-crib',
    day: 4,
    at: 7 * 60 + 30,
    spot: 'crib',
    kind: 'moment',
    title: "Mila's crib",
    text: 'Four hours of sleep in a row. I checked on her twice because it was too quiet. Ha.',
  },
  {
    id: 'd4-ask',
    day: 4,
    at: 14 * 60,
    spot: 'fridge',
    kind: 'ask',
    title: 'Note on the fridge',
    text: 'Serious question: how do you find time to shower? Mine take 90 seconds with the door open.',
    choices: [
      { id: 'nap', label: 'While baby naps', reply: 'Instead of doing laundry? Bold. I like it.', pose: 'discover' },
      { id: 'partner', label: 'Hand over for 15 min', reply: "Asking for help. Okay, I'll try it tonight.", pose: 'discover' },
      { id: 'bouncer', label: 'Baby in the bathroom', reply: 'In the bouncer, where I can see her. That I can do.', pose: 'discover' },
    ],
  },
  {
    id: 'd4-table',
    day: 4,
    at: 20 * 60,
    spot: 'table',
    kind: 'moment',
    title: 'Side table',
    text: 'One side felt full and tender today. Warm compress, then pumping, then gentle massage, and it eased up. If it gets red, hot, or I get a fever, I call my doctor the same day.',
  },

  // ---------- Day 5 ----------
  {
    id: 'd5-follow',
    day: 5,
    at: 8 * 60,
    spot: 'fridge',
    kind: 'follow',
    requires: 'd4-ask',
    title: 'New note on the fridge',
    text: 'Eleven-minute shower yesterday. Eleven! Thank you, {mom}.',
    choices: [{ id: 'yay', label: 'You deserve it', reply: 'So do you. Take one today too.', pose: 'celebrate' }],
  },
  {
    id: 'd5-shelf',
    day: 5,
    at: 12 * 60,
    spot: 'shelf',
    kind: 'read',
    title: 'Notes: when the blues don’t lift',
    text: "Teary days in the first two weeks are common. If sadness, worry or numbness lasts longer than that, or you have thoughts of harming yourself or your baby, call your doctor or a crisis line today. I keep the number on the fridge. Asking for help is part of looking after Mila.",
    choices: [{ id: 'thanks', label: 'Thank you', reply: "I mean it. If you ever need to talk, I'm right here.", pose: 'empathy' }],
  },
  {
    id: 'd5-calendar',
    day: 5,
    at: 16 * 60,
    spot: 'calendar',
    kind: 'invite',
    title: 'Saturday: park walk',
    text: 'Mila likes looking at the trees. Fresh air helps me more than coffee. Come with us?',
    choices: [
      { id: 'in', label: "I'm in", reply: "Yay. I'll bring snacks. You bring {baby}.", pose: 'celebrate', toast: 'Saturday walk added.' },
      { id: 'maybe', label: 'Maybe', reply: 'No pressure at all.' },
    ],
  },

  // ---------- Day 6 ----------
  {
    id: 'd6-crib',
    day: 6,
    at: 9 * 60,
    spot: 'crib',
    kind: 'moment',
    title: "Mila's crib",
    text: 'Mila cooed back at me. A whole conversation. I have no idea what we agreed on.',
  },
  {
    id: 'd6-ask',
    day: 6,
    at: 15 * 60,
    spot: 'fridge',
    kind: 'ask',
    title: 'Note on the fridge',
    text: 'Mila hates tummy time. Screams within seconds. Any tricks from {baby}?',
    choices: [
      { id: 'chest', label: 'On your chest', reply: 'Tummy time that is also a cuddle? Genius.', pose: 'discover' },
      { id: 'mirror', label: 'Put a mirror down', reply: 'She does love her own face. Trying it.', pose: 'discover' },
      { id: 'short', label: 'Short and often', reply: 'One minute at a time. I can do that.', pose: 'discover' },
    ],
  },

  // ---------- Day 7 ----------
  {
    id: 'd7-follow',
    day: 7,
    at: 8 * 60,
    spot: 'fridge',
    kind: 'follow',
    requires: 'd6-ask',
    title: 'New note on the fridge',
    text: 'Three minutes of tummy time without a single scream. We celebrated with a nap.',
    choices: [{ id: 'yay', label: 'Go Mila', reply: "She says thank you. Well, she drooled. Same thing.", pose: 'celebrate' }],
  },
  {
    id: 'd7-shelf',
    day: 7,
    at: 12 * 60,
    spot: 'shelf',
    kind: 'read',
    title: 'Notes: what week 8 brings',
    text: 'Around 8 weeks Mila has her checkup and first vaccines, more alert time, and maybe longer night stretches. I made a little list of questions for the doctor. Want me to keep one for {baby} too?',
  },
  {
    id: 'd7-mail',
    day: 7,
    at: 19 * 60,
    spot: 'mailbox',
    kind: 'letter',
    title: 'A letter by the door',
    text: 'Cozie wrote about your first week together.',
    letterId: 'week-one',
  },
];

/** Arriving letters close with one button; rereads use the close icon. */
const KEEP = [{ id: 'keep', label: 'Keep it', opener: { content: '' } }];

export const LIFE_LETTERS: Record<string, LetterContent> = {
  welcome: {
    id: 'welcome',
    kicker: 'Welcome to my place',
    salutation: 'Dear {mom},',
    blocks: [
      {
        kind: 'p',
        text: "Thank you for coming over. This is where Mila and I live. It's small, a little messy, and there's always a bottle drying somewhere.",
      },
      {
        kind: 'p',
        text: "Mila is one week ahead of {baby}, so whatever we go through, I'll leave you a note about it. Some days I'll need your advice too.",
      },
      { kind: 'emphasis', text: 'Come by whenever you like.' },
    ],
    closing: 'See you tomorrow,',
    actions: KEEP,
  },
  'mila-thanks': {
    id: 'mila-thanks',
    from: 'Mila',
    kicker: 'A thank-you note',
    salutation: 'Dear Auntie {mom},',
    blocks: [
      { kind: 'p', text: 'I drank my milk from the bottle! Mommy cried a little. She says it was the happy kind.' },
      { kind: 'p', text: 'Mommy says you helped. So this letter is for you. I drew a star at the bottom. It is very good.' },
      { kind: 'emphasis', text: 'Say hi to {baby} for me.' },
    ],
    closing: 'Love,',
    actions: KEEP,
  },
  'week-one': {
    id: 'week-one',
    kicker: 'Our first week',
    salutation: 'Dear {mom},',
    blocks: [
      {
        kind: 'milestone',
        stops: [{ label: 'Week 6' }, { label: 'Week 7', current: true }, { label: 'Week 8' }],
        text: 'Growth spurts, a first smile, bottle battles and tummy time. A full week for both of our little ones.',
      },
      {
        kind: 'p',
        text: 'You helped me more than you know. The bottle trick, the shower, the tummy time. I wrote every one of them in my journal.',
      },
      { kind: 'emphasis', text: "Week eight, here we come. Together." },
    ],
    closing: 'With you,',
    actions: KEEP,
  },
};
