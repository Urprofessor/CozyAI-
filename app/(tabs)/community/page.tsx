'use client';

import { Bell, Flame, Hash, Heart, MessageCircle, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SectionTitle } from '@/components/ui/section-title';

const img = (name: string) => `/figma/${name}`;

const topics = ['# ChooseYouToo', '# MoreThanIKnow', '# HowToIncreaseBreast...', '# PumpingRoutines'];

const communityPosts = [
  {
    author: 'Momcozy Daily',
    title: 'Behind Choose You, Too 🎬',
    body: 'This Mother’s Day, we wanted to say something different. No superhero speeches. Just real care, real rest, and real support.',
    tone: 'mom',
    image: 'community-banner.png',
    likes: '1.2k+',
  },
  {
    author: 'John Alexander',
    title: 'Latest wearable breast pump setup',
    body: 'A quick look at my partner’s quiet pumping routine and how we keep every part clean between sessions.',
    tone: 'care',
    image: 'device-w1.png',
    likes: '328',
  },
  {
    author: 'Clara Wang',
    title: 'Night nursery settings that helped us',
    body: 'Soft white noise, steady humidity, and one glance at the baby monitor changed our nights.',
    tone: 'family',
    image: 'device-bm08.png',
    likes: '846',
  },
] as const;

type Post = (typeof communityPosts)[number];

export default function CommunityPage() {
  return (
    <>
      <div className="screen-scroll">
        <div className="page community-page">
          <header className="community-header">
            <button className="avatar-button" type="button" aria-label="Profile">
              <img src={img('community-avatar.png')} alt="" />
              <span>2</span>
            </button>
            <div className="community-switch">
              <button className="is-active" type="button">
                For You
              </button>
              <button type="button">Momcozy Reads</button>
            </div>
            <Button variant="icon" size="icon" aria-label="Notifications">
              <Bell size={19} />
            </Button>
          </header>

          <Card className="community-banner">
            <img src={img('community-banner.png')} alt="" />
          </Card>

          <SectionTitle title="Trending Topics" />
          <div className="topic-cloud">
            {topics.map((topic, index) => (
              <button key={topic} type="button">
                <Hash size={14} />
                <span>{topic}</span>
                {index === 0 ? <Badge tone="mom">NEW</Badge> : null}
              </button>
            ))}
          </div>

          <SectionTitle title="Featured" />
          <div className="featured-row">
            {communityPosts.slice(0, 2).map((post) => (
              <FeaturedCard post={post} key={post.title} />
            ))}
          </div>

          <div className="post-list">
            {communityPosts.map((post) => (
              <PostCard post={post} key={`${post.author}-${post.title}`} />
            ))}
          </div>
        </div>
      </div>
      <Button className="floating-post">Post</Button>
    </>
  );
}

function FeaturedCard({ post }: { post: Post }) {
  return (
    <Card className="featured-card">
      <div className="featured-card__author">
        <span className={`brand-dot tone-${post.tone}`}>m</span>
        <strong>{post.author}</strong>
      </div>
      <h3>{post.title}</h3>
      <p>{post.body}</p>
      <div className="featured-card__meta">
        <span className="avatar-stack">
          <img src={img('home-profile.png')} alt="" />
          <img src={img('community-avatar.png')} alt="" />
          <img src={img('me-avatar.png')} alt="" />
        </span>
        <span>{post.likes} mom like this</span>
        <Flame size={16} />
      </div>
    </Card>
  );
}

function PostCard({ post }: { post: Post }) {
  return (
    <Card className="post-card">
      <div className="post-card__top">
        <img
          src={post.author === 'Clara Wang' ? img('me-avatar.png') : img('community-avatar.png')}
          alt=""
        />
        <div>
          <Badge tone={post.tone}>{post.tone === 'mom' ? 'Featured' : 'Care note'}</Badge>
          <strong>{post.author}</strong>
        </div>
      </div>
      <h3>{post.title}</h3>
      <p>{post.body}</p>
      <img className="post-card__image" src={img(post.image)} alt="" />
      <div className="post-actions">
        <span>
          <Heart size={17} />
          {post.likes}
        </span>
        <span>
          <MessageCircle size={17} />
          42
        </span>
        <span>
          <Search size={17} />
          Save
        </span>
      </div>
    </Card>
  );
}
