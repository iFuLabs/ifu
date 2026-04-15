import 'dotenv/config'
import { sendWelcomeEmail, sendTeamInvitationEmail } from './src/services/email.js'

async function testEmails() {
  console.log('🧪 Testing Email System...\n')
  console.log('Using Resend API Key:', process.env.RESEND_API_KEY ? '✅ Found' : '❌ Missing')
  console.log('Email Domain:', process.env.EMAIL_DOMAIN || 'resend.dev')
  console.log('Reply-To Email:', process.env.REPLY_TO_EMAIL || 'info@ifulabs.com')
  console.log('\n---\n')

  // Use a test email - you can change this to your actual email
  const testEmail = 'delivered@resend.dev' // Resend's test email that always works
  // Or use your own email:
  // const testEmail = 'your-email@example.com'

  // Test 1: Welcome Email
  console.log('📧 Test 1: Sending Welcome Email...')
  console.log('   To:', testEmail)
  const welcomeResult = await sendWelcomeEmail({
    to: testEmail,
    name: 'Test User',
    orgName: 'Test Organization'
  })
  
  if (welcomeResult.success) {
    console.log('✅ Welcome email sent successfully!')
    console.log('   Email ID:', welcomeResult.data.id)
  } else {
    console.log('❌ Welcome email failed:', welcomeResult.error)
  }

  console.log('\n---\n')

  // Test 2: Team Invitation Email
  console.log('📧 Test 2: Sending Team Invitation Email...')
  console.log('   To:', testEmail)
  const inviteResult = await sendTeamInvitationEmail({
    to: testEmail,
    inviterName: 'John Doe',
    orgName: 'Test Organization',
    role: 'admin',
    inviteUrl: 'http://localhost:3003/invite/test-token-123',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  })

  if (inviteResult.success) {
    console.log('✅ Invitation email sent successfully!')
    console.log('   Email ID:', inviteResult.data.id)
  } else {
    console.log('❌ Invitation email failed:', inviteResult.error)
  }

  console.log('\n✨ Email test complete!')
  console.log('📊 View sent emails: https://resend.com/emails')
  console.log('\n💡 To send to your own email, edit test-email.js and change testEmail variable')
}

testEmails().catch(err => {
  console.error('Test failed:', err)
  process.exit(1)
})
