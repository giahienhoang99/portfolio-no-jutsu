/** Provides shared navigation, theme controls, and mobile footer for portfolio routes. */
"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { portfolioConfig } from "../lib/portfolio-config";
import {
  navigationIdFromPathname,
  portfolioHref,
  type NavigationId,
  type PortfolioPageId,
} from "../lib/portfolio-navigation";

export type ThemeName = "light" | "dark" | "naruto";
export type { NavigationId, PortfolioPageId } from "../lib/portfolio-navigation";

interface PortfolioShellProps {
  children: ReactNode;
}

interface PortfolioControlsProps {
  className?: string;
  onThemeChange: (theme: ThemeName) => void;
  theme: ThemeName;
}

const defaultTheme = portfolioConfig.site.defaultTheme as ThemeName;
const PortfolioThemeContext = createContext<ThemeName>(defaultTheme);

/** Returns the active portfolio theme supplied by the persistent shell. */
export function usePortfolioTheme(): ThemeName {
  return useContext(PortfolioThemeContext);
}

function ArrowUpRight() {
  return <svg aria-hidden="true" viewBox="0 0 20 20" fill="none"><path d="M5 15 15 5M7 5h8v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function NavIcon({ page }: { page: NavigationId }) {
  if (page === "home") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 11 8-7 8 7v9h-6v-6h-4v6H4z" /></svg>;
  if (page === "about") return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M5 21c.5-5 2.8-7 7-7s6.5 2 7 7" /></svg>;
  if (page === "experience") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6V4h8v2m-13 4h18v10H3z" /><path d="M3 13h18M10 13v2h4v-2" /></svg>;
  if (page === "projects") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h6v6H4zM14 5h6v6h-6zM4 15h6v4H4zM14 15h6v4h-6z" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l3 3v15H6z" /><path d="M14 3v4h4M9 12h6M9 16h6" /></svg>;
}

function ContactIcon({ contact }: { contact: string }) {
  if (contact === "linkedin") return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M8 10v7M8 7v.01M12 17v-4a3 3 0 0 1 6 0v4M12 10v7" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3.3-.4 6.8-1.6 6.8-7.4A5.8 5.8 0 0 0 19.3 3 5.4 5.4 0 0 0 19.1 0S17.9-.4 15 1.6a13.4 13.4 0 0 0-6 0C6.1-.4 4.9 0 4.9 0a5.4 5.4 0 0 0-.2 3A5.8 5.8 0 0 0 3.2 7.1c0 5.8 3.5 7 6.8 7.4A4.8 4.8 0 0 0 9 18v4" /><path d="M9 19c-3 .9-3-1.5-4.2-2" /></svg>;
}

function PortfolioControls({ className = "", onThemeChange, theme }: PortfolioControlsProps) {
  const email = portfolioConfig.contacts.find((contact) => contact.id === "email");
  const socialContacts = portfolioConfig.contacts.filter((contact) => contact.id !== "email" && contact.id !== "resume");

  return (
    <div className={`portfolio-controls ${className}`.trim()}>
      <div className="theme-switcher" aria-label="Choose colour theme">{portfolioConfig.site.allowedThemes.map((availableTheme) => <button aria-label={`Use ${availableTheme} theme`} aria-pressed={theme === availableTheme} className={`theme-dot ${availableTheme}`} key={availableTheme} onClick={() => onThemeChange(availableTheme as ThemeName)} type="button" />)}</div>
      {email && <a className="sidebar-email" href={email.url}><span>Let&apos;s talk</span><ArrowUpRight /></a>}
      <div className="sidebar-links">{socialContacts.map((contact) => <a href={contact.url} key={contact.id} target={contact.url.startsWith("http") ? "_blank" : undefined} rel={contact.url.startsWith("http") ? "noreferrer" : undefined}><ContactIcon contact={contact.id} /><span>{contact.label}</span></a>)}</div>
      <p className="site-copyright">© 2026 {portfolioConfig.site.name}</p>
    </div>
  );
}

/** Wraps route content with the shared desktop and mobile portfolio navigation. */
export function PortfolioShell({ children }: PortfolioShellProps) {
  const pathname = usePathname();
  const activePage = navigationIdFromPathname(pathname);
  const [theme, setTheme] = useState<ThemeName>(defaultTheme);
  const [mobileMenuPath, setMobileMenuPath] = useState<string | null>(null);
  const mobileMenuOpen = mobileMenuPath === pathname;
  const navigationItems: Array<{ id: NavigationId; label: string }> = [
    { id: "home", label: "Home" },
    ...portfolioConfig.pages.filter((page) => page.enabled).map((page) => ({ id: page.id as PortfolioPageId, label: page.label })),
    { id: "resume", label: "Resume" },
  ];
  const navContents = (page: { id: NavigationId; label: string }) => <><span className="nav-icon"><NavIcon page={page.id} /></span><span className="nav-label">{page.label}</span><span className="nav-arrow">→</span></>;

  return (
    <PortfolioThemeContext.Provider value={theme}>
      <div className="site-shell" data-theme={theme}>
        <div className="site-noise" aria-hidden="true" />
        <aside className="sidebar" data-mobile-open={mobileMenuOpen}>
          <Link className="brand" href="/" aria-label="Open home page" onClick={() => setMobileMenuPath(null)}><Image className="brand-avatar" src={`/avatars/${portfolioConfig.site.avatarFileName}`} alt={portfolioConfig.site.avatarAlt} width={80} height={80} priority /><span className="brand-name"><strong>{portfolioConfig.site.name}</strong><small>{portfolioConfig.site.role}</small></span></Link>
          <button className="mobile-menu-toggle" aria-controls="portfolio-navigation" aria-expanded={mobileMenuOpen} aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"} onClick={() => setMobileMenuPath((openPath) => openPath === pathname ? null : pathname)} type="button">
            <span className="mobile-menu-icon" aria-hidden="true"><span /><span /><span /></span>
          </button>
          <div className="sidebar-menu" id="portfolio-navigation">
            <nav className="side-nav" aria-label="Portfolio pages">
              {navigationItems.map((page) => {
                const className = activePage === page.id ? "active" : "";
                const current = activePage === page.id ? "page" : undefined;
                return <Link className={className} href={portfolioHref(page.id)} aria-current={current} key={page.id} onClick={() => setMobileMenuPath(null)}>{navContents(page)}</Link>;
              })}
            </nav>
            <PortfolioControls className="sidebar-bottom" onThemeChange={setTheme} theme={theme} />
          </div>
        </aside>

        <main className="content-panel" key={pathname}>
          {children}
          <footer className="mobile-page-footer">
            <PortfolioControls onThemeChange={setTheme} theme={theme} />
          </footer>
        </main>
      </div>
    </PortfolioThemeContext.Provider>
  );
}
