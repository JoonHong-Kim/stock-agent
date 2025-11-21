import Link from "next/link";
import { ReactNode } from "react";

import { ButtonLink } from "@/components/ui/Button";

import styles from "./AppShell.module.css";

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
      <nav className={`glass-panel ${styles.nav}`}>
        <div className={styles.logoWrapper}>
          <div className={styles.logoDot} />
          <strong className={styles.logoText}>StockApp <span className="text-gradient">LLM</span></strong>
        </div>

        <div className={`nav-links ${styles.navLinks}`}>
          {NAV_LINKS.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              className={`nav-link ${active === link.key ? "nav-link--active" : ""} ${styles.navLink} ${active === link.key ? styles.navLinkActive : ""}`}
            >
              {link.label}
              {active === link.key && (
                <span className={styles.activeIndicator} />
              )}
            </Link>
          ))}
        </div>

        <ButtonLink variant="solid" href={actionHref} className="animate-pulse-glow">
          {actionLabel}
        </ButtonLink>
      </nav>
      <main className={`animate-fade-in ${styles.main}`}>
        {children}
      </main>
    </div>
  );
}
