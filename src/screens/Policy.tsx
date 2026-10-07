import type { ReactNode } from 'react'

// Terms, Privacy, Refunds and Contact, each at its own address (/terms, /privacy, /refunds, /contact).
// Razorpay checks these before live payments, and readers deserve them anyway. Every line describes what the
// code does today; change the page when the code changes. Copy is (agent) until Prateek rewrites it, and it is
// not legal advice: worth a lawyer's read before real volume.

export const POLICY_PAGES = ['terms', 'privacy', 'refunds', 'contact'] as const
export type PolicyPage = (typeof POLICY_PAGES)[number]

const UPDATED = '7 October 2026'

// Prateek fills these. Shown on every page that needs them.
const CONTACT = {
  name: 'Prateek Kurkanji',
  email: 'prateekksubs@gmail.com',
  phone: '',      // TODO(Prateek)
  address: 'Bengaluru, Karnataka, India',
}

const TITLES: Record<PolicyPage, string> = {
  terms: 'Terms of use',
  privacy: 'Privacy',
  refunds: 'Refunds, cancellation and delivery',
  contact: 'Contact',
}

export function PolicyLinks() {
  return (
    <span className="policy-links">
      {POLICY_PAGES.map((p) => <a key={p} href={`/${p}`}>{p === 'refunds' ? 'Refunds' : TITLES[p].replace(' of use', '')}</a>)}
    </span>
  )
}

const Email = () => CONTACT.email ? <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> : <span>the email on the Contact page</span>

export default function Policy({ page }: { page: PolicyPage }) {
  document.title = `${TITLES[page]} · I Get It`
  return (
    <div className="shell">
      <header className="top">
        <a className="wordmark" href="/" style={{ color: 'inherit', textDecoration: 'none' }}>I Get It<small>Seven chapters. Twenty minutes a night.</small></a>
      </header>
      <main className="policy">
        <p className="sub" style={{ marginTop: 10 }}>Last updated {UPDATED}</p>
        <h1>{TITLES[page]}</h1>
        {BODY[page]}
      </main>
      <footer className="foot"><p><PolicyLinks /></p><p>Built in public for the GrowthX Build Sprint, October 2026.</p></footer>
    </div>
  )
}

const BODY: Record<PolicyPage, ReactNode> = {
  terms: (
    <>
      <p className="lede">I Get It is run by {CONTACT.name}, an individual in India. Using it means you agree to these terms. They're short on purpose.</p>
      <h2>What I Get It is</h2>
      <p>You type something you want to learn. An AI model (Claude, made by Anthropic) writes a seven-chapter handbook for you, one chapter at a time, and a second model checks each chapter for mistakes before you see it.</p>
      <p>It's a study aid. The checks catch a lot, not everything. On money, health and legal topics, treat it as a starting point and check before you act. Nothing here is professional advice.</p>
      <h2>Your account</h2>
      <p>You can read without signing in; your progress is kept on your phone. Sign in to keep it across devices and to pay. Keep your password to yourself; you're responsible for what happens under your account.</p>
      <h2>Fair use</h2>
      <p>Don't use I Get It to learn to hurt, threaten, deceive or stalk people, break into accounts or devices, or make weapons or drugs. It will decline those topics or offer a better version. Don't try to overload or break the service, or scrape it.</p>
      <h2>What you get, and what it costs</h2>
      <p>Free: one handbook you type, opening 1 new chapter of it a day; 1 new chapter a day from each of up to 3 ready or shared handbooks; 3 web-checked answers a week; 10 "Say it simpler" rewrites a day. Members: 3 typed handbooks on the go at a time (up to 6 new a month), up to 7 new chapters a day across everything, ready and shared handbooks without limit, 30 web-checked answers a month, unlimited "Say it simpler", printing or saving any of their handbooks as a PDF, and first access to new parts (a learning dashboard with streaks, Indian languages, days 8 to 28) when they launch. Chapters you've already opened stay open. When free readers' use costs too much in one day, new typed topics and web-checked answers pause for free readers until the next day; members are not paused.</p>
      <p>The member price depends on when you first pay: the first 50 paying readers pay ₹199 a month or ₹1,999 a year, the next 100 pay ₹299 or ₹2,999, the next 200 pay ₹399 or ₹3,999, and everyone after that pays ₹499 or ₹4,999. You keep the price you first paid as long as you pay again within 7 days of your time running out. The Pricing screen shows the tiers and how many spots are left.</p>
      <p>Each payment is one-time: a month covers 30 days and a year covers 365 days. Nothing renews by itself: you're only charged when you tap Pay and approve it in Razorpay's payment sheet. Prices include any taxes that apply.</p>
      <p>If we change what members get, this page will say so first, and anything you already paid for stays as it was until your time runs out.</p>
      <h2>Handbooks you make</h2>
      <p>The handbooks are written by the model for you. We may share a handbook in the public library so others can read it too. It's shared only after an automatic check that it holds nothing personal, and it never carries your name or email. If you want one taken down, write to <Email />.</p>
      <h2>Changes and limits</h2>
      <p>We may change or stop features. Payments are final, except when a payment goes wrong: see <a href="/refunds">Refunds</a>. The service is offered as it is; to the extent the law allows, our total responsibility to you is what you paid in the last 30 days. Indian law applies.</p>
      <p>See also <a href="/privacy">Privacy</a> and <a href="/refunds">Refunds</a>. Questions: <Email />.</p>
    </>
  ),
  privacy: (
    <>
      <p className="lede">What we keep, why, who else sees it, and how to have it deleted. No ads, no data sold, no outside analytics.</p>
      <h2>What we keep</h2>
      <ul className="policy-list">
        <li><strong>What you type:</strong> your topic (up to 200 characters), level, reading voice, the one-line profile you set, questions you ask on a card, and what you write in "teach it back".</li>
        <li><strong>How you read:</strong> your answers, progress, chapter ratings, and simple events (which screen and card you reached, phone or computer, screen width, the link you came from).</li>
        <li><strong>A device code:</strong> a random code stored on your phone so your progress works before you sign in. No cookies from anyone else.</li>
        <li><strong>If you sign in:</strong> your email and a scrambled form of your password (we never see the password itself).</li>
        <li><strong>If you turn on reminders:</strong> the push address your browser gives us and the time you chose.</li>
        <li><strong>If you pay:</strong> the amount, the date and Razorpay's order and payment numbers. Your card, UPI or bank details go to Razorpay only; we never see them.</li>
      </ul>
      <h2>Who else sees it</h2>
      <ul className="policy-list">
        <li><strong>Convex</strong> (United States) stores everything above and hosts the site.</li>
        <li><strong>Anthropic</strong> (United States) receives your topic, level, profile line and questions so Claude can write and check your chapters. Anthropic doesn't train its models on this data. Some questions are answered with a web search run through Anthropic; the search sees the question, not who asked it.</li>
        <li><strong>Razorpay</strong> (India) handles payments and sees what you enter in its payment sheet.</li>
        <li><strong>Research before writing:</strong> when you type a topic, its words (never anything about you) are used in web searches run through Anthropic, to look it up on Wikipedia, and, for films, series, books and games, to fetch the transcript of a public YouTube recap through <strong>Supadata</strong>.</li>
        <li><strong>Runway</strong> may draw a chapter's pictures from the chapter's own text. Photos come from Wikimedia Commons. Neither gets anything about you.</li>
        <li><strong>Google Fonts</strong> serves the typefaces, so your browser contacts Google when the page loads.</li>
        <li><strong>Your browser's push service</strong> (Google, Apple or Mozilla) delivers reminders, if you turned them on.</li>
      </ul>
      <p>Handbooks can be shared in the public library after an automatic check that they hold nothing personal. Shared copies never carry your name or email.</p>
      <h2>How long, and your choices</h2>
      <p>We keep your data while you use I Get It. Ask for a copy, a correction or deletion at <Email />, and we'll do it within 30 days. Deleting removes your handbooks, progress and sign-in. We keep payment records as long as Indian tax law requires.</p>
      <p>If you're under 18, use I Get It with a parent's or guardian's permission.</p>
      <p>Questions or complaints about your data go to {CONTACT.name} at <Email />.</p>
    </>
  ),
  refunds: (
    <>
      <p className="lede">Your first handbook is free, all seven chapters, so you can see exactly what you're paying for before you pay.</p>
      <h2>Refunds</h2>
      <p>Payments are final: we don't give refunds, for a month or a year. That's why your first handbook is free and nothing renews by itself, so you only ever pay for time you chose.</p>
      <p>The one exception is a payment that went wrong; see below.</p>
      <h2>Cancelling</h2>
      <p>There's nothing to cancel: nothing renews by itself. If you don't pay again, you aren't charged. Your handbooks and progress stay yours either way.</p>
      <h2>Delivery</h2>
      <p>I Get It is a digital service. Nothing is shipped. Your paid month or year starts the moment Razorpay confirms the payment, and the Pricing screen shows the date it runs until.</p>
      <h2>If a payment goes wrong</h2>
      <p>If you were charged twice, or you paid and your plan didn't start, write to <Email /> with the Razorpay payment number from your receipt, and we'll sort it out. We reply within 2 working days.</p>
      <p>If you were charged but the app doesn't show it yet, wait 10 minutes first: Razorpay sometimes confirms late.</p>
    </>
  ),
  contact: (
    <>
      <p className="lede">I Get It is made by one person, {CONTACT.name}. Write in about anything: a payment, your data, or a chapter that got something wrong.</p>
      <ul className="policy-list">
        <li><strong>Email:</strong> {CONTACT.email ? <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> : '(to be added)'}</li>
        {CONTACT.phone && <li><strong>Phone:</strong> {CONTACT.phone}</li>}
        {CONTACT.address && <li><strong>Address:</strong> {CONTACT.address}</li>}
      </ul>
      <p>We reply within 2 working days.</p>
    </>
  ),
}
