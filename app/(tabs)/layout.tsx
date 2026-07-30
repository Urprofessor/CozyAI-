import { GlassTabBar } from '@/components/shell/GlassTabBar';

// Shared phone shell: centered frame on desktop, fullscreen on mobile.
// The tab bar lives here so it persists across tab route changes.
export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="demo-stage">
      <section className="phone-screen" aria-label="CozyAI">
        {children}
        <GlassTabBar />
      </section>
    </main>
  );
}
