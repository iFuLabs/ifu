import { TrendingDown, DollarSign, ArrowRight, Box, AlertTriangle, BarChart3 } from 'lucide-react'

export default function CostPage() {
  return (
    <main className="max-w-6xl mx-auto px-6 py-16">
      <div className="max-w-3xl">
        <h1 className="font-serif text-4xl text-plum mb-4">Stop paying for cloud you don't use.</h1>
        <p className="text-lg text-plum/70 mb-8">
          Ghara detects waste across AWS and Kubernetes. Idle resources, oversized instances, unused volumes — with dollar values attached.
        </p>
        <a href="https://app.ghara.cloud/signup" className="inline-flex items-center gap-2 px-6 py-3 bg-plum text-white rounded-lg font-medium hover:bg-plum/90 transition-colors">
          Start free trial <ArrowRight size={16} />
        </a>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mt-16">
        <Feature icon={<DollarSign size={20} />} title="8 waste types detected" desc="Unattached EBS, unused EIPs, stopped EC2, idle NAT/RDS/ALBs, old snapshots. Each with monthly savings estimate." />
        <Feature icon={<BarChart3 size={20} />} title="Rightsizing recommendations" desc="Top 20 instances from AWS Compute Optimizer with current vs recommended type and projected savings." />
        <Feature icon={<AlertTriangle size={20} />} title="Anomaly detection" desc="Automatic alerts when spend spikes unexpectedly. Catch runaway costs before the bill arrives." />
        <Feature icon={<Box size={20} />} title="Kubernetes cost" desc="Cost per namespace, per workload. Detect idle pods, oversized requests, and unused PVCs via OpenCost." />
      </div>
    </main>
  )
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex gap-4">
      <div className="w-10 h-10 rounded-lg bg-mint/30 flex items-center justify-center text-green-700 flex-shrink-0">{icon}</div>
      <div>
        <h3 className="font-semibold text-plum mb-1">{title}</h3>
        <p className="text-sm text-plum/70">{desc}</p>
      </div>
    </div>
  )
}
