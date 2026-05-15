/**
 * AI Remediation Service — generates actionable IaC fixes for failing controls.
 *
 * Given a failing control + evidence (which resources are non-compliant),
 * generates Terraform, AWS CLI, or CloudFormation code to fix the issue.
 *
 * Uses Amazon Bedrock (Claude) with a specialized prompt that produces
 * copy-paste-ready infrastructure code.
 */
import { BedrockRuntimeClient, InvokeModelCommand, InvokeModelWithResponseStreamCommand } from '@aws-sdk/client-bedrock-runtime'
import { recordUsage } from './ai-usage.js'

const bedrock = new BedrockRuntimeClient({ region: process.env.BEDROCK_REGION || 'us-east-1' })
const MODEL_ID = 'us.anthropic.claude-sonnet-4-5-20250929-v1:0'

const REMEDIATION_SYSTEM_PROMPT = `You are a senior DevOps/SRE engineer specializing in AWS infrastructure security and compliance automation.

Your job is to generate READY-TO-USE infrastructure code that fixes compliance control failures. You produce code that engineers can copy-paste and apply with minimal modification.

Rules:
- Always generate working code, not pseudocode
- Include comments explaining what each section does
- Use secure defaults (encryption enabled, public access blocked, etc.)
- If the fix requires multiple steps, generate all of them
- Prefer Terraform when the user hasn't specified a format
- For AWS CLI commands, use the modern v2 syntax
- Never generate code that would cause data loss without explicit warnings
- Include a "verify" command at the end to confirm the fix worked
- If you reference specific resource IDs from the evidence, use them exactly`

/**
 * Generate remediation code for a failing control.
 *
 * @param {object} params
 * @param {object} params.control - Control definition + result + evidence
 * @param {string} params.format - 'terraform' | 'cli' | 'cloudformation'
 * @param {object} params.org - Organization context
 * @param {object} params.ctx - { orgId, userId } for usage tracking
 * @returns {object} { code, language, explanation, verifyCommand, warnings }
 */
export async function generateRemediation({ control, format = 'terraform', org, ctx = {} }) {
  const prompt = buildRemediationPrompt(control, format, org)

  const response = await bedrock.send(new InvokeModelCommand({
    modelId: MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
      system: REMEDIATION_SYSTEM_PROMPT,
    })
  }))

  const raw = JSON.parse(Buffer.from(response.body).toString('utf-8'))
  const text = raw.content?.[0]?.text || ''

  recordUsage({
    orgId: ctx.orgId,
    userId: ctx.userId,
    service: 'comply',
    operation: 'control.remediation',
    model: MODEL_ID,
    inputTokens: raw.usage?.input_tokens || 0,
    outputTokens: raw.usage?.output_tokens || 0,
  }).catch(() => {})

  return parseRemediationResponse(text, control, format)
}

/**
 * Stream version — yields chunks for real-time UI rendering.
 */
export async function* generateRemediationStream({ control, format = 'terraform', org }) {
  const prompt = buildRemediationPrompt(control, format, org)

  const response = await bedrock.send(new InvokeModelWithResponseStreamCommand({
    modelId: MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
      system: REMEDIATION_SYSTEM_PROMPT,
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

/**
 * Generate remediation for a FinOps waste finding.
 */
export async function generateFinOpsRemediation({ finding, format = 'cli', org, ctx = {} }) {
  const prompt = buildFinOpsRemediationPrompt(finding, format)

  const response = await bedrock.send(new InvokeModelCommand({
    modelId: MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
      system: 'You are a FinOps engineer. Generate precise AWS CLI commands or Terraform to fix cost waste. Be direct. Return only valid JSON.',
    })
  }))

  const raw = JSON.parse(Buffer.from(response.body).toString('utf-8'))
  const text = raw.content?.[0]?.text || ''

  recordUsage({
    orgId: ctx.orgId,
    userId: ctx.userId,
    service: 'finops',
    operation: 'waste.remediation',
    model: MODEL_ID,
    inputTokens: raw.usage?.input_tokens || 0,
    outputTokens: raw.usage?.output_tokens || 0,
  }).catch(() => {})

  try {
    const cleaned = text.replace(/```json|```/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return { code: text, language: 'bash', explanation: 'Generated remediation', warnings: [] }
  }
}

// ── Prompt Builders ────────────────────────────────────────────────────────

function buildRemediationPrompt(control, format, org) {
  const evidenceDetail = control.evidence?.detail || 'No specific detail'
  const failingResources = control.evidence?.resources?.filter(r => !r.compliant) || []

  const formatInstructions = {
    terraform: 'Generate Terraform (HCL) code. Use the AWS provider. Include resource blocks and any required data sources.',
    cli: 'Generate AWS CLI v2 commands. Use `aws` command syntax. Chain commands with comments between them.',
    cloudformation: 'Generate AWS CloudFormation YAML. Include the full template with Parameters, Resources, and Outputs.',
  }

  return `Generate a REMEDIATION FIX for this failing compliance control.

Organization: ${org?.name || 'Customer'}
Control ID: ${control.controlId}
Framework: ${control.framework?.toUpperCase() || 'SOC 2'}
Title: ${control.title}
Description: ${control.description}
Severity: ${control.severity}

Evidence: ${evidenceDetail}
${failingResources.length > 0 ? `
Affected resources:
${failingResources.slice(0, 10).map(r => `- ${r.type}: ${r.id}${r.region ? ` (${r.region})` : ''}${r.metadata ? ` — ${JSON.stringify(r.metadata)}` : ''}`).join('\n')}` : ''}

Format: ${format.toUpperCase()}
${formatInstructions[format] || formatInstructions.terraform}

Respond in JSON with exactly this shape:
{
  "code": "the complete infrastructure code as a string (use \\n for newlines)",
  "language": "${format === 'cli' ? 'bash' : format === 'cloudformation' ? 'yaml' : 'hcl'}",
  "explanation": "2-3 sentences explaining what this code does and any prerequisites",
  "verifyCommand": "a single command to verify the fix was applied (e.g. aws cli describe command)",
  "warnings": ["array of strings — any risks or things to check before applying (e.g. 'This will restart the instance')"],
  "affectedResources": ["list of resource IDs this fix targets"]
}

Return only valid JSON. No markdown wrapping.`
}

function buildFinOpsRemediationPrompt(finding, format) {
  return `Generate a fix for this AWS cost waste finding.

Type: ${finding.type}
Resource: ${finding.resourceId}
Resource Type: ${finding.resourceType || finding.currentType || 'Unknown'}
Region: ${finding.metadata?.region || finding.region || 'us-east-1'}
Estimated Monthly Savings: $${finding.estimatedMonthlySavings?.toFixed(2) || '0'}
${finding.recommendedType ? `Recommended: ${finding.recommendedType}` : ''}
${finding.metadata ? `Details: ${JSON.stringify(finding.metadata)}` : ''}

Format: ${format === 'cli' ? 'AWS CLI commands' : 'Terraform'}

Respond in JSON:
{
  "code": "the commands or code to fix this (use \\n for newlines)",
  "language": "${format === 'cli' ? 'bash' : 'hcl'}",
  "explanation": "what this does in 1-2 sentences",
  "verifyCommand": "command to verify the fix",
  "warnings": ["any risks"],
  "estimatedSavings": "${finding.estimatedMonthlySavings?.toFixed(2) || '0'}/month"
}

Return only valid JSON.`
}

// ── Response Parser ────────────────────────────────────────────────────────

function parseRemediationResponse(text, control, format) {
  try {
    const cleaned = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)
    return {
      code: parsed.code || '',
      language: parsed.language || (format === 'cli' ? 'bash' : format === 'cloudformation' ? 'yaml' : 'hcl'),
      explanation: parsed.explanation || '',
      verifyCommand: parsed.verifyCommand || null,
      warnings: parsed.warnings || [],
      affectedResources: parsed.affectedResources || [],
      controlId: control.controlId,
      format,
      generatedAt: new Date().toISOString(),
    }
  } catch {
    // If JSON parse fails, return the raw text as code
    return {
      code: text,
      language: format === 'cli' ? 'bash' : format === 'cloudformation' ? 'yaml' : 'hcl',
      explanation: 'AI-generated remediation code',
      verifyCommand: null,
      warnings: ['Could not parse structured response — review code carefully before applying'],
      affectedResources: [],
      controlId: control.controlId,
      format,
      generatedAt: new Date().toISOString(),
    }
  }
}
