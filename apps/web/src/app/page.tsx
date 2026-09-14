/** Renders the interactive single-page portfolio views, navigation, contacts, and theme controls. */
"use client";

import { useState } from "react";
import Image from "next/image";
import { portfolioConfig } from "@/lib/portfolio-config";

type ThemeName = "light" | "dark" | "naruto";
type PageId = "home" | "about" | "experience" | "projects";

/**
 * Renders the decorative arrow used for external-link and call-to-action affordances.
 *
 * @returns An accessibility-hidden SVG arrow.
 */
function ArrowUpRight() {
  return <svg aria-hidden="true" viewBox="0 0 20 20" fill="none"><path d="M5 15 15 5M7 5h8v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

/**
 * Renders the software-engineering badge used by non-Naruto themes.
 *
 * @returns An accessibility-hidden SVG coding icon.
 */
function CoderIcon() {
  return <svg aria-hidden="true" viewBox="0 0 32 32" fill="none"><rect x="4" y="6" width="24" height="17" rx="2" /><path d="M2.5 26h27M12 12l-3 2.5 3 2.5m8-5 3 2.5-3 2.5m-2-7-4 9" /></svg>;
}

/**
 * Selects the navigation icon associated with a portfolio view.
 *
 * @param props - Navigation-icon properties.
 * @param props.page - Portfolio view whose icon should be rendered.
 * @returns The accessibility-hidden SVG for the requested view.
 */
function NavIcon({ page }: { page: PageId }) {
  if (page === "home") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 11 8-7 8 7v9h-6v-6h-4v6H4z" /></svg>;
  if (page === "about") return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M5 21c.5-5 2.8-7 7-7s6.5 2 7 7" /></svg>;
  if (page === "experience") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6V4h8v2m-13 4h18v10H3z" /><path d="M3 13h18M10 13v2h4v-2" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h6v6H4zM14 5h6v6h-6zM4 15h6v4H4zM14 15h6v4h-6z" /></svg>;
}

/**
 * Renders the introduction view and its theme-specific hero portrait.
 *
 * @param props - Home-view properties.
 * @param props.goTo - Callback that activates another portfolio view.
 * @param props.theme - Currently selected visual theme.
 * @returns The portfolio introduction section.
 */
function HomeView({ goTo, theme }: { goTo: (page: PageId) => void; theme: ThemeName }) {
  const heroPortrait = portfolioConfig.site.heroPortraits[theme];

  return (
    <section className="view home-view" aria-labelledby="home-heading">
      <div className="hero-copy">
        <p className="eyebrow"><span /> {portfolioConfig.site.availability.toUpperCase()}</p>
        <h1 id="home-heading">Hi, I&apos;m {portfolioConfig.site.name}.<br /><em>{portfolioConfig.site.role}.</em></h1>
        <p className="hero-intro">{portfolioConfig.site.tagline}</p>
        <div className="hero-actions">
          <button className="button button-primary" onClick={() => goTo("projects")} type="button">View the work <ArrowUpRight /></button>
          <button className="text-button" onClick={() => goTo("about")} type="button">A little about me <span>→</span></button>
        </div>
      </div>
      <div className="hero-art">
        <div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="hero-sun" /><div className="hero-portrait-frame"><Image className="hero-portrait" src={`/avatars/${heroPortrait.fileName}`} alt={heroPortrait.alt} fill sizes="(max-width: 700px) 80vw, 430px" priority /></div>
        <div className={`hero-badge ${theme === "naruto" ? "nin-badge" : "code-badge"}`} tabIndex={theme === "naruto" ? 0 : undefined} aria-label={theme === "naruto" ? "Meaning of the Nin symbol" : "Software engineering"} aria-describedby={theme === "naruto" ? "nin-meaning" : undefined}>
          <div className="hero-seal">{theme === "naruto" ? <span aria-hidden="true">忍</span> : <CoderIcon />}</div>
          {theme === "naruto" && <div className="nin-tooltip" id="nin-meaning" role="tooltip"><strong>忍 · Nin / Shinobi</strong><p>Endurance, perseverance, or acting in secret.</p><p>The character places a <b>blade (刃)</b> over a <b>heart (心)</b>—poetically, “a heart under a blade”: enduring hardship with a sword over one&apos;s chest.</p></div>}
        </div>
        <p className="art-caption">EST. 2026 · EARTH</p>
      </div>
      <p className="view-index">01 <span>—</span> INTRODUCTION</p>
    </section>
  );
}

/**
 * Renders the biography, experience preview, education, and technical skills.
 *
 * @param props - About-view properties.
 * @param props.goTo - Callback that activates another portfolio view.
 * @returns The complete About section.
 */
function AboutView({ goTo }: { goTo: (page: PageId) => void }) {
  const education = portfolioConfig.education[0];
  const skillGroups = Object.entries(portfolioConfig.skills);

  return (
    <section className="view inner-view" aria-labelledby="about-heading">
      <div className="section-label"><span>02</span> ABOUT</div>
      <div className="about-content">
        <h1 className="display-copy" id="about-heading">Systems-minded.<br /><em>Product-focused.</em></h1>
        <div className="about-side"><p>{portfolioConfig.about.summary}</p></div>
      </div>
      <section className="about-experience" aria-labelledby="about-experience-heading">
        <div className="about-section-heading"><div><p className="card-kicker">EXPERIENCE</p><h2 id="about-experience-heading">Where I&apos;ve worked</h2></div><button className="text-button" onClick={() => goTo("experience")} type="button">Want to know more? <span>→</span></button></div>
        <div className="experience-preview-list">{portfolioConfig.experience.map((item, index) => <article key={item.company}><span>0{index + 1}</span><h3>{item.role}</h3><p>{item.company}</p></article>)}</div>
      </section>
      {education && <article className="education-card"><div><p className="card-kicker">EDUCATION</p><h2>{education.institution}</h2><p>{education.degree} · Minor in {education.minor}</p><p>{education.location} · {education.graduation}</p></div><div className="education-stats"><span><strong>{education.gpa}</strong> GPA</span><span><strong>{education.distinction}</strong> Distinction</span></div><div className="honors">{education.honors.map((honor) => <span key={honor}>{honor}</span>)}</div></article>}
      <div className="skills-section"><p className="card-kicker">TECHNICAL TOOLKIT</p><div className="skills-grid">{skillGroups.map(([group, skills]) => <article key={group}><h2>{group.replace(/([A-Z])/g, " $1").replace("And", "&")}</h2><div className="tags">{skills.map((skill) => <span key={skill}>{skill}</span>)}</div></article>)}</div></div>
    </section>
  );
}

/**
 * Renders the configured employment history as a detailed timeline.
 *
 * @returns The complete Experience section.
 */
function ExperienceView() {
  return (
    <section className="view inner-view" aria-labelledby="experience-heading">
      <div className="section-label"><span>03</span> EXPERIENCE</div>
      <div className="section-heading"><h1 id="experience-heading">Experience is<br /><em>earned.</em></h1><p>A few places I&apos;ve learned, contributed, and left things better than I found them.</p></div>
      <div className="timeline">{portfolioConfig.experience.map((item, index) => <article className="timeline-row" key={item.company}><span className="timeline-period">0{index + 1}</span><div className="timeline-title"><h2>{item.role}</h2><p>{item.company} · {item.location}</p><p>{item.startDate} — {item.endDate}</p></div><div className="timeline-detail"><ul>{item.highlights.map((highlight) => <li key={highlight}>{highlight}</li>)}</ul><div className="tags">{item.technologies.map((technology) => <span key={technology}>{technology}</span>)}</div></div></article>)}</div>
    </section>
  );
}

/**
 * Renders featured projects and their configured descriptions and technologies.
 *
 * @returns The selected-work project grid.
 */
function ProjectsView() {
  const accents = ["sun", "violet", "mint"];

  return (
    <section className="view inner-view" aria-labelledby="projects-heading">
      <div className="section-label"><span>04</span> SELECTED WORK</div>
      <div className="projects-header"><h1 id="projects-heading">Made with care.<br /><em>Built to matter.</em></h1></div>
      <div className="project-grid">{portfolioConfig.projects.filter((project) => project.featured).map((project, index) => <article className={`project-card project-${accents[index % accents.length]}`} key={project.id}><div className="project-art"><span>0{index + 1}</span><div className="project-shape" /></div><div className="project-meta"><p>0{index + 1} / {project.subtitle ?? "PERSONAL PROJECT"}</p><h2>{project.title}</h2><p className="project-description">{project.summary}</p><ul className="project-highlights">{project.highlights.map((highlight) => <li key={highlight}>{highlight}</li>)}</ul><div className="tags">{project.technologies.map((technology) => <span key={technology}>{technology}</span>)}</div></div></article>)}</div>
    </section>
  );
}

/**
 * Coordinates active-view and theme state for the portfolio shell.
 *
 * @returns The navigation sidebar and currently selected portfolio view.
 */
export default function HomePage() {
  const [theme, setTheme] = useState<ThemeName>(portfolioConfig.site.defaultTheme as ThemeName);
  const [activePage, setActivePage] = useState<PageId>("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const enabledPages: Array<{ id: PageId; label: string }> = [
    { id: "home", label: "Home" },
    ...portfolioConfig.pages.filter((page) => page.enabled).map((page) => ({ id: page.id as PageId, label: page.label })),
  ];
  const email = portfolioConfig.contacts.find((contact) => contact.id === "email");
  const sidebarContacts = portfolioConfig.contacts.filter((contact) => contact.id !== "email");
  const goToPage = (page: PageId) => {
    setActivePage(page);
    setMobileMenuOpen(false);
  };

  return (
    <div className="site-shell" data-theme={theme}>
      <div className="site-noise" aria-hidden="true" />
      <aside className="sidebar" data-mobile-open={mobileMenuOpen}>
        <button className="brand" onClick={() => goToPage("home")} aria-label="Open home page" type="button"><Image className="brand-avatar" src={`/avatars/${portfolioConfig.site.avatarFileName}`} alt={portfolioConfig.site.avatarAlt} width={80} height={80} priority /><span className="brand-name"><strong>{portfolioConfig.site.name}</strong><small>{portfolioConfig.site.role}</small></span></button>
        <button className="mobile-menu-toggle" aria-controls="portfolio-navigation" aria-expanded={mobileMenuOpen} aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"} onClick={() => setMobileMenuOpen((open) => !open)} type="button">
          <span className="mobile-menu-icon" aria-hidden="true"><span /><span /><span /></span>
        </button>
        <div className="sidebar-menu" id="portfolio-navigation">
          <nav className="side-nav" aria-label="Portfolio pages">
            {enabledPages.map((page, index) => <button className={activePage === page.id ? "active" : ""} onClick={() => goToPage(page.id)} aria-current={activePage === page.id ? "page" : undefined} key={page.id} type="button"><span className="nav-number">0{index + 1}</span><span className="nav-icon"><NavIcon page={page.id} /></span><span className="nav-label">{page.label}</span><span className="nav-arrow">→</span></button>)}
          </nav>
          <div className="sidebar-bottom">
            <div className="theme-switcher" aria-label="Choose colour theme">{portfolioConfig.site.allowedThemes.map((availableTheme) => <button aria-label={`Use ${availableTheme} theme`} aria-pressed={theme === availableTheme} className={`theme-dot ${availableTheme}`} key={availableTheme} onClick={() => setTheme(availableTheme as ThemeName)} type="button" />)}</div>
            {email && <a className="sidebar-email" href={email.url}><span>Let&apos;s talk</span><ArrowUpRight /></a>}
            <div className="sidebar-links">{sidebarContacts.map((contact) => <a href={contact.url} key={contact.id} target={contact.url.startsWith("http") ? "_blank" : undefined} rel={contact.url.startsWith("http") ? "noreferrer" : undefined}>{contact.label}</a>)}</div>
            <p>© 2026 {portfolioConfig.site.name}</p>
          </div>
        </div>
      </aside>

      <main className="content-panel" key={activePage}>
        {activePage === "home" && <HomeView goTo={goToPage} theme={theme} />}
        {activePage === "about" && <AboutView goTo={goToPage} />}
        {activePage === "experience" && <ExperienceView />}
        {activePage === "projects" && <ProjectsView />}
      </main>
    </div>
  );
}
