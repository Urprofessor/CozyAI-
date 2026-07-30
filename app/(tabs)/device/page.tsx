'use client';

import { Camera, Plus, Thermometer, Wind } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

const img = (name: string) => `/figma/${name}`;

const devices = [
  {
    title: 'Smart Baby Monitor BM08',
    body: 'See every moment. Even in the dark.',
    image: 'device-bm08.png',
    tone: 'care',
    badge: 'Online',
  },
  {
    title: 'W1 Comfort Pump System',
    body: 'Warm-massage comfort for natural flow.',
    image: 'device-w1.png',
    tone: 'mom',
    badge: 'Ready',
  },
  {
    title: 'Wearable Digital Thermometer T31',
    body: 'Every reading, always in view.',
    image: 'device-t31.png',
    tone: 'family',
    badge: '36.8°C',
  },
] as const;

export default function DevicePage() {
  return (
    <div className="screen-scroll">
      <div className="page device-page">
        <section className="device-hero">
          <img className="device-hero__bg" src={img('device-bg.png')} alt="" />
          <img className="device-hero__glow glow-a" src={img('device-glow-a.svg')} alt="" />
          <img className="device-hero__glow glow-b" src={img('device-glow-b.svg')} alt="" />
          <div className="device-orb">
            <img src={img('device-hero-crop.png')} alt="" />
          </div>
          <h1>
            Connect everything
            <br />
            what mom&rsquo;s need
          </h1>
          <Button size="lg">
            <Plus size={18} />
            Add Device
          </Button>
        </section>

        <div className="device-carousel" aria-label="Connected devices">
          {devices.map((device) => (
            <Card className={`device-card tone-${device.tone}`} key={device.title}>
              <Badge tone={device.tone}>{device.badge}</Badge>
              <div className="device-image">
                <img src={img(device.image)} alt="" />
              </div>
              <span>{device.title}</span>
              <strong>{device.body}</strong>
            </Card>
          ))}
        </div>

        <Card className="device-summary">
          <CardHeader>
            <div>
              <span>Care network</span>
              <strong>3 devices active</strong>
            </div>
            <Badge tone="success">Stable</Badge>
          </CardHeader>
          <CardContent>
            <div>
              <Camera size={18} />
              <span>Baby monitor</span>
              <strong>Live</strong>
            </div>
            <div>
              <Thermometer size={18} />
              <span>Thermometer</span>
              <strong>36.8°C</strong>
            </div>
            <div>
              <Wind size={18} />
              <span>Air care</span>
              <strong>Auto</strong>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
