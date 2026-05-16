'use client'
import { useState, useEffect } from 'react'
import { Bell, MessageSquare, Mail, CheckCircle, Loader2, ExternalLink } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

const EVENTS = [
  { key: 'control_drift', label: 'Control drift', desc: 'When a control flips from pass to fail' },
  { key: 'scan_complete', label: 'Scan complete', desc: 'When a scheduled or manual scan finishes' },
  { key: 'anomaly_detected', label: 'Cost anomaly', desc: 'When spend spikes unexpectedly' },
  { key: 'monthly_summary', label: 'Monthly summary', desc: 'End-of-month compliance + cost report' },
  { key: 'trial_reminders', label: 'Trial reminders', desc: 'Trial progress and expiry notifications' },
]

export default function NotificationsPage() {
  const [slack, setSlack] = useState<any>(null)
  const [channels, setChannels] = useState<any[]>([])
  const [selectedChannel, setSelectedChannel] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [prefs, setPrefs] = useState<Record<string, { email: boolean; slack: boolean }>>({})
  const [me, setMe] = useState<any>(null)

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/v1/slack`, { credentials: 'include' }).then(r => r.ok ? r.json() : null),
      fetch(`${API_URL}/api/v1/slack/channels`, { credentials: 'include' }).then(r => r.ok ? r.json() : []),
      fetch(`${API_URL}/api/v1/auth/me`, { credentials: 'include' }).then(r => r.ok ? r.json() : null),
    ]).then(([slackData, channelData, meData]) => {
      setSlack(slackData)
      setChannels(channelData || [])
      setMe(meData)
      if (slackData?.channelId) setSelectedChannel(slackData.channelId)
      const defaults: Record<string, { email: boolean; slack: boolean }> = {}
      EVENTS.forEach(e => { defaults[e.key] = { email: true, slack: !!slackData?.active } })
      setPrefs(defaults)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const isAdmin = me?.user?.role === 'owner' || me?.user?.role === 'admin'

  const handleSlackInstall = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/slack/install`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        if (data.installUrl) {
          window.location.href = data.installUrl
        }
      }
    } catch {}
  }

  const handleChannelChange = async (channelId: string) => {
    setSelectedChannel(channelId)
    setSaving(true)
    try {
      await fetch(`${API_URL}/api/v1/slack`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId }),
      })
    } catch {}
    setSaving(false)
  }

  const togglePref = (event: string, channel: 'email' | 'slack') => {
    setPrefs(prev => ({
      ...prev,
      [event]: { ...prev[event], [channel]: !prev[event]?.[channel] }
    }))
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[300px]">
        <Loader2 size={24} className="animate-spin text-muted" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold text-ink mb-2">Notifications</h1>
      <p className="text-sm text-muted mb-6">Configure how and where you receive alerts.</p>

      {/* Slack connection */}
      <div className="bg-card rounded-xl border border-border p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(138,99,230,0.08)' }}>
              <MessageSquare size={18} style={{ color: '#8A63E6' }} />
            </div>
            <div>
              <h2 className="text-sm font-medium text-ink">Slack</h2>
              <p className="text-xs text-muted">
                {slack?.active ? `Connected to ${slack.teamName || 'workspace'}` : 'Not connected'}
              </p>
            </div>
          </div>
          {slack?.active ? (
            <span className="flex items-center gap-1 text-xs font-medium" style={{ color: '#067647' }}>
              <CheckCircle size={12} /> Connected
            </span>
          ) : isAdmin ? (
            <button
              onClick={handleSlackInstall}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-surface transition-colors"
            >
              <ExternalLink size={12} />
              Connect Slack
            </button>
          ) : (
            <span className="text-xs text-muted">Admin only</span>
          )}
        </div>

        {slack?.active && channels.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-ink mb-1">Default channel</label>
            <select
              value={selectedChannel}
              onChange={e => handleChannelChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
            >
              <option value="">Select a channel...</option>
              {channels.map((ch: any) => (
                <option key={ch.id} value={ch.id}>#{ch.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Event preferences */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-medium text-ink">Alert preferences</h2>
          <p className="text-xs text-muted mt-0.5">Choose which events trigger notifications and where they go.</p>
        </div>

        {/* Header row */}
        <div className="grid grid-cols-[1fr_80px_80px] px-5 py-2 border-b border-border bg-surface text-[11px] font-semibold uppercase tracking-wider text-muted">
          <span>Event</span>
          <span className="text-center">Email</span>
          <span className="text-center">Slack</span>
        </div>

        {/* Event rows */}
        {EVENTS.map(event => (
          <div key={event.key} className="grid grid-cols-[1fr_80px_80px] px-5 py-3 border-b border-border last:border-0 items-center">
            <div>
              <p className="text-sm text-ink">{event.label}</p>
              <p className="text-xs text-muted">{event.desc}</p>
            </div>
            <div className="flex justify-center">
              <Toggle
                checked={prefs[event.key]?.email ?? true}
                onChange={() => togglePref(event.key, 'email')}
              />
            </div>
            <div className="flex justify-center">
              <Toggle
                checked={prefs[event.key]?.slack ?? false}
                onChange={() => togglePref(event.key, 'slack')}
                disabled={!slack?.active}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`w-8 h-5 rounded-full transition-colors relative ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
      style={{ background: checked ? '#8A63E6' : 'rgba(51,6,61,0.12)' }}
      role="switch"
      aria-checked={checked}
    >
      <div
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform"
        style={{ left: checked ? '14px' : '2px' }}
      />
    </button>
  )
}
