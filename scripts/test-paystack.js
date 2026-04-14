/**
 * Test Paystack Integration
 * 
 * This script tests the Paystack API connection and verifies plan setup
 */

import 'dotenv/config'
import { listPlans } from './src/services/paystack.js'

async function testPaystack() {
  console.log('🧪 Testing Paystack Integration...\n')

  // Check environment variables
  console.log('📋 Environment Variables:')
  console.log('  PAYSTACK_SECRET_KEY:', process.env.PAYSTACK_SECRET_KEY ? '✅ Set' : '❌ Missing')
  console.log('  PAYSTACK_PUBLIC_KEY:', process.env.PAYSTACK_PUBLIC_KEY ? '✅ Set' : '❌ Missing')
  console.log('  PAYSTACK_COMPLY_STARTER_PLAN:', process.env.PAYSTACK_COMPLY_STARTER_PLAN || '❌ Missing')
  console.log('  PAYSTACK_COMPLY_GROWTH_PLAN:', process.env.PAYSTACK_COMPLY_GROWTH_PLAN || '❌ Missing')
  console.log('  PAYSTACK_FINOPS_PLAN:', process.env.PAYSTACK_FINOPS_PLAN || '❌ Missing')
  console.log()

  if (!process.env.PAYSTACK_SECRET_KEY) {
    console.error('❌ PAYSTACK_SECRET_KEY is not set in .env')
    process.exit(1)
  }

  try {
    // Test API connection by listing plans
    console.log('🔌 Testing Paystack API connection...')
    const plans = await listPlans()
    
    console.log(`✅ Connected! Found ${plans.length} plan(s)\n`)

    // Display plans
    console.log('📊 Your Paystack Plans:')
    console.log('─'.repeat(80))
    
    plans.forEach(plan => {
      const amount = (plan.amount / 100).toFixed(2)
      console.log(`
  Name: ${plan.name}
  Code: ${plan.plan_code}
  Amount: ${plan.currency} ${amount}
  Interval: ${plan.interval}
  Status: ${plan.is_archived ? '❌ Archived' : '✅ Active'}
      `)
    })
    
    console.log('─'.repeat(80))

    // Verify configured plans exist
    console.log('\n🔍 Verifying Configured Plans:')
    
    const configuredPlans = {
      'Comply Starter': process.env.PAYSTACK_COMPLY_STARTER_PLAN,
      'Comply Growth': process.env.PAYSTACK_COMPLY_GROWTH_PLAN,
      'FinOps': process.env.PAYSTACK_FINOPS_PLAN
    }

    for (const [name, code] of Object.entries(configuredPlans)) {
      const found = plans.find(p => p.plan_code === code)
      if (found) {
        console.log(`  ✅ ${name}: ${found.name} (${found.currency} ${(found.amount / 100).toFixed(2)}/${found.interval})`)
      } else {
        console.log(`  ❌ ${name}: Plan code ${code} not found in Paystack`)
      }
    }

    console.log('\n✅ Paystack integration test complete!')
    
  } catch (error) {
    console.error('\n❌ Paystack API Error:', error.message)
    process.exit(1)
  }
}

testPaystack()
