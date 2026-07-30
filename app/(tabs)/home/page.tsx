'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  Baby,
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Milk,
  Moon,
  Package,
  Pill,
  Thermometer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SectionTitle } from '@/components/ui/section-title';

const img = (name: string) => `/figma/${name}`;
const home = (name: string) => `/images/home/${name}`;

const homeTabs = ['For You', 'Baby Care', 'Breastfeeding'];

// 7 check-in types, mirroring the voice-log demo home design.
const checkIns = [
  { label: 'Pump', time: '1h 30m ago', icon: Milk, tone: 'mom' },
  { label: 'Feeding', time: '1h 30m ago', icon: Baby, tone: 'family' },
  { label: 'Sleep', time: '2h 48m ago', icon: Moon, tone: 'care' },
  { label: 'Diaper', time: '1h 30m ago', icon: Package, tone: 'parenting' },
  { label: 'Supplement', time: '0 of 2', icon: Pill, tone: 'parenting' },
  { label: 'Symptoms', time: '5 records', icon: Thermometer, tone: 'care' },
  { label: 'Period', time: 'Apr 12', icon: CalendarDays, tone: 'mom' },
] as const;

const reminders = [
  { time: 'All Day', title: 'BirthEase Maternity Ball Program', tone: 'mom', cta: 'Start' },
  { time: '9:00', title: 'Light therapy session', tone: 'care', cta: 'View' },
  { time: '11:00', title: 'Nursery humidity check', tone: 'family', cta: 'View' },
] as const;

export default function HomePage() {
  const [activeHomeTab, setActiveHomeTab] = useState(homeTabs[0]);

  return (
    <div className="screen-scroll">
      <div className="page home-page">
        {/* ---- Greeting hero (code over PNG backdrop) ---- */}
        <header className="home-hero">
          <img className="home-hero__bg" src={home('chrome/header-background.png')} alt="" aria-hidden />
          <div className="top-actions">
            <Button variant="icon" size="icon" aria-label="Calendar">
              <CalendarDays size={19} />
            </Button>
            <Button variant="icon" size="icon" aria-label="Notifications">
              <Bell size={20} />
            </Button>
          </div>
          <div className="home-identity">
            <img src={img('home-profile.png')} alt="" />
            <span>Hi, Clare and Bonnie</span>
            <ChevronDown size={16} />
          </div>
          <div className="date-row">
            <ChevronLeft size={16} />
            <span>Today, May 13th</span>
            <ChevronRight size={16} />
          </div>
          <h1>
            Postpartum
            <br />1 Week
          </h1>
        </header>

        {/* ---- Daily care guidance ---- */}
        <Card className="guidance-card">
          <div className="guidance-mascot">
            <img src={img('home-bg.png')} alt="" />
          </div>
          <div className="segmented-tabs">
            {homeTabs.map((tab) => (
              <button
                className={activeHomeTab === tab ? 'is-active' : ''}
                key={tab}
                type="button"
                onClick={() => setActiveHomeTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
          <ul>
            <li>Pay attention to baby&rsquo;s skin jaundice, and on-demand feeding is key.</li>
            <li>Nurture your body science-backed care, for a healthy pregnancy and a happy you.</li>
          </ul>
        </Card>

        {/* ---- Daily Check-ins: 7-card rail + Cozy AI voice entry ---- */}
        <SectionTitle title="Daily Check-ins" action="View all" />
        <div className="checkin-rail" aria-label="Daily check-ins">
          {checkIns.map((item) => {
            const Icon = item.icon;

            return (
              <button className={`checkin-card tone-${item.tone}`} key={item.label} type="button">
                <Icon size={33} strokeWidth={1.5} />
                <strong>{item.label}</strong>
                <span>{item.time}</span>
              </button>
            );
          })}
        </div>
        <Link className="voice-entry" href="/cozy" aria-label="Open Cozy AI voice log">
          <img src="/images/IP_%E9%AB%98%E5%85%B4.png" alt="" />
          <div>
            <strong>Voice Log with Cozy AI</strong>
            <span>Log feeds, sleep, and more — just by talking</span>
          </div>
          <ChevronRight size={18} />
        </Link>

        {/* ---- Reminders ---- */}
        <SectionTitle title="Reminders" action="5" />
        <Card className="reminder-card">
          {reminders.map((reminder) => (
            <div className="reminder-row" key={reminder.title}>
              <div className={`reminder-icon tone-${reminder.tone}`}>
                <Activity size={18} />
              </div>
              <div>
                <span>{reminder.time}</span>
                <strong>{reminder.title}</strong>
              </div>
              <Button variant="secondary" size="sm">
                {reminder.cta}
              </Button>
            </div>
          ))}
        </Card>

        {/* ---- PNG-preserved sections (from the voice-log demo) ---- */}
        <section className="png-module" aria-label="AI insights">
          <img className="png-module__header" src={home('ai-insights/section-header.png')} alt="AI Insights" />
          <img src={home('ai-insights/lactation-plan-card.png')} alt="AI lactation plan" loading="lazy" />
          <img
            src={home('ai-insights/baby-sleep-schedule-card.png')}
            alt="AI baby sleep schedule"
            loading="lazy"
          />
        </section>

        <section className="png-module" aria-label="Campaign">
          <img src={home('campaign/every-moment-card.png')} alt="One app. Every moment." loading="lazy" />
        </section>

        <section className="png-module" aria-label="Momcozy Reads">
          <img className="png-module__header" src={home('reads/section-header.png')} alt="Momcozy Reads" />
          <div className="png-rail">
            <img
              src={home('reads/newborn-bathing-card.png')}
              alt="A Complete Guide to Newborn Bathing"
              loading="lazy"
            />
            <img
              src={home('reads/breast-massager-card.png')}
              alt="How to Use a Breast Massager"
              loading="lazy"
            />
          </div>
        </section>

        <section className="png-module" aria-label="Featured goods">
          <img
            className="png-module__header"
            src={home('featured-products/section-header.png')}
            alt="Featured goods"
          />
          <div className="png-rail">
            <img
              src={home('featured-products/cozybreath-air-purifier-card.png')}
              alt="CozyBreath Air purifier"
              loading="lazy"
            />
            <img
              src={home('featured-products/wn08-sleep-light-card.png')}
              alt="WN08 Relax and Sleep Light Speaker"
              loading="lazy"
            />
          </div>
        </section>
      </div>
    </div>
  );
}
