export type Service = {
  slug: string
  num: string
  label: string
  name: string
  tagline: string
  desc: string
  hero: string            // Unsplash photo URL (1600w)
  heroAlt: string
  items: string[]         // "What we deliver" bullets
  outcomes: string[]      // Headline outcomes
  process: { step: string; title: string; desc: string }[]
  faqs: { q: string; a: string }[]
  pricingBlurb: string
}

export const SERVICES: Service[] = [
  {
    slug: 'cost-optimisation',
    num: '01',
    label: 'FinOps',
    name: 'Cost Optimisation',
    tagline: 'Stop overpaying AWS.',
    desc: 'We audit your AWS spend, identify waste, and implement Savings Plans. Average client saves 25–40% within 30 days.',
    hero: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1600&q=80',
    heroAlt: 'Financial charts and spend analytics on a monitor',
    items: [
      'Full spend audit & waste report',
      'Rightsizing recommendations',
      'RI & Savings Plan strategy',
      'Cost anomaly monitoring setup',
    ],
    outcomes: [
      '25–40% reduction in monthly AWS spend',
      'Zero-downtime rightsizing of EC2, RDS, and EKS workloads',
      'Reserved Instance and Savings Plan coverage optimised for your commitment profile',
      'Continuous anomaly detection wired into Slack or email',
    ],
    process: [
      { step: '01', title: 'Spend audit', desc: 'We connect to your AWS account (read-only) and produce a full waste-and-opportunity report within a week.' },
      { step: '02', title: 'Plan & prioritise', desc: 'We turn findings into a ranked backlog — quick wins first, structural savings second.' },
      { step: '03', title: 'Implement', desc: 'We deliver every change as reviewable infrastructure-as-code, or pair with your engineers to ship.' },
      { step: '04', title: 'Monitor', desc: 'We set up anomaly detection and a monthly review cadence so savings stick.' },
    ],
    faqs: [
      { q: 'Do you need write access to our AWS account?', a: 'No. Every engagement starts read-only. Changes are delivered as pull requests your team reviews and applies.' },
      { q: 'How long before we see savings?', a: 'Most clients see 10–20% reduction within two weeks from quick wins (idle resources, orphaned volumes, stale snapshots). Structural savings follow over 30–60 days.' },
      { q: 'Do you take a share of savings?', a: 'No. Flat-fee engagement. We never take a percentage of what we save you — that incentivises padding the estimate.' },
    ],
    pricingBlurb: 'Fixed-fee spend audit from $4,900, or retainer engagement from $6,500/month.',
  },
  {
    slug: 'compliance-security',
    num: '02',
    label: 'Compliance',
    name: 'Compliance & Security',
    tagline: 'Audit-ready in weeks, not quarters.',
    desc: 'SOC 2, ISO 27001, GDPR, and HIPAA readiness — evidence collection, gap remediation, and audit preparation end-to-end.',
    hero: 'https://images.unsplash.com/photo-1562813733-b31f71025d54?auto=format&fit=crop&w=1600&q=80',
    heroAlt: 'Secure data centre with rows of servers',
    items: [
      'Gap assessment & risk report',
      'Control remediation delivery',
      'Evidence pack preparation',
      'Auditor liaison support',
    ],
    outcomes: [
      'SOC 2 Type I ready in 6–8 weeks for typical AWS-native SaaS',
      'ISO 27001, HIPAA, and GDPR readiness covered by the same control set',
      'All evidence automatically collected and dated — no screenshots-in-a-spreadsheet',
      'We sit beside you in auditor calls so answers are consistent and technical',
    ],
    process: [
      { step: '01', title: 'Gap assessment', desc: 'A two-week dive across your AWS account, code, and policies — scored against the relevant control set.' },
      { step: '02', title: 'Remediation plan', desc: 'Every gap gets an owner, a fix, and a deadline. We deliver code for the ones you want us to handle.' },
      { step: '03', title: 'Evidence automation', desc: 'We instrument control checks (AWS Config, Security Hub, custom scripts) so evidence collects itself.' },
      { step: '04', title: 'Audit prep', desc: 'We package evidence into an auditor-ready pack and join the audit calls with you.' },
    ],
    faqs: [
      { q: 'Which frameworks do you cover?', a: 'SOC 2 (Type I and II), ISO 27001, GDPR, HIPAA, and Cyber Essentials. The underlying control set overlaps significantly — we map once and reuse evidence.' },
      { q: 'Do you act as the auditor?', a: 'No. We prepare you for an independent auditor and sit alongside you during the audit. We can recommend auditors we\'ve worked with.' },
      { q: 'How does iFu Comply fit in?', a: 'iFu Comply is our SaaS product that automates evidence collection daily. Consultancy clients get it included in the retainer.' },
    ],
    pricingBlurb: 'SOC 2 readiness from $14,500 fixed-fee, or bundled into a compliance retainer from $7,500/month.',
  },
  {
    slug: 'cloud-migration',
    num: '03',
    label: 'Migration',
    name: 'Cloud Migration',
    tagline: 'Zero-surprise migrations.',
    desc: 'On-premise to AWS, workload re-platforming, or cross-cloud migrations. Zero surprise downtime.',
    hero: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1600&q=80',
    heroAlt: 'Network cables in a modern data centre',
    items: [
      'Discovery & dependency mapping',
      'Migration wave planning',
      'Lift-and-shift or re-architect',
      'AWS MAP program support',
    ],
    outcomes: [
      'Cut-over runbooks and rollback plans for every wave',
      'MAP funding secured where eligible — covers meaningful portion of migration cost',
      'Post-migration cost baseline established before day one in AWS',
      'Engineering team left fully trained on the new platform',
    ],
    process: [
      { step: '01', title: 'Discovery', desc: 'We inventory workloads, map dependencies, and classify each workload (rehost, replatform, refactor, retire).' },
      { step: '02', title: 'Wave planning', desc: 'We group workloads into migration waves — safest first, highest-value next — with explicit success criteria per wave.' },
      { step: '03', title: 'Migrate', desc: 'We execute each wave with a runbook, a rollback plan, and on-call coverage through cut-over.' },
      { step: '04', title: 'Optimise', desc: 'Post-migration, we run a cost and performance review and hand over architecture documentation.' },
    ],
    faqs: [
      { q: 'Do you do lift-and-shift or full re-architecture?', a: 'Both. Most migrations end up mixed — rehost the boring parts, refactor the parts that will benefit from cloud-native services.' },
      { q: 'Can you help with AWS MAP funding?', a: 'Yes. We\'re an AWS Partner and can run the MAP assessment and funding process for qualifying migrations.' },
      { q: 'What about data migration?', a: 'We use AWS DMS, Snowball, or direct replication depending on volume, bandwidth, and downtime tolerance. Large datasets are planned as dedicated waves.' },
    ],
    pricingBlurb: 'Discovery engagement from $9,800. Migration delivery priced per wave — typical SaaS platform $35k–$120k total.',
  },
  {
    slug: 'eks-ecs',
    num: '04',
    label: 'Containers',
    name: 'EKS & ECS Engineering',
    tagline: 'Kubernetes that survives contact with production.',
    desc: 'We design, build, and secure Kubernetes clusters on AWS — from architecture to production-grade operations.',
    hero: 'https://images.unsplash.com/photo-1494961104209-3c223057bd26?auto=format&fit=crop&w=1600&q=80',
    heroAlt: 'Stacked shipping containers',
    items: [
      'Cluster design & provisioning',
      'Helm chart & manifest reviews',
      'RBAC & network policy hardening',
      'Observability stack setup',
    ],
    outcomes: [
      'Hardened EKS or ECS clusters following AWS and CIS benchmarks',
      'Deployments via GitOps (Argo CD or Flux) with automated rollbacks',
      'Observability stack (Prometheus, Grafana, Loki) wired in on day one',
      'Runbooks and on-call guides written so your team can operate it without us',
    ],
    process: [
      { step: '01', title: 'Architecture', desc: 'We design cluster topology, networking, and workload tenancy based on your scale and compliance needs.' },
      { step: '02', title: 'Build', desc: 'We provision with Terraform or CDK, ship the base add-ons (ingress, secrets, observability), and harden defaults.' },
      { step: '03', title: 'Migrate workloads', desc: 'We move services in batches, review every Helm chart and Dockerfile, and pair with engineers on the first few.' },
      { step: '04', title: 'Operate & hand over', desc: 'We cover the first 30 days of operations with your team, then hand over with runbooks and training.' },
    ],
    faqs: [
      { q: 'EKS or ECS — which should we pick?', a: 'ECS for simpler workloads with no multi-cluster or portability needs. EKS if you need the Kubernetes ecosystem, want workload portability, or already have K8s expertise.' },
      { q: 'Do you support Fargate?', a: 'Yes. We\'ll often recommend Fargate for bursty or low-volume workloads where you don\'t want to run node pools.' },
      { q: 'Can you help with an existing cluster?', a: 'Yes. Our most common engagement is a health review and hardening of a cluster that\'s already in production.' },
    ],
    pricingBlurb: 'Cluster design + build from $18,000. Health review of an existing cluster from $6,500.',
  },
  {
    slug: 'devops-cicd',
    num: '05',
    label: 'DevOps',
    name: 'DevOps & CI/CD',
    tagline: 'Ship safely, ship often.',
    desc: 'Infrastructure as code, deployment pipelines, and platform engineering. Fast, reliable, and auditable delivery.',
    hero: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1600&q=80',
    heroAlt: 'Code on a developer monitor',
    items: [
      'Terraform & CDK implementation',
      'GitHub Actions / CodePipeline',
      'Blue/green & canary deployments',
      'Developer platform setup',
    ],
    outcomes: [
      'Deploy time reduced from hours to minutes with proper parallelism and caching',
      'Every environment reproducible from git — no more hand-crafted staging',
      'Blue/green and canary deployment patterns built into the pipeline',
      'Platform team self-service for common infra requests (no more tickets)',
    ],
    process: [
      { step: '01', title: 'Pipeline audit', desc: 'We inventory your current pipelines, environments, and release process — identify the real bottlenecks.' },
      { step: '02', title: 'Infrastructure as code', desc: 'We rebuild everything deployable from git — Terraform, CDK, or Pulumi depending on your team\'s taste.' },
      { step: '03', title: 'Ship the pipeline', desc: 'We deliver the end-to-end pipeline with tests, security scans, and deployment strategies wired in.' },
      { step: '04', title: 'Platform handover', desc: 'We document developer-facing workflows and train your team on owning it.' },
    ],
    faqs: [
      { q: 'Terraform or CDK?', a: 'We use both, and often both in one codebase. Terraform for long-lived infra, CDK for application-adjacent resources. We pick based on team familiarity.' },
      { q: 'GitHub Actions, GitLab, or CodePipeline?', a: 'All three. We usually recommend whatever your source of truth already lives in — the integration is worth more than pipeline features.' },
      { q: 'Can you help us build an internal developer platform?', a: 'Yes. From self-service preview environments to Backstage setup — we\'ve built these for teams of 10 to 150.' },
    ],
    pricingBlurb: 'Pipeline rebuild engagements from $12,000. Platform engineering via retainer from $8,500/month.',
  },
  {
    slug: 'managed-services',
    num: '06',
    label: 'Managed Services',
    name: 'Ongoing AWS Support',
    tagline: 'Your embedded cloud team.',
    desc: 'Retainer-based support. We act as your embedded cloud team — monitoring, incident response, and quarterly reviews.',
    hero: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1600&q=80',
    heroAlt: 'Distributed engineering team collaborating',
    items: [
      'Dedicated solutions engineer',
      '24/7 incident response SLA',
      'Monthly cost & security reviews',
      'Quarterly roadmap planning',
    ],
    outcomes: [
      'A named solutions engineer who knows your architecture cold',
      'Defined SLAs for incident response — 15 minutes for Sev 1, one hour for Sev 2',
      'Monthly cost and security reviews with actionable recommendations',
      'Quarterly roadmap planning sessions tied to your business goals',
    ],
    process: [
      { step: '01', title: 'Onboarding', desc: 'We spend two weeks learning your architecture, priorities, and runbooks. Nothing changes until we understand.' },
      { step: '02', title: 'Instrument', desc: 'We make sure alerting, logging, and on-call rotations meet the SLA we\'re signing up to.' },
      { step: '03', title: 'Operate', desc: 'We respond to incidents, ship improvements, and run monthly reviews. Your team stays in the loop on everything.' },
      { step: '04', title: 'Evolve', desc: 'Every quarter we step back, review outcomes against goals, and adjust the engagement.' },
    ],
    faqs: [
      { q: 'Is this a support contract or a fractional team?', a: 'Fractional team. You get scoped engineering hours per month plus the on-call SLA — not just a ticketing queue.' },
      { q: 'What about unused hours?', a: 'Hours roll over one month. Beyond that we adjust the retainer down — we\'d rather right-size than accumulate debt.' },
      { q: 'Do you work with our existing team?', a: 'That\'s the default mode. We pair with your engineers in Slack, join your standups where useful, and hand work back as your team grows.' },
    ],
    pricingBlurb: 'Managed services from $6,500/month — scaled to engineering hours and SLA tier.',
  },
]

export function getService(slug: string): Service | undefined {
  return SERVICES.find(s => s.slug === slug)
}
