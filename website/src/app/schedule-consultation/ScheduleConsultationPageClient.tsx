'use client'
import '../globals.css'
import { useEffect } from 'react'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'

// Cal.com inline embed configuration.
// To change the event type, update CAL_LINK to your new <user>/<event-slug>.
const CAL_LINK = 'titus-nana-quayson-in7wsy/30min'
const CAL_NAMESPACE = '30min'

// Boot the Cal.com embed script and mount the inline widget on #ifu-cal-inline.
// Pattern taken verbatim from Cal.com's embed snippet, adapted for React.
function useCalEmbed() {
  useEffect(() => {
    /* eslint-disable */
    ;(function (C: any, A: string, L: string) {
      const p = function (a: any, ar: any) { a.q.push(ar) }
      const d = C.document
      C.Cal = C.Cal || function () {
        const cal = C.Cal
        const ar = arguments
        if (!cal.loaded) {
          cal.ns = {}
          cal.q = cal.q || []
          d.head.appendChild(d.createElement('script')).src = A
          cal.loaded = true
        }
        if (ar[0] === L) {
          const api: any = function () { p(api, arguments) }
          const namespace = ar[1]
          api.q = api.q || []
          if (typeof namespace === 'string') {
            cal.ns[namespace] = cal.ns[namespace] || api
            p(cal.ns[namespace], ar)
            p(cal, ['initNamespace', namespace])
          } else p(cal, ar)
          return
        }
        p(cal, ar)
      }
    })(window, 'https://app.cal.com/embed/embed.js', 'init')

    const Cal = (window as any).Cal
    Cal('init', CAL_NAMESPACE, { origin: 'https://app.cal.com' })
    Cal.ns[CAL_NAMESPACE]('inline', {
      elementOrSelector: '#ifu-cal-inline',
      config: { 
        layout: 'month_view', 
        useSlotsViewOnSmallScreen: true,
        theme: 'light'
      },
      calLink: CAL_LINK,
    })
    Cal.ns[CAL_NAMESPACE]('ui', {
      theme: 'light',
      hideEventTypeDetails: false,
      layout: 'month_view',
    })
    /* eslint-enable */
  }, [])
}

export default function ScheduleConsultationPageClient() {
  useCalEmbed()
  return (
    <>
      <SiteNav />

      {/* Hero */}
      <section style={{ maxWidth: '900px', margin: '0 auto', padding: '80px 32px 40px', textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          background: 'var(--brand-light)',
          border: '1px solid var(--border)',
          borderRadius: '999px',
          fontSize: '12px',
          fontWeight: 500,
          color: 'var(--brand)',
          letterSpacing: '0.02em',
          marginBottom: '24px',
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16A34A' }} />
          Free · 30 minutes · No commitment
        </div>
        <h1 style={{
          fontSize: 'clamp(36px, 5vw, 56px)',
          fontWeight: 600,
          color: 'var(--ink)',
          lineHeight: 1.1,
          letterSpacing: '-0.02em',
          marginBottom: '20px',
        }}>
          Schedule a free<br />
          <em style={{ fontStyle: 'italic', color: 'var(--brand)' }}>consultation.</em>
        </h1>
        <p style={{
          fontSize: '17px',
          color: 'var(--muted)',
          lineHeight: 1.6,
          maxWidth: '620px',
          margin: '0 auto',
        }}>
          Tell us what you&apos;re trying to build, migrate, or secure on AWS.
          We&apos;ll share an honest read on scope, risks, and whether we&apos;re the right fit —
          before you commit to anything.
        </p>
      </section>

      {/* What to expect + Who you'll talk to */}
      <section style={{ maxWidth: '1080px', margin: '0 auto', padding: '32px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px',
        }}>
          <div style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '32px',
          }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brand)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '16px' }}>
              What to expect
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { title: '30 minutes, over Zoom or Google Meet', desc: 'No cameras required. Just a conversation.' },
                { title: 'No sales pitch', desc: 'We won\u2019t push services you don\u2019t need.' },
                { title: 'A clear next step', desc: 'Even if the answer is that we\u2019re not the right fit.' },
              ].map(item => (
                <li key={item.title} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0, marginTop: '2px' }}>
                    <circle cx="9" cy="9" r="8" stroke="var(--brand)" strokeWidth="1.5" />
                    <path d="M5.5 9L8 11.5L12.5 7" stroke="var(--brand)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)', marginBottom: '2px' }}>{item.title}</div>
                    <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5 }}>{item.desc}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '32px',
          }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brand)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '16px' }}>
              Who you&apos;ll talk to
            </div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px' }}>
              An iFu Labs engineer
            </div>
            <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
              You&apos;ll talk to an engineer who has actually built, scaled, and secured
              the kind of system you&apos;re asking about — not a sales rep, not a junior screener.
              We keep the first call technical on purpose.
            </p>
          </div>
        </div>
      </section>

      {/* Scheduler */}
      <section style={{ maxWidth: '1080px', margin: '32px auto', padding: '0 32px' }}>
        <div style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '32px',
        }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: 600,
            color: 'var(--ink)',
            marginBottom: '8px',
            letterSpacing: '-0.01em',
          }}>
            Pick a time
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '24px' }}>
            Choose a slot that works for you. You&apos;ll get a calendar invite with the meeting link immediately.
          </p>

          <div
            id="ifu-cal-inline"
            style={{
              width: '100%',
              minHeight: '720px',
              overflow: 'auto',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              background: 'var(--surface)',
            }}
          />
        </div>
      </section>

      {/* What to prepare */}
      <section style={{ maxWidth: '1080px', margin: '64px auto', padding: '0 32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brand)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>
            Before the call
          </div>
          <h2 style={{
            fontSize: '28px',
            fontWeight: 600,
            color: 'var(--ink)',
            letterSpacing: '-0.01em',
          }}>
            What to prepare
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--muted)', maxWidth: '560px', margin: '12px auto 0', lineHeight: 1.6 }}>
            You don&apos;t need slides or a formal brief. Just be ready to talk through these.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '20px',
        }}>
          {[
            {
              num: '01',
              title: 'The problem in plain words',
              desc: 'A rough description of what you&apos;re trying to do — migrating, optimising, securing, or building from scratch.',
            },
            {
              num: '02',
              title: 'Your constraints',
              desc: 'Budget range, timeline, compliance requirements (SOC 2, HIPAA, PCI), and any hard deadlines.',
            },
            {
              num: '03',
              title: 'What you\u2019ve tried',
              desc: 'Previous attempts, tools you\u2019ve looked at, or internal opinions. Saves us asking twice.',
            },
          ].map(item => (
            <div key={item.num} style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              padding: '28px',
            }}>
              <div style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--brand)',
                letterSpacing: '0.08em',
                marginBottom: '12px',
              }}>
                {item.num}
              </div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px' }}>
                {item.title}
              </div>
              <p
                style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}
                dangerouslySetInnerHTML={{ __html: item.desc }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Trust strip */}
      <section style={{ maxWidth: '900px', margin: '0 auto 80px', padding: '0 32px' }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '28px',
          padding: '24px 32px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '999px',
          fontSize: '13px',
          color: 'var(--muted)',
        }}>
          {[
            'AWS Partner Network member',
            'Read-only access, always',
            'No lock-in contracts',
          ].map(t => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7L6 11L12 3" stroke="var(--brand)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t}
            </div>
          ))}
        </div>
      </section>

      <SiteFooter />
    </>
  )
}
