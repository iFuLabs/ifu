'use client'
import { useState, useEffect } from 'react'
import { Users, Plus, Trash2, Loader2, Mail, Shield, Crown } from 'lucide-react'
import clsx from 'clsx'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export default function TeamPage() {
  const [members, setMembers] = useState<any[]>([])
  const [invitations, setInvitations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState('')

  const fetchTeam = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/team`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setMembers(data.members || data)
        setInvitations(data.invitations || [])
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchTeam() }, [])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return

    setInviting(true)
    setError('')

    try {
      const res = await fetch(`${API_URL}/api/v1/team/invite`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || 'Failed to send invitation')
      }
      setInviteEmail('')
      setShowInvite(false)
      fetchTeam()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setInviting(false)
    }
  }

  const handleRemove = async (userId: string) => {
    if (!confirm('Remove this team member?')) return
    await fetch(`${API_URL}/api/v1/team/${userId}`, { method: 'DELETE', credentials: 'include' })
    fetchTeam()
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Team</h1>
          <p className="text-sm text-muted mt-0.5">{members.length} member{members.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors"
          style={{ background: '#33063D' }}
        >
          <Plus size={14} />
          Invite
        </button>
      </div>

      {/* Invite form */}
      {showInvite && (
        <div className="bg-card rounded-xl border border-border p-5 mb-6">
          <h2 className="text-sm font-medium text-ink mb-3">Invite a team member</h2>
          <form onSubmit={handleInvite} className="flex gap-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="flex-1 px-3 py-2 rounded-lg border border-border bg-bg text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value)}
              className="px-3 py-2 rounded-lg border border-border bg-bg text-ink text-sm"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="submit"
              disabled={inviting}
              className="px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
              style={{ background: '#33063D' }}
            >
              {inviting ? 'Sending...' : 'Send'}
            </button>
            <button
              type="button"
              onClick={() => setShowInvite(false)}
              className="px-3 py-2 text-sm text-muted hover:text-ink"
            >
              Cancel
            </button>
          </form>
          {error && <p className="text-sm text-danger mt-2">{error}</p>}
        </div>
      )}

      {/* Members list */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="divide-y divide-border">
          {members.map((member: any) => (
            <div key={member.id} className="flex items-center gap-3 px-5 py-3.5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0" style={{ background: '#8A63E6' }}>
                {(member.name?.[0] || member.email[0]).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink truncate">{member.name || member.email.split('@')[0]}</p>
                <p className="text-xs text-muted truncate">{member.email}</p>
              </div>
              <RoleBadge role={member.role} />
              {member.role !== 'owner' && (
                <button
                  onClick={() => handleRemove(member.id)}
                  className="text-muted hover:text-danger transition-colors p-1"
                  title="Remove"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Pending invitations */}
        {invitations.length > 0 && (
          <>
            <div className="px-5 py-2 bg-surface border-t border-border">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Pending invitations</span>
            </div>
            <div className="divide-y divide-border">
              {invitations.map((inv: any) => (
                <div key={inv.id} className="flex items-center gap-3 px-5 py-3">
                  <Mail size={14} className="text-muted flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted truncate">{inv.email}</p>
                  </div>
                  <span className="text-xs text-muted">Pending</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function RoleBadge({ role }: { role: string }) {
  const config: Record<string, { icon: React.ReactNode; bg: string; color: string }> = {
    owner: { icon: <Crown size={10} />, bg: '#DAC0FD', color: '#33063D' },
    admin: { icon: <Shield size={10} />, bg: 'rgba(138,99,230,0.1)', color: '#8A63E6' },
    member: { icon: null, bg: 'rgba(51,6,61,0.06)', color: 'rgba(51,6,61,0.6)' },
  }
  const c = config[role] || config.member
  return (
    <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full capitalize" style={{ background: c.bg, color: c.color }}>
      {c.icon} {role}
    </span>
  )
}
