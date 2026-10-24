import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import "./LandingPage.css";

const FEATURES = [
  {
    icon: "👥",
    title: "Real-time collaboration",
    text: "Draw together with your team and watch every stroke appear instantly, powered by Socket.io.",
  },
  {
    icon: "🖱️",
    title: "Live cursors & presence",
    text: "See who is on the board right now and follow their cursors as they move.",
  },
  {
    icon: "🎨",
    title: "Powerful drawing tools",
    text: "Freehand pen, shapes, colors and brush sizes on a smooth Fabric.js canvas.",
  },
  {
    icon: "🔗",
    title: "Share with a link",
    text: "Invite anyone with a link and choose whether they can edit or only view.",
  },
  {
    icon: "💾",
    title: "Autosave & undo/redo",
    text: "Your work is saved automatically, and undo and redo are always one click away.",
  },
  {
    icon: "📤",
    title: "Export anywhere",
    text: "Download your board as PNG or PDF, or export and import it as JSON.",
  },
];

const STEPS = [
  {
    title: "Create an account",
    text: "Sign up in seconds with your name, email and a password.",
  },
  {
    title: "Start a board",
    text: "Create a new board from your dashboard and start sketching ideas.",
  },
  {
    title: "Invite your team",
    text: "Share the link and collaborate live, from anywhere.",
  },
];

function scrollToSection(e, id) {
  e.preventDefault();
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function Cursor({ name, className }) {
  return (
    <div className={`lp-cursor ${className}`}>
      <svg width="16" height="20" viewBox="0 0 16 20" aria-hidden="true">
        <path d="M0 0 L0 16 L4.5 12 L8 19 L10.5 18 L7 11 L13 11 Z" />
      </svg>
      <span>{name}</span>
    </div>
  );
}

export default function LandingPage() {
  const { user, loading } = useAuth();

  if (loading) return <div className="page-message">Loading…</div>;
  // Logged-in users skip the landing page and go straight to their boards
  if (user) return <Navigate to="/dashboard" replace />;

  const year = new Date().getFullYear();

  return (
    <div className="landing">
      {/* ---------- Navbar ---------- */}
      <header className="lp-nav">
        <div className="lp-container lp-nav-inner">
          <Link to="/" className="lp-logo">
            <span className="lp-logo-mark">S</span>
            SyncBoard
          </Link>

          <nav className="lp-nav-links">
            <a href="#features" onClick={(e) => scrollToSection(e, "features")}>
              Features
            </a>
            <a href="#how" onClick={(e) => scrollToSection(e, "how")}>
              How it works
            </a>
          </nav>

          <div className="lp-nav-actions">
            <Link to="/login" className="lp-btn lp-btn-ghost">
              Log in
            </Link>
            <Link to="/login" className="lp-btn lp-btn-primary">
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* ---------- Hero ---------- */}
      <section className="lp-hero">
        <div className="lp-container lp-hero-inner">
          <div className="lp-hero-text">
            <span className="lp-badge">Real-time collaborative whiteboard</span>
            <h1 className="lp-hero-title">
              Think, sketch and build <span>together</span>, in sync.
            </h1>
            <p className="lp-hero-sub">
              SyncBoard is an infinite-feeling whiteboard where your whole team
              draws on the same canvas at the same time. No setup, no
              screen-sharing, just open a board and start.
            </p>
            <div className="lp-hero-cta">
              <Link to="/login" className="lp-btn lp-btn-primary lp-btn-lg">
                Start for free
              </Link>
              <a
                href="#features"
                className="lp-btn lp-btn-outline lp-btn-lg"
                onClick={(e) => scrollToSection(e, "features")}
              >
                See features
              </a>
            </div>
            <p className="lp-hero-note">Free to use · No credit card needed</p>
          </div>

          {/* Fake whiteboard preview (pure CSS/SVG, no images) */}
          <div className="lp-board" aria-hidden="true">
            <div className="lp-board-bar">
              <span className="lp-dot lp-dot-red" />
              <span className="lp-dot lp-dot-yellow" />
              <span className="lp-dot lp-dot-green" />
              <em>Team brainstorm</em>
              <b>All changes saved</b>
            </div>
            <div className="lp-board-canvas">
              <svg viewBox="0 0 480 300" className="lp-board-svg">
                <rect x="40" y="50" width="130" height="80" rx="10" className="lp-shape lp-shape-blue" />
                <circle cx="330" cy="100" r="48" className="lp-shape lp-shape-purple" />
                <rect x="200" y="190" width="150" height="70" rx="10" className="lp-shape lp-shape-green" />
                <path d="M170 90 C 220 60, 260 60, 282 95" className="lp-line" />
                <path d="M330 150 C 340 190, 320 200, 300 200" className="lp-line" />
                <path d="M60 220 C 90 180, 120 260, 160 215" className="lp-pen" />
                <text x="62" y="96" className="lp-text">Idea</text>
                <text x="306" y="105" className="lp-text">Plan</text>
                <text x="238" y="230" className="lp-text">Ship</text>
              </svg>
              <Cursor name="Alex" className="lp-cursor-a" />
              <Cursor name="Sam" className="lp-cursor-b" />
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Features ---------- */}
      <section id="features" className="lp-section">
        <div className="lp-container">
          <h2 className="lp-section-title">Everything you need to collaborate</h2>
          <p className="lp-section-sub">
            Simple enough for a quick sketch, powerful enough for your whole
            team.
          </p>

          <div className="lp-grid">
            {FEATURES.map((f) => (
              <article key={f.title} className="lp-card">
                <div className="lp-card-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section id="how" className="lp-section lp-section-alt">
        <div className="lp-container">
          <h2 className="lp-section-title">Up and running in three steps</h2>
          <p className="lp-section-sub">From sign-up to live collaboration in under a minute.</p>

          <div className="lp-steps">
            {STEPS.map((s, i) => (
              <div key={s.title} className="lp-step">
                <div className="lp-step-num">{i + 1}</div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Final CTA ---------- */}
      <section className="lp-section">
        <div className="lp-container">
          <div className="lp-cta">
            <h2>Ready to sync your ideas?</h2>
            <p>Create your first board and invite your team today.</p>
            <Link to="/login" className="lp-btn lp-btn-light lp-btn-lg">
              Create your free account
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <span className="lp-logo">
            <span className="lp-logo-mark">S</span>
            SyncBoard
          </span>
          <span className="lp-footer-text">
            © {year} SyncBoard. Built with React, Node.js, Socket.io and Fabric.js.
          </span>
          <Link to="/login" className="lp-footer-link">
            Log in
          </Link>
        </div>
      </footer>
    </div>
  );
}