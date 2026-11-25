import { CozyShell } from '@/components/shell/CozyShell';
// The desktop demo panel is hidden for now; uncomment both lines to bring it back.
// import { DemoPanel } from '@/components/shell/DemoPanel';

// Shared phone shell: centered frame on desktop, fullscreen on mobile.
// The tab bar and the Cozie overlay live here so they persist across tab
// route changes.
export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="demo-stage">
      {/* <DemoPanel /> */}
      <section className="phone-screen" aria-label="CozyAI">
        <CozyShell>{children}</CozyShell>
      </section>
    </main>
  );
}
