'use client';

import {
  Baby,
  BookOpen,
  ChevronRight,
  CircleUserRound,
  HelpCircle,
  Settings,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Star,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const img = (name: string) => `/figma/${name}`;

const accountGroups = [
  [
    { label: 'My Profile', icon: CircleUserRound, badge: true },
    { label: 'My Baby', icon: Baby, badge: true },
    { label: 'Momcozy Care', icon: ShoppingBag, badge: false },
    { label: 'Course Library', icon: BookOpen, badge: false },
  ],
  [
    { label: 'Help & Feedback', icon: HelpCircle, badge: false },
    { label: 'Share Application', icon: Share2, badge: false },
  ],
  [
    { label: 'About', icon: ShieldCheck, badge: false },
    { label: 'Settings', icon: Settings, badge: false },
  ],
];

export default function MePage() {
  return (
    <div className="screen-scroll">
      <div className="page me-page">
        <header className="profile-header">
          <img src={img('me-avatar.png')} alt="" />
          <div>
            <h1>Clara Wang</h1>
            <p>q243840766@gmail.com</p>
            <button type="button">
              Trying to Conceive
              <ChevronRight size={14} />
            </button>
          </div>
        </header>

        <Card className="level-card">
          <div className="level-card__top">
            <strong>BEGINNER</strong>
            <span>Lv1</span>
            <div className="level-progress" />
            <span>Lv2</span>
            <Badge tone="parenting">NEW</Badge>
          </div>
          <div className="level-card__body">
            <div>
              <strong>9,109</strong>
              <span className="star-pill">
                <Star size={17} fill="currentColor" />
              </span>
            </div>
            <Button size="sm">My Perks</Button>
          </div>
          <p>
            <strong>3</strong> will expire this month
          </p>
        </Card>

        <Card className="share-card">
          <div className="share-illustration">
            <img src={img('me-image-213.png')} alt="" />
          </div>
          <div>
            <strong>Share Thoughts</strong>
            <span>Make Momcozy better for you!</span>
          </div>
          <ChevronRight size={18} />
        </Card>

        <div className="me-actions">
          <Card>
            <img src={img('me-points.svg')} alt="" />
            <span>Points Mall</span>
          </Card>
          <Card>
            <img src={img('me-checkin.svg')} alt="" />
            <span>Get CozyCoins</span>
          </Card>
        </div>

        {accountGroups.map((group, groupIndex) => (
          <Card className="account-list" key={groupIndex}>
            {group.map((item) => {
              const Icon = item.icon;

              return (
                <button key={item.label} type="button">
                  <Icon size={19} />
                  <span>{item.label}</span>
                  {item.badge ? <i aria-label="New" /> : null}
                  <ChevronRight size={16} />
                </button>
              );
            })}
          </Card>
        ))}
      </div>
    </div>
  );
}
