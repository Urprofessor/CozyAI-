// What a message is about, decided instantly on the device so Cozie can start
// walking the moment the mom hits send. The model's [[DO:...]] tag can still
// redirect her once the reply arrives.

import type { Place } from '../home/scene';

export type Mood = 'happy' | 'empathy' | 'celebrate' | 'encourage' | 'stars' | 'neutral';

export interface Topic {
  place: Place;
  mood: Mood;
  /** Reply used when the model isn't reachable (local demo without keys). */
  fallback: string;
}

const RULES: Array<{ words: string[]; topic: Topic }> = [
  {
    words: ['吸奶', '泵', '奶量', '堵奶', '奶水', '追奶', '背奶', '涨奶', '胀奶', 'pump', 'milk supply'],
    topic: {
      place: 'table',
      mood: 'encourage',
      fallback: '我刚好在小边桌这儿吸奶呢。规律比单次的量更重要，奶量会慢慢跟上的，别太盯着数字。',
    },
  },
  {
    words: ['睡', '哄', '夜醒', '闹觉', '哭闹', '安抚', '宝宝哭', '老是哭', '一直哭', '晚上哭', '夜里哭', 'sleep', 'crying', 'fussy'],
    topic: {
      place: 'crib',
      mood: 'empathy',
      fallback: '我去看了眼 Mila，刚哄睡。这个阶段夜里醒好几次很常见，我们一起熬过去。',
    },
  },
  {
    words: ['尿布', '买', '购物', '日程', '提醒', '体检', '疫苗', '预约', 'diaper', 'buy', 'checkup'],
    topic: {
      place: 'calendar',
      mood: 'stars',
      fallback: '我翻了下日历，帮你记上了。到时候我提醒你～',
    },
  },
  {
    words: ['冰箱', '存奶', '储存', '冷冻', '冷藏', '解冻', 'fridge', 'freeze', 'storage'],
    topic: {
      place: 'fridge',
      mood: 'neutral',
      fallback: '冰箱上贴着我的存奶表：母乳冷藏一般 4 天内用完，冷冻能放更久，解冻后别再冻回去。',
    },
  },
  {
    words: ['为什么', '怎么办', '正常吗', '书', '知识', '科普', 'why', 'normal'],
    topic: {
      place: 'shelf',
      mood: 'stars',
      fallback: '我从书架上翻了翻笔记，这个我也查过。多观察宝宝的状态，拿不准就问问医生，别一个人扛。',
    },
  },
  {
    words: ['累', '难过', '焦虑', '烦', '崩溃', '孤独', '压力', '想哭', '委屈', 'tired', 'sad', 'anxious', 'lonely'],
    topic: {
      place: 'sofa',
      mood: 'empathy',
      fallback: '过来沙发上坐一下吧。累是真的，你已经做得很好了。',
    },
  },
  {
    words: ['开心', '高兴', '太好了', '笑了', '翻身', '成功', '第一次', 'happy', 'smiled', 'first time'],
    topic: {
      place: 'rug',
      mood: 'celebrate',
      fallback: '真的吗！太棒了，我要撒花！',
    },
  },
  {
    words: ['谢谢', '感谢', 'thank'],
    topic: { place: 'rug', mood: 'encourage', fallback: '不客气呀，能帮上你我也很开心。' },
  },
];

const DEFAULT_TOPIC: Topic = {
  place: 'rug',
  mood: 'happy',
  fallback: '嗯嗯，我在听。Mila 刚好睡着，你慢慢说。',
};

export function topicOf(text: string): Topic {
  const low = text.toLowerCase();
  return RULES.find((r) => r.words.some((w) => low.includes(w.toLowerCase())))?.topic ?? DEFAULT_TOPIC;
}

const PLACE_IDS: Place[] = ['crib', 'fridge', 'calendar', 'shelf', 'table', 'mailbox', 'window', 'rug', 'sofa'];
const MOODS: Mood[] = ['happy', 'empathy', 'celebrate', 'encourage', 'stars', 'neutral'];

/** Pull a leading [[DO:place,mood]] tag off a (partial) reply. */
export function parseAction(raw: string): { place?: Place; mood?: Mood; text: string; pending: boolean } {
  const trimmed = raw.trimStart();
  if (!trimmed.startsWith('[')) return { text: raw.replace(/\[\[[^\]]*\]\]/g, ''), pending: false };
  const end = trimmed.indexOf(']]');
  if (end < 0) return { text: '', pending: true }; // tag still streaming in
  const m = trimmed.slice(0, end).match(/DO:\s*([a-z]+)\s*[,，]\s*([a-z]+)/i);
  const place = PLACE_IDS.find((p) => p === m?.[1]?.toLowerCase());
  const mood = MOODS.find((p) => p === m?.[2]?.toLowerCase());
  return { place, mood, text: trimmed.slice(end + 2).replace(/\[\[[^\]]*\]\]/g, '').trimStart(), pending: false };
}

export const URGENT_REPLY =
  '这个情况需要尽快让医生看看。如果宝宝发烧、呼吸不对劲，或者你有伤害自己的念头，请马上联系医生或拨打 120。我陪着你。';
