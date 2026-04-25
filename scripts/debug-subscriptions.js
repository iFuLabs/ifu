#!/usr/bin/env node
import { db } from '../src/db/client.js'
import { organizations, subscriptions } from '../src/db/schema.js'

async function debugSubscriptions() {
  console.log('=== Checking Organizations ===')
  const orgs = await db.select().from(organizations)
  console.log(`Found ${orgs.length} organizations`)
  
  for (const org of orgs) {
    console.log(`\nOrg: ${org.name} (${org.id})`)
    console.log(`  Plan: ${org.plan}`)
    console.log(`  Trial ends: ${org.trialEndsAt}`)
    console.log(`  Paystack sub code: ${org.paystackSubscriptionCode}`)
  }

  console.log('\n=== Checking Subscriptions Table ===')
  const subs = await db.select().from(subscriptions)
  console.log(`Found ${subs.length} subscriptions`)
  
  for (const sub of subs) {
    console.log(`\nSubscription: ${sub.id}`)
    console.log(`  Org ID: ${sub.orgId}`)
    console.log(`  Product: ${sub.product}`)
    console.log(`  Plan: ${sub.plan}`)
    console.log(`  Status: ${sub.status}`)
    console.log(`  Trial ends: ${sub.trialEndsAt}`)
  }

  process.exit(0)
}

debugSubscriptions().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
