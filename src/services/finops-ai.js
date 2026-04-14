import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'

/**
 * Generate AI-powered natural language summaries for FinOps findings.
 * Uses AWS Bedrock with Claude to create actionable insights.
 */

export async function generateFinOpsSummary(findings) {
  if (!findings || findings.summary.totalMonthlySavings === 0) {
    return null
  }

  try {
    const bedrock = new BedrockRuntimeClient({ 
      region: process.env.AWS_REGION || 'us-east-1' 
    })

    // Build context for AI
    const context = buildFinOpsContext(findings)

    const prompt = `You are a FinOps expert analyzing AWS cost optimization opportunities. Based on the following findings, provide a concise 2-3 sentence executive summary that highlights the most impactful savings opportunities and actionable next steps.

Findings:
${context}

Provide a clear, actionable summary that prioritizes high-value, low-risk opportunities. Focus on the business impact, not technical details.`

    const response = await bedrock.send(new InvokeModelCommand({
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    }))

    const result = JSON.parse(new TextDecoder().decode(response.body))
    return result.content[0].text

  } catch (err) {
    console.warn('Bedrock AI summary generation failed:', err.message)
    return generateFallbackSummary(findings)
  }
}

function buildFinOpsContext(findings) {
  const lines = []

  lines.push(`Total Monthly Savings: $${findings.summary.totalMonthlySavings.toLocaleString()}`)
  lines.push(`Total Annual Savings: $${findings.summary.totalAnnualSavings.toLocaleString()}`)
  lines.push(`Current Monthly Spend: $${findings.monthlyCost?.toLocaleString() || 'N/A'}`)
  lines.push('')

  // Top 5 waste items
  if (findings.waste.length > 0) {
    lines.push('Top Waste Opportunities:')
    findings.waste.slice(0, 5).forEach((w, i) => {
      lines.push(`${i + 1}. ${w.resourceType}: ${w.description} ($${w.estimatedMonthlySavings.toFixed(0)}/mo)`)
    })
    lines.push('')
  }

  // Top 3 rightsizing opportunities
  if (findings.rightsizing.length > 0) {
    lines.push('Top Rightsizing Opportunities:')
    findings.rightsizing.slice(0, 3).forEach((r, i) => {
      lines.push(`${i + 1}. ${r.currentType} → ${r.targetType || 'terminate'} ($${r.estimatedMonthlySavings.toFixed(0)}/mo)`)
    })
    lines.push('')
  }

  // Coverage gaps
  if (findings.summary.coverageGaps > 0) {
    lines.push(`Coverage Gaps: ${findings.summary.coverageGaps} services with <70% RI/Savings Plan coverage`)
  }

  return lines.join('\n')
}

function generateFallbackSummary(findings) {
  const { waste, rightsizing, summary } = findings

  if (summary.totalMonthlySavings === 0) {
    return 'Your AWS account is well-optimized. No significant cost savings opportunities detected at this time.'
  }

  const parts = []

  // Waste summary
  if (waste.length > 0) {
    const topWaste = waste[0]
    const wasteTypes = [...new Set(waste.map(w => w.resourceType))].slice(0, 2).join(' and ')
    parts.push(`Found ${waste.length} idle or unused resources (${wasteTypes}) totaling $${Math.round(waste.reduce((sum, w) => sum + w.estimatedMonthlySavings, 0))}/month`)
  }

  // Rightsizing summary
  if (rightsizing.length > 0) {
    const rightsizingSavings = Math.round(rightsizing.reduce((sum, r) => sum + r.estimatedMonthlySavings, 0))
    parts.push(`${rightsizing.length} EC2 instances can be downsized or terminated for $${rightsizingSavings}/month in savings`)
  }

  // Coverage summary
  if (summary.coverageGaps > 0) {
    parts.push(`${summary.coverageGaps} services have low Reserved Instance or Savings Plan coverage`)
  }

  const summary_text = parts.join('. ') + '.'
  const action = waste.length > 0 
    ? ` Start by addressing the ${waste[0].resourceType.toLowerCase()} to capture quick wins.`
    : ' Review rightsizing recommendations for the highest-impact changes.'

  return summary_text + action
}
