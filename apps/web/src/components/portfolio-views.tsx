/** Renders the route-level portfolio content views. */
"use client";

import Image from "next/image";
import Link from "next/link";

import { usePortfolioTheme } from "@/components/portfolio-shell";
import { portfolioConfig } from "@/lib/portfolio-config";

function ArrowUpRight() {
  return <svg aria-hidden="true" viewBox="0 0 20 20" fill="none"><path d="M5 15 15 5M7 5h8v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function CoderIcon() {
  return <svg aria-hidden="true" viewBox="0 0 32 32" fill="none"><rect x="4" y="6" width="24" height="17" rx="2" /><path d="M2.5 26h27M12 12l-3 2.5 3 2.5m8-5 3 2.5-3 2.5m-2-7-4 9" /></svg>;
}

/** Renders the portfolio introduction and theme-specific hero portrait. */
export function HomeView() {
  const theme = usePortfolioTheme();
  const heroPortrait = portfolioConfig.site.heroPortraits[theme];

  return (
    <section className="view home-view" aria-labelledby="home-heading">
      <div className="hero-copy">
        <p className="eyebrow"><span /> {portfolioConfig.site.availability.toUpperCase()}</p>
        <h1 id="home-heading">Hi, I&apos;m {portfolioConfig.site.name}.<br /><em>{portfolioConfig.site.role}.</em></h1>
        <p className="hero-intro">{portfolioConfig.site.tagline}</p>
        <div className="hero-actions">
          <Link className="button button-primary" href="/projects">View the work <ArrowUpRight /></Link>
          <Link className="text-button" href="/about">A little about me <span>→</span></Link>
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

/** Renders the biography, experience preview, education, and technical skills. */
export function AboutView() {
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
        <div className="about-section-heading"><div><p className="card-kicker">EXPERIENCE</p><h2 id="about-experience-heading">Where I&apos;ve worked</h2></div><Link className="text-button" href="/experience">Want to know more? <span>→</span></Link></div>
        <div className="experience-preview-list">{portfolioConfig.experience.map((item, index) => <article key={item.company}><span>0{index + 1}</span><h3>{item.role}</h3><p>{item.company}</p></article>)}</div>
      </section>
      {education && <article className="education-card"><div><p className="card-kicker">EDUCATION</p><h2>{education.institution}</h2><p>{education.degree} · Minor in {education.minor}</p><p>{education.location} · {education.graduation}</p></div><div className="education-stats"><span><strong>{education.gpa}</strong> GPA</span><span><strong>{education.distinction}</strong> Distinction</span></div><div className="honors">{education.honors.map((honor) => <span key={honor}>{honor}</span>)}</div></article>}
      <div className="skills-section"><p className="card-kicker">TECHNICAL TOOLKIT</p><div className="skills-grid">{skillGroups.map(([group, skills]) => <article key={group}><h2>{group.replace(/([A-Z])/g, " $1").replace("And", "&")}</h2><div className="tags">{skills.map((skill) => <span key={skill}>{skill}</span>)}</div></article>)}</div></div>
    </section>
  );
}

/** Renders the configured employment history as a detailed timeline. */
export function ExperienceView() {
  return (
    <section className="view inner-view" aria-labelledby="experience-heading">
      <div className="section-label"><span>03</span> EXPERIENCE</div>
      <div className="section-heading"><h1 id="experience-heading">Experience is<br /><em>earned.</em></h1><p>A few places I&apos;ve learned, contributed, and left things better than I found them.</p></div>
      <div className="timeline">{portfolioConfig.experience.map((item, index) => <article className="timeline-row" key={item.company}><span className="timeline-period">0{index + 1}</span><div className="timeline-title"><h2>{item.role}</h2><p>{item.company} · {item.location}</p><p>{item.startDate} — {item.endDate}</p></div><div className="timeline-detail"><ul>{item.highlights.map((highlight) => <li key={highlight}>{highlight}</li>)}</ul><div className="tags">{item.technologies.map((technology) => <span key={technology}>{technology}</span>)}</div></div></article>)}</div>
    </section>
  );
}

/** Renders featured projects and their descriptions and technologies. */
export function ProjectsView() {
  const accents = ["sun", "violet", "mint"];

  return (
    <section className="view inner-view" aria-labelledby="projects-heading">
      <div className="section-label"><span>04</span> SELECTED WORK</div>
      <div className="projects-header"><h1 id="projects-heading">Made with care.<br /><em>Built to matter.</em></h1></div>
      <div className="project-grid">{portfolioConfig.projects.filter((project) => project.featured).map((project, index) => <article className={`project-card project-${accents[index % accents.length]}`} key={project.id}><div className="project-art"><span>0{index + 1}</span><div className="project-shape" /></div><div className="project-meta"><p>0{index + 1} / {project.subtitle ?? "PERSONAL PROJECT"}</p><h2>{project.title}</h2><p className="project-description">{project.summary}</p><ul className="project-highlights">{project.highlights.map((highlight) => <li key={highlight}>{highlight}</li>)}</ul><div className="tags">{project.technologies.map((technology) => <span key={technology}>{technology}</span>)}</div></div></article>)}</div>
    </section>
  );
}
