import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CozyAI',
    short_name: 'CozyAI',
    description: 'Momcozy CozyAI demo — smart mom & baby care, daily logging, and AI guidance.',
    start_url: '/home',
    display: 'standalone',
    background_color: '#F9F7F5',
    theme_color: '#F9F7F5',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
