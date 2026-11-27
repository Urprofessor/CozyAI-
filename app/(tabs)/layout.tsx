import { CozyShell } from '@/components/shell/CozyShell';
// The desktop demo panel is hidden for now; uncomment both lines to bring it back.
// import { DemoPanel } from '@/components/shell/DemoPanel';

// Shared phone shell: on desktop an iPhone (bezel, side buttons, status bar,
// Dynamic Island, home indicator) around the app; on phones the bare app,
// fullscreen. The tab bar and the Cozie overlay live here so they persist
// across tab route changes.
export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="demo-stage">
      {/* <DemoPanel /> */}
      <div className="phone-device">
        <span className="phone-device__btn is-action" aria-hidden />
        <span className="phone-device__btn is-up" aria-hidden />
        <span className="phone-device__btn is-down" aria-hidden />
        <span className="phone-device__btn is-power" aria-hidden />
        <section className="phone-screen" aria-label="CozyAI">
          <StatusBar />
          <div className="phone-app">
            <CozyShell>{children}</CozyShell>
          </div>
          <span className="phone-homebar" aria-hidden />
        </section>
      </div>
    </main>
  );
}

/** iOS status bar for the desktop frame (hidden on phones). */
function StatusBar() {
  return (
    <div className="phone-status" aria-hidden>
      <span className="phone-status__time">9:41</span>
      <span className="phone-status__island" />
      <span className="phone-status__icons">
        <svg viewBox="0 0 18 12" width="18" height="12">
          <rect x="0" y="8" width="3" height="4" rx="0.8" />
          <rect x="5" y="5.5" width="3" height="6.5" rx="0.8" />
          <rect x="10" y="3" width="3" height="9" rx="0.8" />
          <rect x="15" y="0" width="3" height="12" rx="0.8" />
        </svg>
        <svg viewBox="0 0 16 12" width="16" height="12">
          <path d="M8 11.5 5.7 9.2a3.3 3.3 0 0 1 4.6 0Z" />
          <path d="M3.6 7.1a6.3 6.3 0 0 1 8.8 0l-1.4 1.4a4.3 4.3 0 0 0-6 0Z" />
          <path d="M1.4 4.9a9.4 9.4 0 0 1 13.2 0l-1.4 1.4a7.4 7.4 0 0 0-10.4 0Z" />
        </svg>
        <svg viewBox="0 0 27 13" width="27" height="13">
          <rect x="0.5" y="0.5" width="23" height="12" rx="3.6" fill="none" stroke="currentColor" opacity="0.4" />
          <rect x="2" y="2" width="20" height="9" rx="2.2" />
          <path d="M25 4.5v4a2 2 0 0 0 0-4Z" opacity="0.45" />
        </svg>
      </span>
    </div>
  );
}
