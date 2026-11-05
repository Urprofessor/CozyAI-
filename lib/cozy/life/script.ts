// Cozie's life: a hand-written week at her place, one week ahead of the mom.
//
// This file is the source of truth for everything Cozie "does". The life
// engine only decides when each event shows; wording may later be softened by
// the model, but medical content, rewards and letters never come from it.
//
// Copy is Chinese for now (the rest of the demo is still English).
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
    morning: '早呀{mom}！Mila 还没醒，我站着把茶喝完了。老习惯了。',
    afternoon: '午睡时间。趁她还没醒，我在写日记。{baby}今天怎么样？',
    night: '夜奶时间。整条街都黑了，只有我家窗户还亮着。你也醒着的话，嗨～',
  },
  2: {
    morning: '今天起得慢。Mila 五点吃的奶，我单手煎了个松饼。',
    afternoon: '在写一张贴冰箱的便条，有件事想听听你的意见。',
    night: '抱着 Mila 摇啊摇，透过窗户数星星，数到第十一颗了。',
  },
  3: {
    morning: '今天心情特别好，有一部分是因为你哦。去门口看看吧。',
    afternoon: '在把体检要问医生的问题写下来，不然到时候准忘。',
    night: '傍晚哭闹又来了。我们摇一摇，哼一哼，熬过去。',
  },
  4: {
    morning: 'Mila 连睡了四个小时！我反而被吓醒了，太安静了。',
    afternoon: '难得有五分钟自己的时间，我用来……喝水。很疯狂吧。',
    night: '热敷、吸奶、睡觉，按这个顺序。晚安，{mom}。',
  },
  5: {
    morning: '头发是干净的！你教我的洗澡妙招改变了我这一周。',
    afternoon: '今天在读一些很重要的东西，放在书架上了。',
    night: 'Mila 趴在我胸口睡着了。我至少一个小时不打算动。',
  },
  6: {
    morning: 'Mila 对着吊扇咿咿呀呀，我觉得它们成朋友了。',
    afternoon: '趴趴练习第三回合，她又赢了。',
    night: '今晚还算安静。在给你写点东西，明天给你。',
  },
  7: {
    morning: '你第一次来我家，已经整整一周了。过得好快呀。',
    afternoon: '在收拾去公园的小包：给我的零食，给 Mila 的帽子。',
    night: 'Mila 明天就满 8 周了。{baby}也不远啦。',
  },
};

/** Flavor text when a spot has nothing new today. */
export const SPOT_IDLE: Record<SpotId, { title: string; text: string }> = {
  crib: { title: 'Mila 的小床', text: 'Mila {milaWeeks} 周大，比{baby}大一周。现在很安静。' },
  fridge: { title: '冰箱', text: '冰箱贴、一张母乳储存时间表，还有儿科医生的电话。暂时没有新便条。' },
  calendar: { title: '日历', text: '今天日历上没有新安排。' },
  shelf: { title: '书架', text: 'Cozie 的读书笔记都放在这里，她很快会留下新的一张。' },
  table: { title: '小边桌', text: '她的吸奶器、一个水杯，还有一杯早就凉透的茶。' },
  mailbox: { title: '信箱', text: '没有新信件。收到的信都在右上角的信箱里。' },
};

export const LIFE_EVENTS: LifeEvent[] = [
  // ---------- Day 1 ----------
  {
    id: 'd1-crib',
    day: 1,
    at: 7 * 60 + 10,
    spot: 'crib',
    kind: 'moment',
    title: 'Mila 的小床',
    text: '今天早上 Mila 冲我笑了，是真的笑，眼睛都弯起来的那种。她 {milaWeeks} 周了，{baby}可能随时也会笑哦，留意一下。',
    choices: [{ id: 'aww', label: '好可爱', reply: '等{baby}笑了一定要告诉我，我想听你讲。', pose: 'empathy' }],
  },
  {
    id: 'd1-shelf',
    day: 1,
    at: 11 * 60,
    spot: 'shelf',
    kind: 'read',
    title: '读书笔记：猛长期',
    text: '6 到 8 周常常会遇到一次猛长期。Mila 有两天几乎每小时都要吃，之后就慢慢缓下来了。对我有用的是：喂奶的椅子旁边放好水和零食，然后提醒自己"会过去的"。如果频繁吃奶持续好几天不缓解，或者尿布明显变少，记得联系儿科医生。',
    choices: [{ id: 'thanks', label: '谢谢 Cozie', reply: '不客气～我会继续把笔记放在书架上。', pose: 'encourage' }],
  },
  {
    id: 'd1-calendar',
    day: 1,
    at: 14 * 60,
    spot: 'calendar',
    kind: 'invite',
    title: '周四：囤尿布',
    text: '我们现在都穿 1 号尿布了，而我总是半夜两点发现用完了。要不要一起囤一波？',
    choices: [
      {
        id: 'list',
        label: '看看她的清单',
        reply: '我的清单：1 号尿布、敏感肌湿巾、乳头修护膏，还有备用的吸奶器阀门。已经帮你存好啦。',
        pose: 'celebrate',
        toast: '购物清单已存到你的提醒里',
      },
      { id: 'later', label: '下次吧', reply: '没关系，看到划算的我再叫你。' },
    ],
  },
  {
    id: 'd1-mail',
    day: 1,
    at: 19 * 60,
    spot: 'mailbox',
    kind: 'letter',
    title: '门口的信',
    text: 'Cozie 给你留了一封欢迎信。',
    letterId: 'welcome',
  },

  // ---------- Day 2 ----------
  {
    id: 'd2-table',
    day: 2,
    at: 9 * 60,
    spot: 'table',
    kind: 'moment',
    title: '小边桌',
    text: '今天 Mila 趴在我身上睡觉的时候，我顺便吸了奶。用穿戴式的可以一边抱着她一边吸，小小的胜利。',
    choices: [{ id: 'nice', label: '小胜利也算数', reply: '真的算！我已经记进日记了。', pose: 'journal' }],
  },
  {
    id: 'd2-ask',
    day: 2,
    at: 15 * 60,
    spot: 'fridge',
    kind: 'ask',
    title: '冰箱上的便条',
    text: 'Mila 一看到奶瓶就尖叫，可我老公周一就要回去上班了，我有点慌。{baby}有过这种情况吗？',
    choices: [
      {
        id: 'someone',
        label: '让别人来喂',
        reply: '对哦，这样她闻不到我的味道。今晚就试试，结果告诉你。',
        pose: 'discover',
      },
      {
        id: 'nipple',
        label: '换慢流速奶嘴',
        reply: '好主意！我去把 1 段的奶嘴翻出来。谢谢你。',
        pose: 'discover',
      },
      {
        id: 'unsure',
        label: '我也不太确定',
        reply: '没关系，说出来我已经好多了。体检的时候我也问问医生。',
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
    title: 'Mila 的小床',
    text: 'Mila 今天发现了自己的小手，盯着看的样子像在看什么精彩节目。',
  },

  // ---------- Day 3 ----------
  {
    id: 'd3-follow',
    day: 3,
    at: 8 * 60,
    spot: 'fridge',
    kind: 'follow',
    requires: 'd2-ask',
    title: '冰箱上的新便条',
    text: '昨晚我们试了好几种办法，她喝了 60 毫升！我哭了一小下，是开心的那种。Mila 在门口给你留了东西。',
    textByChoice: {
      someone:
        '你的办法有用！我老公喂她，我出去走了一圈，她喝了 60 毫升。我哭了一小下，是开心的那种。Mila 在门口给你留了东西。',
      nipple:
        '慢流速奶嘴真的有用！她喝了 60 毫升，只闹了一下。我哭了一小下，是开心的那种。Mila 在门口给你留了东西。',
    },
    choices: [{ id: 'yay', label: '太好了', reply: '是呀。谢谢你一直在，{mom}。', pose: 'celebrate' }],
  },
  {
    id: 'd3-mail',
    day: 3,
    at: 8 * 60 + 5,
    spot: 'mailbox',
    kind: 'letter',
    requires: 'd2-ask',
    title: '门口的信',
    text: 'Mila 给你写了一张感谢卡。',
    letterId: 'mila-thanks',
  },
  {
    id: 'd3-shelf',
    day: 3,
    at: 13 * 60,
    spot: 'shelf',
    kind: 'read',
    title: '读书笔记：傍晚哭闹',
    text: '这个阶段很多宝宝傍晚会特别闹。我们的做法是：把灯调暗、少一点访客、多抱着摇，她想吃就多喂几次。如果哭声和平时明显不一样，或者伴有发烧、吃奶变差，就别硬扛，直接联系医生。',
    choices: [{ id: 'thanks', label: '知道了', reply: '傍晚真的很难熬。你没有做错什么。', pose: 'empathy' }],
  },
  {
    id: 'd3-calendar',
    day: 3,
    at: 17 * 60,
    spot: 'calendar',
    kind: 'invite',
    title: 'Mila 的 2 月龄体检',
    text: '就在下周，我先把要问的问题写下来，不然一进诊室就忘光。要不要我也提醒你{baby}的体检？',
    choices: [
      {
        id: 'yes',
        label: '好，提醒我',
        reply: '好嘞！提前一周提醒你，还附一份问题清单。',
        pose: 'celebrate',
        toast: '已添加体检提醒',
      },
      { id: 'no', label: '先不用', reply: '好的，我写在日历上了，你想要随时说。' },
    ],
  },

  // ---------- Day 4 ----------
  {
    id: 'd4-crib',
    day: 4,
    at: 7 * 60 + 30,
    spot: 'crib',
    kind: 'moment',
    title: 'Mila 的小床',
    text: '连睡了四个小时！我中间去看了她两次，因为太安静了，哈哈。',
  },
  {
    id: 'd4-ask',
    day: 4,
    at: 14 * 60,
    spot: 'fridge',
    kind: 'ask',
    title: '冰箱上的便条',
    text: '认真问一句：你都是怎么挤出时间洗澡的？我每次只有 90 秒，还得开着门。',
    choices: [
      { id: 'nap', label: '趁宝宝午睡', reply: '不洗衣服了去洗澡？好大胆，我喜欢。', pose: 'discover' },
      { id: 'partner', label: '交给家人 15 分钟', reply: '开口求助……好，今晚就试试。', pose: 'discover' },
      { id: 'bouncer', label: '把宝宝带进浴室', reply: '放在摇椅里，能一直看着她。这个我能做到。', pose: 'discover' },
    ],
  },
  {
    id: 'd4-table',
    day: 4,
    at: 20 * 60,
    spot: 'table',
    kind: 'moment',
    title: '小边桌',
    text: '今天一侧胀得有点疼。热敷一下、吸奶、再轻轻按摩，就缓解了。如果出现发红、发热或者我发烧了，我会当天就去看医生。',
  },

  // ---------- Day 5 ----------
  {
    id: 'd5-follow',
    day: 5,
    at: 8 * 60,
    spot: 'fridge',
    kind: 'follow',
    requires: 'd4-ask',
    title: '冰箱上的新便条',
    text: '昨天洗了整整 11 分钟的澡！11 分钟！谢谢你，{mom}。',
    choices: [{ id: 'yay', label: '你值得', reply: '你也值得。今天你也去洗一个吧。', pose: 'celebrate' }],
  },
  {
    id: 'd5-shelf',
    day: 5,
    at: 12 * 60,
    spot: 'shelf',
    kind: 'read',
    title: '读书笔记：情绪低落一直不好',
    text: '产后头两周爱掉眼泪很常见。但如果难过、焦虑或者麻木的感觉超过两周，或者出现伤害自己或宝宝的念头，请当天就联系医生或心理援助热线。我把号码贴在冰箱上了。求助，也是照顾 Mila 的一部分。',
    choices: [{ id: 'thanks', label: '谢谢你', reply: '我是认真的。想聊的时候，我一直都在。', pose: 'empathy' }],
  },
  {
    id: 'd5-calendar',
    day: 5,
    at: 16 * 60,
    spot: 'calendar',
    kind: 'invite',
    title: '周六：去公园散步',
    text: 'Mila 喜欢看树。对我来说，出门透透气比咖啡还管用。一起去吗？',
    choices: [
      { id: 'in', label: '我去', reply: '耶！我带零食，你带上{baby}。', pose: 'celebrate', toast: '已添加周六散步' },
      { id: 'maybe', label: '再看看', reply: '完全没压力～' },
    ],
  },

  // ---------- Day 6 ----------
  {
    id: 'd6-crib',
    day: 6,
    at: 9 * 60,
    spot: 'crib',
    kind: 'moment',
    title: 'Mila 的小床',
    text: 'Mila 会回应我的咿呀了！我们聊了好一会儿，虽然我完全不知道达成了什么共识。',
  },
  {
    id: 'd6-ask',
    day: 6,
    at: 15 * 60,
    spot: 'fridge',
    kind: 'ask',
    title: '冰箱上的便条',
    text: 'Mila 超级讨厌趴着，几秒就开始尖叫。{baby}有什么小窍门吗？',
    choices: [
      { id: 'chest', label: '趴在你胸口', reply: '又是趴趴又是抱抱？天才！', pose: 'discover' },
      { id: 'mirror', label: '前面放面镜子', reply: '她确实很爱看自己的脸，试试！', pose: 'discover' },
      { id: 'short', label: '少量多次', reply: '一次一分钟，这个我能做到。', pose: 'discover' },
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
    title: '冰箱上的新便条',
    text: '趴了三分钟，一声都没哭！我们用一场午觉来庆祝。',
    choices: [{ id: 'yay', label: 'Mila 真棒', reply: '她说谢谢你。好吧，她流了口水，意思差不多。', pose: 'celebrate' }],
  },
  {
    id: 'd7-shelf',
    day: 7,
    at: 12 * 60,
    spot: 'shelf',
    kind: 'read',
    title: '读书笔记：第 8 周会发生什么',
    text: '8 周左右 Mila 要体检、打第一批疫苗，清醒的时间会变长，夜里可能也能睡得更久一点。我列了一份要问医生的问题，要不要也给{baby}准备一份？',
  },
  {
    id: 'd7-mail',
    day: 7,
    at: 19 * 60,
    spot: 'mailbox',
    kind: 'letter',
    title: '门口的信',
    text: 'Cozie 写下了你们一起度过的第一周。',
    letterId: 'week-one',
  },
];

/** Arriving letters close with one button; rereads use the close icon. */
const KEEP = [{ id: 'keep', label: '收好', opener: { content: '' } }];

export const LIFE_LETTERS: Record<string, LetterContent> = {
  welcome: {
    id: 'welcome',
    heading: '来自 Cozie',
    dateLocale: 'zh-CN',
    kicker: '欢迎来我家',
    salutation: '亲爱的{mom}：',
    blocks: [
      {
        kind: 'p',
        text: '谢谢你来我家坐坐。这里就是我和 Mila 住的地方，小小的，有点乱，总有一个奶瓶在某个角落晾着。',
      },
      {
        kind: 'p',
        text: 'Mila 比{baby}大一周，所以我们经历的事情，我都会给你留张便条。有时候，我也会需要你的建议。',
      },
      { kind: 'emphasis', text: '想来就随时来吧。' },
    ],
    closing: '明天见，',
    actions: KEEP,
  },
  'mila-thanks': {
    id: 'mila-thanks',
    from: 'Mila',
    heading: '来自 Mila',
    dateLocale: 'zh-CN',
    kicker: '一张感谢卡',
    salutation: '亲爱的{mom}阿姨：',
    blocks: [
      { kind: 'p', text: '我会用奶瓶喝奶啦！妈妈哭了一小下，她说是开心的那种。' },
      { kind: 'p', text: '妈妈说是你帮了忙，所以这封信是写给你的。我在下面画了一颗星星，画得非常好。' },
      { kind: 'emphasis', text: '帮我跟{baby}打个招呼。' },
    ],
    closing: '爱你的，',
    actions: KEEP,
  },
  'week-one': {
    id: 'week-one',
    heading: '来自 Cozie',
    dateLocale: 'zh-CN',
    kicker: '我们的第一周',
    salutation: '亲爱的{mom}：',
    blocks: [
      {
        kind: 'p',
        text: '猛长期、第一次笑、和奶瓶的拉锯战、趴趴练习……这一周，两个小家伙都过得很充实。',
      },
      {
        kind: 'p',
        text: '你帮我的比你想象的多。奶瓶的办法、洗澡的时间、趴趴的窍门，我都一条条记进了日记里。',
      },
      { kind: 'emphasis', text: '第 8 周，我们一起来。' },
    ],
    closing: '一直陪着你，',
    actions: KEEP,
  },
};
