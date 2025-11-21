import Link from "next/link";
import { ReactNode } from "react";

import { ButtonLink } from "@/components/ui/Button";

type Props = {
  active: "stream" | "aggregate" | "individual";
  children: ReactNode;
  actionLabel?: string;
  actionHref?: string;
};

const NAV_LINKS = [
  { label: "Real-Time Stream", href: "/", key: "stream" as const },
  { label: "Aggregate Briefing", href: "/briefing/aggregate", key: "aggregate" as const },
  { label: "Individual Briefing", href: "/briefing/individual", key: "individual" as const },
];

export function AppShell({
  active,
  children,
  actionHref = "/briefing/aggregate",
  actionLabel = "AI Command",
}: Props) {
  return (
    <div className="app-shell">
      <nav className="glass-panel" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem 2rem',
        position: 'sticky',
        top: '1rem',
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: 'var(--color-primary)',
            boxShadow: '0 0 10px var(--color-primary)'
          }} />
          <strong style={{ fontSize: '1.2rem', letterSpacing: '-0.02em' }}>StockApp <span className="text-gradient">LLM</span></strong>
        </div>

        <div className="nav-links" style={{ display: 'flex', gap: '2rem' }}>
          {NAV_LINKS.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              className={`nav-link ${active === link.key ? "nav-link--active" : ""
                }`}
              style={{
                color: active === link.key ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                fontWeight: active === link.key ? 600 : 400,
                position: 'relative'
              }}
            >
              {link.label}
              {active === link.key && (
                <span style={{
                  position: 'absolute',
                  bottom: '-4px',
                  left: 0,
                  right: 0,
                  height: '2px',
                  background: 'var(--gradient-primary)',
                  borderRadius: '2px'
                }} />
              )}
            </Link>
          ))}
        </div>

        <ButtonLink variant="solid" href={actionHref} className="animate-pulse-glow">
          {actionLabel}
        </ButtonLink>
      </nav>
      <main className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {children}
      </main>
    </div>
  );
}
