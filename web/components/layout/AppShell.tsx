import Link from "next/link";
import { ReactNode } from "react";


import styles from "./AppShell.module.css";

type Props = {
  active: "stream" | "aggregate" | "individual";
  children: ReactNode;
};

const NAV_LINKS = [
  { label: "Live Dashboard", href: "/", key: "stream" as const },
  { label: "Daily Briefing", href: "/briefing/aggregate", key: "aggregate" as const },
  { label: "Stock Analysis", href: "/briefing/individual", key: "individual" as const },
];

export function AppShell({
  active,
  children,
}: Props) {
  return (
    <div className="app-shell">
      <nav className={`glass-panel ${styles.nav}`}>
        <div className={styles.logoWrapper}>
          <div className={styles.logoDot} />
          <strong className={styles.logoText}>Market<span className="text-gradient">Mind</span></strong>
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
      </nav>
      <main className={`animate-fade-in ${styles.main}`}>
        {children}
      </main>
    </div>
  );
}
