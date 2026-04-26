'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { Users, UserPlus, Mail, Shield, MoreVertical, X, Trash2, Copy, Check } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export default function TeamPage() {
  const { data: members, mutate: mutateMembers } = useSWR('/api/v1/team/members', () =>
    fetch(`${API_URL}/api/v1/team/members`, {
      credentials: 'include'
    }).then(r => r.json())
  )

  const { data: invitations, mutate: mutateInvitations } = useSWR('/api/v1/team/invitations', () =>
    fetch(`${API_URL}/api/v1/team/invitations`, {
      credentials: 'include'
    }).then(r => r.json())
  )

  const { data: planFeatures } = useSWR('/api/v1/plan/features', () =>
    fetch(`${API_URL}/api/v1/plan/features`, {
      credentials: 'include'
    }).then(r => r.json())
  )

  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'auditor'>('member')
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState('')
  const [inviteUrl, setInviteUrl] = useState('')
  const [copied, setCopied] = useState(false)

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      setError('Email is required')
      return
    }

    setInviting(true)
    setError('')

    try {
      const response = await fetch(`${API_URL}/api/v1/team/invite`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          product: 'comply'
        })
      })

      if (!response.ok) {
        const err = await response.json()
        
        // Check for plan upgrade required
        if (err.code === 'PLAN_UPGRADE_REQUIRED') {
          setError(`${err.message} You have ${err.currentMembers} of ${err.maxMembers} members.`)
          return
        }
        
        throw new Error(err.message || 'Failed to send invitation')
      }

      const data = await response.json()
      setInviteUrl(data.inviteUrl)
      mutateInvitations()
      setInviteEmail('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setInviting(false)
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) return

    try {
      await fetch(`${API_URL}/api/v1/team/members/${memberId}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      mutateMembers()
    } catch (err) {
      alert('Failed to remove member')
    }
  }

  const handleCancelInvite = async (inviteId: string) => {
    try {
      await fetch(`${API_URL}/api/v1/team/invitations/${inviteId}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      mutateInvitations()
    } catch (err) {
      alert('Failed to cancel invitation')
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-2xl font-normal text-ink">Team</h1>
          <p className="text-sm text-muted mt-0.5">Manage team members and their access</p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm rounded-lg hover:bg-accent-mid transition-all"
        >
          <UserPlus size={15} />
          Invite member
        </button>
      </div>

      {/* Plan limit warning */}
      {planFeatures?.limits.teamMembersReached && (
        <div className="bg-warn/10 border border-warn/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Shield size={16} className="text-warn flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-ink mb-1">Team member limit reached</p>
              <p className="text-xs text-muted mb-3">
                Your {planFeatures.plan} plan is limited to {planFeatures.features.maxTeamMembers} team members. 
                Upgrade to Growth for unlimited members.
              </p>
              <a 
                href="/dashboard/billing"
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-accent text-white text-xs rounded-lg hover:bg-accent-mid transition-all"
              >
                Upgrade to Growth
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Team members */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-ink">Team members ({members?.length || 0})</h2>
            {planFeatures?.features.maxTeamMembers && (
              <span className="text-xs text-muted font-mono">
                {members?.length || 0} / {planFeatures.features.maxTeamMembers}
              </span>
            )}
          </div>
        </div>

        <div className="divide-y divide-border">
          {members?.map((member: any) => (
            <div key={member.id} className="flex items-center gap-4 px-5 py-4">
              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white font-medium flex-shrink-0">
                {member.email[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-ink">{member.name || member.email.split('@')[0]}</div>
                <div className="text-xs text-muted">{member.email}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded font-mono ${
                  member.role === 'owner' ? 'bg-accent-light text-accent' :
                  member.role === 'admin' ? 'bg-warn/10 text-warn' :
                  'bg-border text-muted'
                }`}>
                  {member.role}
                </span>
                {member.role !== 'owner' && (
                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    className="p-1 text-muted hover:text-danger transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending invitations */}
      {invitations && invitations.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-medium text-ink">Pending invitations ({invitations.length})</h2>
          </div>

          <div className="divide-y divide-border">
            {invitations.map((invite: any) => (
              <div key={invite.id} className="flex items-center gap-4 px-5 py-4">
                <div className="w-10 h-10 rounded-full bg-border flex items-center justify-center text-muted flex-shrink-0">
                  <Mail size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ink">{invite.email}</div>
                  <div className="text-xs text-muted">Invited {new Date(invite.createdAt).toLocaleDateString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 bg-warn/10 text-warn rounded font-mono">
                    {invite.role}
                  </span>
                  <button
                    onClick={() => handleCancelInvite(invite.id)}
                    className="p-1 text-muted hover:text-danger transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/20">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-ink">Invite team member</h3>
              <button onClick={() => { setShowInviteModal(false); setInviteUrl(''); setError('') }} className="text-muted hover:text-ink">
                <X size={20} />
              </button>
            </div>

            {!inviteUrl ? (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-ink mb-2">Email address</label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="colleague@company.com"
                      className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-ink focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink mb-2">Role</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member' | 'auditor')}
                      className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-ink focus:outline-none focus:border-accent"
                    >
                      <option value="member">Member — Can view and manage controls</option>
                      <option value="admin">Admin — Can manage team and settings</option>
                      <option value="auditor">Auditor — Read-only access to all data</option>
                    </select>
                  </div>

                  {error && (
                    <div className="px-3 py-2 bg-danger/10 border border-danger/20 rounded-lg text-xs text-danger">
                      {error}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-6">
                  <button
                    onClick={() => { setShowInviteModal(false); setError('') }}
                    className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-muted hover:text-ink transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleInvite}
                    disabled={inviting}
                    className="flex-1 px-4 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent-mid transition-colors disabled:opacity-50"
                  >
                    {inviting ? 'Sending...' : 'Send invitation'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center py-4">
                  <div className="w-12 h-12 bg-accent-light rounded-full flex items-center justify-center mx-auto mb-3">
                    <Mail size={24} className="text-accent" />
                  </div>
                  <p className="text-sm text-ink mb-2">Invitation sent!</p>
                  <p className="text-xs text-muted mb-4">Share this link with {inviteEmail}</p>

                  <div className="flex items-center gap-2 p-3 bg-bg border border-border rounded-lg mb-4">
                    <code className="flex-1 text-xs text-muted truncate">{inviteUrl}</code>
                    <button
                      onClick={handleCopyLink}
                      className="flex-shrink-0 p-1 text-accent hover:text-accent-mid transition-colors"
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => { setShowInviteModal(false); setInviteUrl(''); setInviteEmail('') }}
                  className="w-full px-4 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent-mid transition-colors"
                >
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
