// Support agent avatar pool. One is picked at random when handoff begins and
// reused for that session.

export const COZY_SUPPORT_AVATARS = [
  '/images/customer%20service%20avatar/avator1.png',
  '/images/customer%20service%20avatar/avator2.png',
  '/images/customer%20service%20avatar/avator3.png',
  '/images/customer%20service%20avatar/avator4.png',
  '/images/customer%20service%20avatar/avator5.png',
  '/images/customer%20service%20avatar/avator6.png',
];

export const COZY_SUPPORT_AVATAR_FALLBACK =
  '/images/%E4%BA%BA%E5%B7%A5%E5%AE%A2%E6%9C%8D%E6%A0%B7%E5%BC%8F.png';

export function pickRandomSupportAvatar(): string {
  if (!COZY_SUPPORT_AVATARS.length) return COZY_SUPPORT_AVATAR_FALLBACK;
  return COZY_SUPPORT_AVATARS[Math.floor(Math.random() * COZY_SUPPORT_AVATARS.length)];
}
