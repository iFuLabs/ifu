import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'

const bedrock = new BedrockRuntimeClient({ region: process.env.BEDROCK_REGION || 'us-east-1' })

const MODEL_ID = 'anthropic.claude-3-5-sonnet-20241022-v2:0'

/**
 * Generates a plain-English explanation for a failing control,
 * including business impact and a concrete step-by-step fix.
 *
 * @param {object} control - Control definition + latest result
 * @param {object} org - Organization context
 * @returns {object} { summary, businessImpact, steps, priority, estimatedEffort }
 */
export async function explainControlGap(control, org) {
  const prompt = buildPrompt(control, org)

  const response = await bedrock.send(new InvokeModelCommand({
    modelId: MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
      system: SYSTEM_PROMPT
    })
  }))

  const raw = JSON.parse(Buffer.from(response.body).toString('utf-8'))
  const text = raw.content?.[0]?.text || ''

  return parseAiResponse(text, control)
}

/**
 * Generates a high-level compliance summary for the whole org.
 * Used on the dashboard for the AI insight card.
 */
export async function generateComplianceSummary({ controls, score, org, framework }) {
  const failing = controls.filter(c => c.status === 'fail')
  const critical = failing.filter(c => c.severity === 'critical')
  const passing = controls.filter(c => c.status === 'pass').length

  const prompt = `
You are reviewing the compliance posture of ${org.name}, a ${org.plan}-tier SaaS company.

Framework: ${framework.toUpperCase()}
Overall score: ${score}%
Passing controls: ${passing}/${controls.length}
Failing controls: ${failing.length} (${critical.length} critical)

Failing controls:
${failing.slice(0, 10).map(c => `- ${c.controlId}: ${c.title} [${c.severity}]${c.evidence?.detail ? ` — ${c.evidence.detail}` : ''}`).join('\n')}

Respond in JSON with exactly this shape:
{
  "headline": "one sentence (max 15 words) describing the overall posture",
  "riskLevel": "low|medium|high|critical",
  "topPriority": "the single most important thing to fix right now (1-2 sentences)",
  "insight": "a practical observation about their compliance posture (2-3 sentences, non-obvious)",
  "quickWins": ["array of 2-3 short strings — specific easy fixes under 30 mins each"]
}

Return only valid JSON. No markdown, no preamble.`

  const response = await bedrock.send(new InvokeModelCommand({
    modelId: MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
      system: 'You are a senior cloud security and compliance engineer. Be direct, specific, and practical. Never give generic advice.'
    })
  }))

  const raw = JSON.parse(Buffer.from(response.body).toString('utf-8'))
  const text = raw.content?.[0]?.text || '{}'

  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim())
  } catch {
    return { headline: 'Unable to generate summary', riskLevel: 'medium', topPriority: '', insight: '', quickWins: [] }
  }
}

/**
 * Stream version of explainControlGap — for real-time UI streaming.
 * Yields text chunks as they arrive from Bedrock.
 */
export async function* explainControlGapStream(control, org) {
  const { BedrockRuntimeClient, InvokeModelWithResponseStreamCommand } = await import('@aws-sdk/client-bedrock-runtime')
  const client = new BedrockRuntimeClient({ region: process.env.BEDROCK_REGION || 'us-east-1' })

  const response = await client.send(new InvokeModelWithResponseStreamCommand({
    modelId: MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 1024,
      messages: [{ role: 'user', content: buildPrompt(control, org) }],
      system: SYSTEM_PROMPT
    })
  }))

  for await (const chunk of response.body) {
    if (chunk.chunk?.bytes) {
      const parsed = JSON.parse(Buffer.from(chunk.chunk.bytes).toString('utf-8'))
      if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
        yield parsed.delta.text
      }
    }
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a senior cloud security and compliance engineer with deep expertise in SOC 2, ISO 27001, GDPR, HIPAA, and AWS infrastructure. 

Your job is to explain compliance control failures in plain English — no jargon — and give engineers actionable steps to fix them. You are direct and specific. You never give generic advice like "consult a professional" or "review your policies". You always give concrete steps.

Always respond in valid JSON only. No markdown, no preamble.`

function buildPrompt(control, org) {
  const evidenceDetail = control.evidence?.detail || 'No specific detail available'
  const failingResources = control.evidence?.resources?.filter(r => !r.compliant) || []

  return `A compliance control is FAILING for ${org.name}.

Control ID: ${control.controlId}
Framework: ${control.framework?.toUpperCase() || 'SOC 2'}
Category: ${control.category}
Title: ${control.title}
Description: ${control.description}
Severity: ${control.severity}

Evidence collected: ${evidenceDetail}
${failingResources.length > 0 ? `Affected resources: ${failingResources.slice(0, 5).map(r => `${r.type}:${r.id}${r.metadata ? ` (${JSON.stringify(r.metadata)})` : ''}`).join(', ')}` : ''}
${control.notes ? `Engineer notes: ${control.notes}` : ''}

Respond in JSON with exactly this shape:
{
  "summary": "1-2 sentence plain English explanation of what is wrong and why it matters",
  "businessImpact": "1-2 sentences on the real-world risk if this stays unfixed (data breach, audit failure, etc.)",
  "steps": [
    {
      "order": 1,
      "title": "short step title",
      "detail": "exact command or action, including AWS console path or CLI command where relevant",
      "effort": "5 mins|15 mins|30 mins|1 hour|half day"
    }
  ],
  "priority": "immediate|this week|this month",
  "estimatedEffort": "total time to fix",
  "automationTip": "optional: a Terraform/CDK snippet or AWS Config rule that prevents this from regressing"
}

Be specific about affected resources. Give real CLI commands. Return only valid JSON.`
}

function parseAiResponse(text, control) {
  try {
    const cleaned = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)
    return {
      summary:         parsed.summary || '',
      businessImpact:  parsed.businessImpact || '',
      steps:           parsed.steps || [],
      priority:        parsed.priority || 'this week',
      estimatedEffort: parsed.estimatedEffort || 'Unknown',
      automationTip:   parsed.automationTip || null,
      controlId:       control.controlId,
      generatedAt:     new Date().toISOString()
    }
  } catch {
    // Fallback if JSON parse fails — return the guidance from the DB
    return {
      summary:        control.description || '',
      businessImpact: 'This control failure may impact your audit readiness.',
      steps:          control.guidance
        ? [{ order: 1, title: 'Remediation', detail: control.guidance, effort: '30 mins' }]
        : [],
      priority:        control.severity === 'critical' ? 'immediate' : 'this week',
      estimatedEffort: '30 mins',
      automationTip:   null,
      controlId:       control.controlId,
      generatedAt:     new Date().toISOString()
    }
  }
}
