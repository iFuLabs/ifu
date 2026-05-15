'use client'
import { useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import {
  Shield, CheckCircle, XCircle, Copy, ExternalLink,
  Loader2, AlertCircle, ArrowLeft, ToggleLeft, ToggleRight
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

const fetcher = (url: string) =>
  fetch(`${API_URL}${url}`, { credentials: 'include' }).then(r => {
    if (r.status === 403) throw new Error('UPGRADE_REQUIRED')
    if (!r.ok) throw new Error('Failed to fetch')
    return r.json()
  })

export default function SsoPage() {
  const { data, error, isLoading, mutate } = useSWR('/api/v1/sso', fetcher)

  if (error?.message === 'UPGRADE_REQUIRED') {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <Shield size={32} className="mx-auto mb-3 text-muted opacity-40" />
          <h2 className="text-lg font-medium text-ink mb-2">SSO requires the Scale plan</h2>
          <p className="text-sm text-muted mb-4">
            SAML Single Sign-On is available on the Scale tier. Upgrade to enable SSO for your organization.
          </p>
          <Link href="/billing" className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
            View plans
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/account" className="text-muted hover:text-ink transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="font-serif text-2xl font-normal text-ink">Single Sign-On</h1>
          <p className="text-sm text-muted mt-0.5">Configure SAML SSO for your organization</p>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-card border border-border rounded-xl p-8 flex items-center justify-center">
          <Loader2 size={20} className="animate-spin text-muted" />
        </div>
      ) : data?.configured ? (
        <ConfiguredView connection={data.connection} mutate={mutate} />
      ) : (
        <SetupView spConfig={data?.sp} instructions={data?.instructions} mutate={mutate} />
      )}
    </div>
  )
}

function SetupView({ spConfig, instructions, mutate }: { spConfig: any; instructions: any; mutate: () => void }) {
  const [form, setForm] = useState({
    displayName: '',
    domain: '',
    idpEntityId: '',
    idpSsoUrl: '',
    idpCertificate: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const res = await fetch(`${API_URL}/api/v1/sso`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Failed to save' }))
        throw new Error(err.message)
      }
      mutate()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* SP Config (what customer gives to their IdP) */}
      <div className="bg-accent-light border border-accent/20 rounded-xl p-5">
        <h2 className="text-sm font-medium text-accent mb-3">Step 1: Configure your Identity Provider</h2>
        <p className="text-sm text-accent/70 mb-4">
          Create a SAML application in your IdP (Okta, Azure AD, Google Workspace, etc.) and use these values:
        </p>
        <div className="space-y-3">
          <CopyField label="SP Entity ID (Audience URI)" value={spConfig?.spEntityId} />
          <CopyField label="ACS URL (Reply URL)" value={spConfig?.spAcsUrl} />
          <div className="text-xs text-accent/60 mt-2">
            Name ID format: <code className="bg-accent/10 px-1.5 py-0.5 rounded">urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</code>
          </div>
        </div>
      </div>

      {/* IdP Config Form */}
      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-medium text-ink mb-1">Step 2: Enter your IdP details</h2>
        <p className="text-xs text-muted">Copy these from your Identity Provider&apos;s SAML application settings.</p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Provider name</label>
            <input
              type="text"
              placeholder="e.g. Okta, Azure AD"
              value={form.displayName}
              onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-bg text-ink placeholder:text-muted/50 focus:outline-none focus:border-accent/50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Email domain *</label>
            <input
              type="text"
              placeholder="acme.com"
              required
              value={form.domain}
              onChange={e => setForm(f => ({ ...f, domain: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-bg text-ink placeholder:text-muted/50 focus:outline-none focus:border-accent/50"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">IdP Entity ID (Issuer)</label>
          <input
            type="text"
            placeholder="https://your-idp.com/app/..."
            value={form.idpEntityId}
            onChange={e => setForm(f => ({ ...f, idpEntityId: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-bg text-ink placeholder:text-muted/50 focus:outline-none focus:border-accent/50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">IdP SSO URL *</label>
          <input
            type="url"
            placeholder="https://your-idp.com/sso/saml"
            required
            value={form.idpSsoUrl}
            onChange={e => setForm(f => ({ ...f, idpSsoUrl: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-bg text-ink placeholder:text-muted/50 focus:outline-none focus:border-accent/50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">IdP X.509 Certificate *</label>
          <textarea
            placeholder="-----BEGIN CERTIFICATE-----&#10;MIICmTCCAYECBgF...&#10;-----END CERTIFICATE-----"
            required
            rows={5}
            value={form.idpCertificate}
            onChange={e => setForm(f => ({ ...f, idpCertificate: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-bg text-ink placeholder:text-muted/50 focus:outline-none focus:border-accent/50 font-mono text-xs"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-danger">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-ink text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
          {saving ? 'Saving...' : 'Save SSO Configuration'}
        </button>
      </form>
    </>
  )
}

function ConfiguredView({ connection, mutate }: { connection: any; mutate: () => void }) {
  const [verifying, setVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState('')
  const [verifySuccess, setVerifySuccess] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [updatingSettings, setUpdatingSettings] = useState(false)

  const handleVerifyDomain = async () => {
    setVerifying(true)
    setVerifyError('')
    setVerifySuccess(false)

    try {
      const res = await fetch(`${API_URL}/api/v1/sso/verify-domain`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Verification failed' }))
        throw new Error(err.message)
      }
      setVerifySuccess(true)
      mutate()
    } catch (err: any) {
      setVerifyError(err.message)
    } finally {
      setVerifying(false)
    }
  }

  const handleToggleSetting = async (key: string, value: boolean) => {
    setUpdatingSettings(true)
    try {
      await fetch(`${API_URL}/api/v1/sso/settings`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      })
      mutate()
    } catch {} finally {
      setUpdatingSettings(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Remove SSO configuration? Users will need to use email/password login.')) return
    setDeleting(true)
    try {
      await fetch(`${API_URL}/api/v1/sso`, { method: 'DELETE', credentials: 'include' })
      mutate()
    } catch {} finally {
      setDeleting(false)
    }
  }

  const isActive = connection.status === 'active'

  return (
    <>
      {/* Status card */}
      <div className={`border rounded-xl p-5 ${isActive ? 'bg-accent-light border-accent/20' : 'bg-card border-border'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isActive ? (
              <CheckCircle size={20} className="text-accent" />
            ) : (
              <AlertCircle size={20} className="text-warn" />
            )}
            <div>
              <h2 className="text-sm font-medium text-ink">
                {isActive ? 'SSO is active' : 'SSO pending verification'}
              </h2>
              <p className="text-xs text-muted mt-0.5">
                {connection.displayName} · {connection.domain}
              </p>
            </div>
          </div>
          <span className={`font-mono text-xs px-2 py-1 rounded ${isActive ? 'bg-accent/10 text-accent' : 'bg-warn/10 text-warn'}`}>
            {connection.status}
          </span>
        </div>
      </div>

      {/* Domain verification */}
      {!connection.domainVerified && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-medium text-ink">Verify domain ownership</h3>
          <p className="text-xs text-muted">
            Add a DNS TXT record to prove you own <strong>{connection.domain}</strong>:
          </p>
          <div className="bg-bg border border-border rounded-lg p-3 space-y-2">
            <CopyField label="Record type" value="TXT" />
            <CopyField label="Host / Name" value={`_ghara-verification.${connection.domain}`} />
            <CopyField label="Value" value={connection.domainVerificationToken} />
          </div>
          <p className="text-xs text-muted">DNS changes can take up to 48 hours to propagate.</p>

          {verifyError && (
            <div className="flex items-center gap-2 text-xs text-danger">
              <XCircle size={12} /> {verifyError}
            </div>
          )}
          {verifySuccess && (
            <div className="flex items-center gap-2 text-xs text-accent">
              <CheckCircle size={12} /> Domain verified! SSO is now active.
            </div>
          )}

          <button
            onClick={handleVerifyDomain}
            disabled={verifying}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-ink text-white hover:opacity-90 disabled:opacity-50"
          >
            {verifying ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
            {verifying ? 'Checking...' : 'Verify now'}
          </button>
        </div>
      )}

      {/* Settings (only when active) */}
      {isActive && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-medium text-ink">SSO Settings</h3>

          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm text-ink">Enforce SSO</div>
              <div className="text-xs text-muted">Block password login for @{connection.domain} users</div>
            </div>
            <button
              onClick={() => handleToggleSetting('enforceSso', !connection.enforceSso)}
              disabled={updatingSettings}
              className="text-muted hover:text-ink"
            >
              {connection.enforceSso
                ? <ToggleRight size={28} style={{ color: '#8A63E6' }} />
                : <ToggleLeft size={28} />
              }
            </button>
          </div>

          <div className="flex items-center justify-between py-2 border-t border-border">
            <div>
              <div className="text-sm text-ink">Just-in-time provisioning</div>
              <div className="text-xs text-muted">Auto-create accounts on first SSO login</div>
            </div>
            <button
              onClick={() => handleToggleSetting('jitProvisioning', !connection.jitProvisioning)}
              disabled={updatingSettings}
              className="text-muted hover:text-ink"
            >
              {connection.jitProvisioning
                ? <ToggleRight size={28} style={{ color: '#8A63E6' }} />
                : <ToggleLeft size={28} />
              }
            </button>
          </div>
        </div>
      )}

      {/* Connection details */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-medium text-ink">Connection details</h3>
        <div className="space-y-2">
          <CopyField label="SP Entity ID" value={connection.spEntityId} />
          <CopyField label="ACS URL" value={connection.spAcsUrl} />
          <CopyField label="IdP SSO URL" value={connection.idpSsoUrl} />
          {connection.idpEntityId && <CopyField label="IdP Entity ID" value={connection.idpEntityId} />}
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-card border border-danger/20 rounded-xl p-5">
        <h3 className="text-sm font-medium text-danger mb-2">Remove SSO</h3>
        <p className="text-xs text-muted mb-3">
          This will disable SSO for your organization. Users will need to use email/password login.
        </p>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-danger/30 text-danger hover:bg-danger/5 disabled:opacity-50"
        >
          {deleting ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
          Remove SSO configuration
        </button>
      </div>
    </>
  )
}

function CopyField({ label, value }: { label: string; value?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (!value) return
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[10px] font-medium text-muted uppercase tracking-wider">{label}</div>
        <div className="text-xs font-mono text-ink truncate">{value || '—'}</div>
      </div>
      {value && (
        <button onClick={handleCopy} className="flex-shrink-0 text-muted hover:text-ink transition-colors" title="Copy">
          {copied ? <CheckCircle size={13} className="text-accent" /> : <Copy size={13} />}
        </button>
      )}
    </div>
  )
}
