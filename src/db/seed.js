import { db } from '../db/client.js'
import { controlDefinitions } from '../db/schema.js'

const SOC2_CONTROLS = [
  // ── Logical Access (CC6) ─────────────────────────────────────────────────
  {
    controlId: 'CC6.1-MFA',
    framework: 'soc2',
    category: 'Logical Access',
    title: 'MFA enabled for all IAM users',
    description: 'Multi-factor authentication is required for all user accounts with console access.',
    guidance: 'Enable MFA for all IAM users. Use aws iam list-mfa-devices to identify users without MFA. Consider using AWS IAM Identity Center (SSO) for centralized MFA enforcement.',
    severity: 'critical',
    automatable: true,
    checkFn: 'iamChecks'
  },
  {
    controlId: 'CC6.1-ROOT-MFA',
    framework: 'soc2',
    category: 'Logical Access',
    title: 'Root account MFA enabled',
    description: 'The AWS root account must have MFA enabled.',
    guidance: 'Enable MFA on the root account immediately. The root account should never be used for day-to-day operations. Create individual IAM users with appropriate permissions instead.',
    severity: 'critical',
    automatable: true,
    checkFn: 'iamChecks'
  },
  {
    controlId: 'CC6.2-PASSWORD',
    framework: 'soc2',
    category: 'Logical Access',
    title: 'Strong IAM password policy',
    description: 'IAM password policy enforces complexity, length, and expiry requirements.',
    guidance: 'Set a password policy requiring: minimum 14 characters, uppercase, lowercase, numbers, symbols, and password expiry every 90 days.',
    severity: 'high',
    automatable: true,
    checkFn: 'iamChecks'
  },
  {
    controlId: 'CC6.3-ACCESS-KEYS',
    framework: 'soc2',
    category: 'Logical Access',
    title: 'No stale access keys (>90 days)',
    description: 'IAM access keys unused for more than 90 days must be disabled or removed.',
    guidance: 'Rotate or disable access keys that have not been used in 90+ days. Use the IAM credential report to identify stale keys. Consider using IAM roles instead of long-lived access keys.',
    severity: 'high',
    automatable: true,
    checkFn: 'iamChecks'
  },
  {
    controlId: 'CC6.6-S3-PUBLIC',
    framework: 'soc2',
    category: 'Logical Access',
    title: 'S3 buckets block public access',
    description: 'All S3 buckets must have public access blocked unless explicitly required.',
    guidance: 'Enable S3 Block Public Access at the account level in S3 > Block Public Access settings. For individual buckets, enable all four block public access settings.',
    severity: 'critical',
    automatable: true,
    checkFn: 's3Checks'
  },
  {
    controlId: 'CC6.6-RDS-PUBLIC',
    framework: 'soc2',
    category: 'Logical Access',
    title: 'RDS instances not publicly accessible',
    description: 'RDS database instances must not be publicly accessible from the internet.',
    guidance: 'Set PubliclyAccessible to false on all RDS instances. Place databases in private subnets. Use VPC security groups to control access.',
    severity: 'critical',
    automatable: true,
    checkFn: 'rdsChecks'
  },
  {
    controlId: 'CC6.6-EC2-SG',
    framework: 'soc2',
    category: 'Logical Access',
    title: 'No security groups expose sensitive ports to internet',
    description: 'Security groups must not allow unrestricted access (0.0.0.0/0) to sensitive ports.',
    guidance: 'Remove inbound rules that allow 0.0.0.0/0 access to SSH (22), database ports (3306, 5432, 1433), or cache ports (6379). Use VPNs or bastion hosts for administrative access.',
    severity: 'critical',
    automatable: true,
    checkFn: 'ec2Checks'
  },

  // ── Monitoring & Logging (CC7) ───────────────────────────────────────────
  {
    controlId: 'CC7.1-GUARDDUTY',
    framework: 'soc2',
    category: 'Monitoring',
    title: 'AWS GuardDuty enabled',
    description: 'GuardDuty threat detection must be active in all used regions.',
    guidance: 'Enable GuardDuty in AWS Console > GuardDuty > Enable. Enable it in every region where you run workloads. Set up SNS notifications for high severity findings.',
    severity: 'high',
    automatable: true,
    checkFn: 'guarddutyChecks'
  },
  {
    controlId: 'CC7.2-CLOUDTRAIL',
    framework: 'soc2',
    category: 'Monitoring',
    title: 'CloudTrail multi-region logging active',
    description: 'A CloudTrail trail must be active and logging across all regions.',
    guidance: 'Create a multi-region CloudTrail trail that logs to S3. Enable CloudWatch Logs integration. Ensure the trail is in "Logging" status.',
    severity: 'critical',
    automatable: true,
    checkFn: 'cloudtrailChecks'
  },
  {
    controlId: 'CC7.2-CLOUDTRAIL-VALIDATION',
    framework: 'soc2',
    category: 'Monitoring',
    title: 'CloudTrail log file validation enabled',
    description: 'CloudTrail log file validation ensures logs have not been tampered with.',
    guidance: 'Enable log file validation when creating or modifying a CloudTrail trail. This creates a digest file to validate log integrity.',
    severity: 'medium',
    automatable: true,
    checkFn: 'cloudtrailChecks'
  },
  {
    controlId: 'CC7.2-S3-LOGGING',
    framework: 'soc2',
    category: 'Monitoring',
    title: 'S3 access logging enabled',
    description: 'S3 bucket access logging must be enabled to track all requests.',
    guidance: 'Enable server access logging on each S3 bucket. Configure a dedicated logging bucket. Ensure the logging bucket itself has access logging disabled to avoid recursion.',
    severity: 'medium',
    automatable: true,
    checkFn: 's3Checks'
  },

  // ── Data Protection (CC9) ────────────────────────────────────────────────
  {
    controlId: 'CC9.1-S3-ENCRYPTION',
    framework: 'soc2',
    category: 'Data Protection',
    title: 'S3 buckets encrypted at rest',
    description: 'All S3 buckets must have server-side encryption enabled.',
    guidance: 'Enable default encryption on each S3 bucket using SSE-S3 or SSE-KMS. SSE-KMS is preferred as it provides additional key management capabilities.',
    severity: 'high',
    automatable: true,
    checkFn: 's3Checks'
  },
  {
    controlId: 'CC9.1-RDS-ENCRYPTION',
    framework: 'soc2',
    category: 'Data Protection',
    title: 'RDS instances encrypted at rest',
    description: 'All RDS database instances must have storage encryption enabled.',
    guidance: 'Enable encryption when creating RDS instances. For existing unencrypted instances: create a snapshot, copy it with encryption enabled, restore from the encrypted snapshot.',
    severity: 'critical',
    automatable: true,
    checkFn: 'rdsChecks'
  },
  {
    controlId: 'CC9.1-EBS-ENCRYPTION',
    framework: 'soc2',
    category: 'Data Protection',
    title: 'EBS volumes encrypted at rest',
    description: 'All EBS volumes must be encrypted.',
    guidance: 'Enable EBS encryption by default at the account level (EC2 > Settings > EBS Encryption). For existing volumes: create a snapshot, copy with encryption, create new volume from snapshot.',
    severity: 'high',
    automatable: true,
    checkFn: 'ec2Checks'
  },
  {
    controlId: 'CC9.2-RDS-BACKUP',
    framework: 'soc2',
    category: 'Data Protection',
    title: 'RDS automated backups enabled',
    description: 'RDS instances must have automated backups enabled with a retention period of at least 7 days.',
    guidance: 'Enable automated backups on RDS instances with a minimum 7-day retention period. Consider Multi-AZ deployment for production databases.',
    severity: 'high',
    automatable: true,
    checkFn: 'rdsChecks'
  },

  // ── Manual controls (not automatable) ───────────────────────────────────
  {
    controlId: 'CC1.1-SECURITY-POLICY',
    framework: 'soc2',
    category: 'Control Environment',
    title: 'Information security policy documented',
    description: 'A formal information security policy must be documented, approved, and communicated.',
    guidance: 'Create a written information security policy that covers: scope, objectives, roles and responsibilities, and acceptable use. Review and approve annually.',
    severity: 'high',
    automatable: false,
    checkFn: null
  },
  {
    controlId: 'CC2.1-RISK-ASSESSMENT',
    framework: 'soc2',
    category: 'Risk Assessment',
    title: 'Annual risk assessment completed',
    description: 'A formal risk assessment must be completed at least annually.',
    guidance: 'Conduct and document an annual risk assessment covering: asset inventory, threat identification, vulnerability assessment, and risk treatment plan.',
    severity: 'high',
    automatable: false,
    checkFn: null
  },
  {
    controlId: 'CC3.1-VENDOR-MANAGEMENT',
    framework: 'soc2',
    category: 'Risk Assessment',
    title: 'Vendor risk management process',
    description: 'Third-party vendors with access to systems or data must be assessed for risk.',
    guidance: 'Maintain a vendor inventory. Collect SOC 2 reports or security questionnaires from critical vendors. Review vendor certifications annually.',
    severity: 'medium',
    automatable: false,
    checkFn: null
  },
  {
    controlId: 'CC6.7-ENCRYPTION-TRANSIT',
    framework: 'soc2',
    category: 'Logical Access',
    title: 'Data encrypted in transit (TLS)',
    description: 'All data in transit must be encrypted using TLS 1.2 or higher.',
    guidance: 'Enforce HTTPS on all public endpoints. Configure ALB/CloudFront to redirect HTTP to HTTPS. Use ACM for SSL/TLS certificates. Disable TLS 1.0 and 1.1.',
    severity: 'critical',
    automatable: false,
    checkFn: null
  }
]

async function seed() {
  console.log('🌱 Seeding control definitions...')

  for (const control of SOC2_CONTROLS) {
    await db
      .insert(controlDefinitions)
      .values(control)
      .onConflictDoUpdate({
        target: controlDefinitions.controlId,
        set: {
          title: control.title,
          description: control.description,
          guidance: control.guidance,
          severity: control.severity,
          automatable: control.automatable
        }
      })
  }

  console.log(`✅ Seeded ${SOC2_CONTROLS.length} control definitions`)
  process.exit(0)
}

seed().catch(err => {
  console.error('Seed failed:', err)
  process.exit(1)
})

// GitHub controls added separately for clarity
const GITHUB_CONTROLS = [
  {
    controlId: 'CC6.1-GH-2FA',
    framework: 'soc2',
    category: 'Logical Access',
    title: '2FA required for all GitHub org members',
    description: 'All members of the GitHub organisation must have two-factor authentication enabled.',
    guidance: 'Go to GitHub org Settings → Authentication security → Require two-factor authentication. Members without 2FA will be removed automatically.',
    severity: 'critical',
    automatable: true,
    checkFn: 'githubChecks'
  },
  {
    controlId: 'CC6.1-GH-DEPLOY-KEYS',
    framework: 'soc2',
    category: 'Logical Access',
    title: 'No stale GitHub deploy keys (>90 days)',
    description: 'Deploy keys older than 90 days should be rotated or removed.',
    guidance: 'Review deploy keys under repo Settings → Deploy keys. Remove or rotate any keys older than 90 days.',
    severity: 'medium',
    automatable: true,
    checkFn: 'githubChecks'
  },
  {
    controlId: 'CC6.2-GH-BRANCH',
    framework: 'soc2',
    category: 'Logical Access',
    title: 'Branch protection on all default branches',
    description: 'Default branches must have branch protection rules to prevent direct pushes.',
    guidance: 'For each repo: Settings → Branches → Add rule. Require pull requests, minimum 1 approval, status checks, include administrators.',
    severity: 'high',
    automatable: true,
    checkFn: 'githubChecks'
  },
  {
    controlId: 'CC6.7-GH-SECRETS',
    framework: 'soc2',
    category: 'Logical Access',
    title: 'Secret scanning enabled across repositories',
    description: 'GitHub secret scanning must be enabled to detect accidentally committed credentials.',
    guidance: 'Org Settings → Code security and analysis → Secret scanning → Enable all.',
    severity: 'high',
    automatable: true,
    checkFn: 'githubChecks'
  },
  {
    controlId: 'CC7.2-GH-DEPENDABOT',
    framework: 'soc2',
    category: 'Monitoring',
    title: 'Dependabot vulnerability alerts enabled',
    description: 'Dependency vulnerability alerts must be enabled to detect known CVEs.',
    guidance: 'Org Settings → Code security and analysis → Dependabot alerts → Enable all.',
    severity: 'high',
    automatable: true,
    checkFn: 'githubChecks'
  },
  {
    controlId: 'CC8.1-GH-REVIEWS',
    framework: 'soc2',
    category: 'Change Management',
    title: 'Pull request reviews required before merging',
    description: 'At least one approved review must be required before code merges to default branches.',
    guidance: 'Set branch protection to require a minimum of 1 approving PR review. Enable dismiss stale reviews.',
    severity: 'high',
    automatable: true,
    checkFn: 'githubChecks'
  }
]

async function seedGithub() {
  console.log('🌱 Seeding GitHub control definitions...')
  for (const control of GITHUB_CONTROLS) {
    await db.insert(controlDefinitions).values(control)
      .onConflictDoUpdate({
        target: controlDefinitions.controlId,
        set: { title: control.title, description: control.description, guidance: control.guidance, severity: control.severity }
      })
  }
  console.log(`✅ Seeded ${GITHUB_CONTROLS.length} GitHub controls`)
}


// ── ISO 27001 Controls ─────────────────────────────────────────────────────
const ISO27001_CONTROLS = [
  { controlId: 'ISO-A.9.4.2-MFA', framework: 'iso27001', category: 'Access Control', title: 'Secure log-on — MFA required for all users', description: 'All user accounts must use multi-factor authentication to access systems.', guidance: 'Enable MFA for all IAM users. Consider AWS IAM Identity Center for centralised MFA enforcement.', severity: 'critical', automatable: true, checkFn: 'isoChecks' },
  { controlId: 'ISO-A.9.4.3-PASSWORD', framework: 'iso27001', category: 'Access Control', title: 'Password management system', description: 'A strong IAM password policy must be enforced across the AWS account.', guidance: 'Set password policy: minimum 12 characters, uppercase, lowercase, numbers, expiry every 90 days.', severity: 'high', automatable: true, checkFn: 'isoChecks' },
  { controlId: 'ISO-A.10.1.1-S3', framework: 'iso27001', category: 'Cryptography', title: 'S3 encryption at rest', description: 'All S3 buckets must have server-side encryption enabled to protect stored data.', guidance: 'Enable default encryption on each S3 bucket using SSE-S3 or SSE-KMS.', severity: 'high', automatable: true, checkFn: 'isoChecks' },
  { controlId: 'ISO-A.10.1.1-EBS', framework: 'iso27001', category: 'Cryptography', title: 'EBS volumes encrypted at rest', description: 'All EBS volumes must be encrypted.', guidance: 'Enable EBS encryption by default at account level: EC2 → Settings → EBS Encryption.', severity: 'high', automatable: true, checkFn: 'isoChecks' },
  { controlId: 'ISO-A.10.1.1-RDS', framework: 'iso27001', category: 'Cryptography', title: 'RDS encryption at rest', description: 'All RDS database instances must have storage encryption enabled.', guidance: 'Enable encryption when creating RDS instances. For existing instances: snapshot → copy encrypted → restore.', severity: 'critical', automatable: true, checkFn: 'isoChecks' },
  { controlId: 'ISO-A.12.1.2-CONFIG', framework: 'iso27001', category: 'Operations Security', title: 'AWS Config enabled — change management', description: 'AWS Config must be enabled to track configuration changes across resources.', guidance: 'Enable AWS Config in each region: Config → Get started → Record all resources.', severity: 'high', automatable: true, checkFn: 'isoChecks' },
  { controlId: 'ISO-A.12.4.1-CLOUDTRAIL', framework: 'iso27001', category: 'Operations Security', title: 'Event logging — CloudTrail active', description: 'A multi-region CloudTrail trail must be active and logging all management events.', guidance: 'Create a multi-region CloudTrail trail logging to S3 with log file validation enabled.', severity: 'critical', automatable: true, checkFn: 'isoChecks' },
  { controlId: 'ISO-A.13.1.1-SG', framework: 'iso27001', category: 'Network Security', title: 'Network controls — no open sensitive ports', description: 'Security groups must not allow unrestricted access to sensitive ports from the internet.', guidance: 'Remove inbound rules allowing 0.0.0.0/0 to SSH (22), database (3306, 5432, 1433), or cache ports (6379).', severity: 'critical', automatable: true, checkFn: 'isoChecks' },
  { controlId: 'ISO-A.13.2.3-S3-PUBLIC', framework: 'iso27001', category: 'Network Security', title: 'S3 buckets block public access', description: 'All S3 buckets must block public access unless explicitly required.', guidance: 'Enable S3 Block Public Access at the account level in S3 → Block Public Access settings.', severity: 'critical', automatable: true, checkFn: 'isoChecks' },
  { controlId: 'ISO-A.18.1.3-VERSIONING', framework: 'iso27001', category: 'Compliance', title: 'S3 versioning enabled — record protection', description: 'S3 buckets must have versioning enabled to protect records from accidental deletion.', guidance: 'Enable versioning on each S3 bucket: Bucket → Properties → Bucket Versioning → Enable.', severity: 'medium', automatable: true, checkFn: 'isoChecks' },
  { controlId: 'ISO-A.5.1.1-POLICY', framework: 'iso27001', category: 'Information Security Policies', title: 'Information security policy documented', description: 'A formal information security policy must exist, be approved by management, and communicated to staff.', guidance: 'Create and publish an Information Security Policy covering scope, objectives, roles, and responsibilities. Review annually.', severity: 'high', automatable: false, checkFn: null },
  { controlId: 'ISO-A.6.1.1-ROLES', framework: 'iso27001', category: 'Organisation of Information Security', title: 'Information security roles defined', description: 'Roles and responsibilities for information security must be clearly defined and allocated.', guidance: 'Document security roles (CISO, data owner, system owner). Ensure each role has a named individual.', severity: 'medium', automatable: false, checkFn: null },
  { controlId: 'ISO-A.12.6.1-VULN', framework: 'iso27001', category: 'Operations Security', title: 'Vulnerability management process', description: 'A process for identifying, assessing, and remediating technical vulnerabilities must be in place.', guidance: 'Enable Amazon Inspector for EC2 and ECR scanning. Set up Dependabot on GitHub repositories. Define SLAs for remediation by severity.', severity: 'high', automatable: false, checkFn: null },
]

// ── GDPR Controls ──────────────────────────────────────────────────────────
const GDPR_CONTROLS = [
  { controlId: 'GDPR-ART5-ENCRYPTION', framework: 'gdpr', category: 'Data Integrity & Confidentiality', title: 'Personal data encrypted at rest (S3)', description: 'S3 buckets that may store personal data must have encryption at rest enabled (Article 5(1)(f)).', guidance: 'Enable SSE-KMS on all S3 buckets. Prefer customer-managed KMS keys for personal data stores.', severity: 'critical', automatable: true, checkFn: 'gdprChecks' },
  { controlId: 'GDPR-ART32-RDS', framework: 'gdpr', category: 'Security of Processing', title: 'Personal data encrypted at rest (RDS)', description: 'Databases storing personal data must have storage encryption enabled (Article 32).', guidance: 'Enable RDS storage encryption. For existing databases: take snapshot, copy with encryption, restore.', severity: 'critical', automatable: true, checkFn: 'gdprChecks' },
  { controlId: 'GDPR-ART25-MFA', framework: 'gdpr', category: 'Data Protection by Design', title: 'MFA enforced — access to personal data', description: 'All accounts with access to systems processing personal data must use MFA (Article 25).', guidance: 'Enable MFA for all IAM users. Enforce MFA via IAM policies: deny all actions unless MFA is present.', severity: 'critical', automatable: true, checkFn: 'gdprChecks' },
  { controlId: 'GDPR-ART25-S3-PUBLIC', framework: 'gdpr', category: 'Data Protection by Design', title: 'No public access to personal data (S3)', description: 'S3 buckets must not be publicly accessible where they may contain personal data (Article 25).', guidance: 'Enable S3 Block Public Access at account level. Audit all buckets for public ACLs and bucket policies.', severity: 'critical', automatable: true, checkFn: 'gdprChecks' },
  { controlId: 'GDPR-ART30-LOGGING', framework: 'gdpr', category: 'Records of Processing', title: 'Tamper-proof audit logging active', description: 'Audit logs of processing activities must be maintained with integrity protection (Article 30).', guidance: 'Enable CloudTrail with log file validation. Store logs in a dedicated S3 bucket with MFA delete enabled.', severity: 'high', automatable: true, checkFn: 'gdprChecks' },
  { controlId: 'GDPR-ART32-NETWORK', framework: 'gdpr', category: 'Security of Processing', title: 'Databases not exposed to internet', description: 'Database resources processing personal data must not be publicly accessible (Article 32).', guidance: 'Place all databases in private subnets. Remove security group rules allowing public internet access to database ports.', severity: 'critical', automatable: true, checkFn: 'gdprChecks' },
  { controlId: 'GDPR-ART13-PRIVACY-NOTICE', framework: 'gdpr', category: 'Transparency', title: 'Privacy notice published', description: 'A compliant privacy notice must be published explaining how personal data is collected and used (Article 13).', guidance: 'Publish a GDPR-compliant privacy notice on your website covering: data collected, legal basis, retention periods, data subject rights, and DPO contact.', severity: 'high', automatable: false, checkFn: null },
  { controlId: 'GDPR-ART17-DELETION', framework: 'gdpr', category: 'Data Subject Rights', title: 'Right to erasure process documented', description: 'A process must exist to handle data subject deletion requests within 30 days (Article 17).', guidance: 'Document and test your data deletion process. Ensure it covers all data stores (databases, S3, backups, third-party processors).', severity: 'high', automatable: false, checkFn: null },
  { controlId: 'GDPR-ART28-DPA', framework: 'gdpr', category: 'Data Processors', title: 'Data Processing Agreements with vendors', description: 'DPAs must be in place with all processors handling personal data on your behalf (Article 28).', guidance: 'Identify all third-party processors (AWS, Stripe, etc.). Ensure a signed DPA is in place with each. AWS BAA available via AWS Artifact.', severity: 'high', automatable: false, checkFn: null },
  { controlId: 'GDPR-ART33-BREACH', framework: 'gdpr', category: 'Breach Notification', title: 'Data breach response plan documented', description: 'A documented process must exist for detecting, reporting, and investigating data breaches (Article 33).', guidance: 'Document a breach response plan covering: detection, internal escalation, 72-hour supervisory authority notification, and data subject notification where required.', severity: 'high', automatable: false, checkFn: null },
]

async function seedIso27001() {
  console.log('🌱 Seeding ISO 27001 control definitions...')
  for (const control of ISO27001_CONTROLS) {
    await db.insert(controlDefinitions).values(control)
      .onConflictDoUpdate({
        target: controlDefinitions.controlId,
        set: { title: control.title, description: control.description, guidance: control.guidance, severity: control.severity, automatable: control.automatable }
      })
  }
  console.log(`✅ Seeded ${ISO27001_CONTROLS.length} ISO 27001 controls`)
}

async function seedGdpr() {
  console.log('🌱 Seeding GDPR control definitions...')
  for (const control of GDPR_CONTROLS) {
    await db.insert(controlDefinitions).values(control)
      .onConflictDoUpdate({
        target: controlDefinitions.controlId,
        set: { title: control.title, description: control.description, guidance: control.guidance, severity: control.severity, automatable: control.automatable }
      })
  }
  console.log(`✅ Seeded ${GDPR_CONTROLS.length} GDPR controls`)
}

// Run all seeds
async function seedAll() {
  await seed()
  await seedGithub()
  await seedIso27001()
  await seedGdpr()
  console.log('\n🎉 All controls seeded successfully')
  process.exit(0)
}

seedAll().catch(err => { console.error('Seed failed:', err); process.exit(1) })
