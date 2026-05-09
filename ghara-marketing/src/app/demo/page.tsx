'use client'
import { useState } from 'react'
import { CheckCircle } from 'lucide-react'

export default function DemoPage() {
  const [submitted, setSubmitted] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [awsSpend, setAwsSpend] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // In production this would POST to an API endpoint that inserts into demo_requests table
    // For now, just show success
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <main className="max-w-lg mx-auto px-6 py-20 text-center">
        <CheckCircle size={48} className="text-iris mx-auto mb-4" />
        <h1 className="font-serif text-2xl text-plum mb-2">We'll be in touch</h1>
        <p className="text-plum/70">A member of our team will reach out within 24 hours to schedule your demo.</p>
      </main>
    )
  }

  return (
    <main className="max-w-lg mx-auto px-6 py-16">
      <h1 className="font-serif text-3xl text-plum mb-2">Request a demo</h1>
      <p className="text-plum/70 mb-8">For Scale-tier prospects and teams with complex requirements. We'll walk you through Ghara with your own data.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-plum mb-1">Name</label>
          <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-grey bg-white text-plum text-sm focus:outline-none focus:ring-2 focus:ring-iris/20 focus:border-iris" />
        </div>
        <div>
          <label className="block text-sm font-medium text-plum mb-1">Work email</label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-grey bg-white text-plum text-sm focus:outline-none focus:ring-2 focus:ring-iris/20 focus:border-iris" />
        </div>
        <div>
          <label className="block text-sm font-medium text-plum mb-1">Company</label>
          <input type="text" required value={company} onChange={e => setCompany(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-grey bg-white text-plum text-sm focus:outline-none focus:ring-2 focus:ring-iris/20 focus:border-iris" />
        </div>
        <div>
          <label className="block text-sm font-medium text-plum mb-1">Monthly AWS spend (approx)</label>
          <select value={awsSpend} onChange={e => setAwsSpend(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-grey bg-white text-plum text-sm focus:outline-none focus:ring-2 focus:ring-iris/20 focus:border-iris">
            <option value="">Select...</option>
            <option value="<10k">Under $10k/mo</option>
            <option value="10k-50k">$10k – $50k/mo</option>
            <option value="50k-100k">$50k – $100k/mo</option>
            <option value="100k+">$100k+/mo</option>
          </select>
        </div>
        <button type="submit" className="w-full py-2.5 rounded-lg bg-plum text-white text-sm font-medium hover:bg-plum/90 transition-colors">
          Request demo
        </button>
      </form>
    </main>
  )
}
