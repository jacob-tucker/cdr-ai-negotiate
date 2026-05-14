import { Demo } from "./_components/Demo";

const GITHUB_URL = "https://github.com/jacob-tucker/cdr-ai-negotiate";

export default function Home() {
  return (
    <main className="shell">
      <nav className="topbar">
        <div className="left">
          <span className="dot" />
          <span><b>CDR × A2A</b></span>
          <span className="tag">a walkthrough</span>
        </div>
        <div className="right">
          <a
            className="gh-link"
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
          >
            <GithubIcon />
            <span>View on GitHub</span>
          </a>
        </div>
      </nav>

      <section className="hero">
        <p className="eyebrow">How it works</p>
        <h1>
          Two AI agents. <em>One data deal.</em>
        </h1>
        <p>
          A buyer agent finds a seller agent, they haggle over a price, settle
          the payment on-chain, and the buyer unlocks the seller&apos;s
          encrypted data — all on their own. Here are the seven steps that
          make it work.
        </p>
        <div className="hero-cta">
          <a className="btn primary" href={GITHUB_URL} target="_blank" rel="noreferrer">
            <GithubIcon />
            <span>See the code</span>
          </a>
          <a className="btn ghost" href="#walkthrough">
            <span>Start the walkthrough</span>
            <span aria-hidden>↓</span>
          </a>
        </div>
      </section>

      <div id="walkthrough">
        <Demo />
      </div>

      <footer className="footer">
        <span>A demo of agent-to-agent data markets.</span>
        <a href={GITHUB_URL} target="_blank" rel="noreferrer">
          source on github →
        </a>
      </footer>
    </main>
  );
}

function GithubIcon() {
  return (
    <svg
      aria-hidden
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="currentColor"
    >
      <path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.42 7.42 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}
