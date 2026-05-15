/**
 * SAML Service — handles SAML 2.0 SP-initiated SSO flow.
 *
 * Uses @node-saml/node-saml for XML parsing, signature validation,
 * and assertion extraction. We store per-org IdP config in the
 * sso_connections table and build a SAML instance per request.
 */
import { SAML } from '@node-saml/node-saml'
import crypto from 'crypto'

const API_URL = process.env.API_URL || 'http://localhost:3000'

/**
 * Build a SAML instance for a given SSO connection record.
 */
export function buildSamlInstance(connection) {
  const options = {
    callbackUrl: connection.sp_acs_url || connection.spAcsUrl,
    entryPoint: connection.idp_sso_url || connection.idpSsoUrl,
    issuer: connection.sp_entity_id || connection.spEntityId,
    cert: cleanCertificate(connection.idp_certificate || connection.idpCertificate),
    wantAssertionsSigned: true,
    wantAuthnResponseSigned: false,
    signatureAlgorithm: 'sha256',
    digestAlgorithm: 'sha256',
    // Allow 5 minutes of clock skew
    acceptedClockSkewMs: 5 * 60 * 1000,
    // Disable InResponseTo validation for IdP-initiated flows
    validateInResponseTo: 'never',
  }

  return new SAML(options)
}

/**
 * Generate the SP metadata XML for a connection.
 * Customers paste this into their IdP configuration.
 */
export function generateSpMetadata(connection) {
  const entityId = connection.sp_entity_id || connection.spEntityId
  const acsUrl = connection.sp_acs_url || connection.spAcsUrl

  return `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
  entityID="${entityId}">
  <md:SPSSODescriptor
    AuthnRequestsSigned="false"
    WantAssertionsSigned="true"
    protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
    <md:AssertionConsumerService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="${acsUrl}"
      index="1"
      isDefault="true" />
  </md:SPSSODescriptor>
</md:EntityDescriptor>`
}

/**
 * Generate a domain verification token.
 * Customer adds a DNS TXT record: _ghara-verification.domain.com = token
 */
export function generateVerificationToken() {
  return `ghara-verify-${crypto.randomBytes(16).toString('hex')}`
}

/**
 * Build the default SP Entity ID and ACS URL for an org.
 */
export function buildSpConfig(orgId) {
  const baseUrl = API_URL.replace(/\/$/, '')
  return {
    spEntityId: `${baseUrl}/saml/metadata/${orgId}`,
    spAcsUrl: `${baseUrl}/api/v1/auth/sso/callback`,
  }
}

/**
 * Clean a PEM certificate — strip headers/footers and whitespace
 * so node-saml can use it.
 */
function cleanCertificate(cert) {
  if (!cert) return ''
  return cert
    .replace(/-----BEGIN CERTIFICATE-----/g, '')
    .replace(/-----END CERTIFICATE-----/g, '')
    .replace(/\r?\n/g, '')
    .trim()
}

/**
 * Validate a SAML response and extract the user profile.
 * Returns { email, firstName, lastName, nameId, sessionIndex }
 */
export async function validateSamlResponse(connection, samlResponse) {
  const saml = buildSamlInstance(connection)

  const { profile } = await saml.validatePostResponseAsync({
    SAMLResponse: samlResponse,
  })

  if (!profile) {
    throw new Error('SAML response did not contain a valid profile')
  }

  // Extract user attributes — IdPs use different attribute names
  const email = (
    profile.email ||
    profile.nameID ||
    profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ||
    profile['urn:oid:0.9.2342.19200300.100.1.3'] ||
    ''
  ).toLowerCase().trim()

  const firstName = (
    profile.firstName ||
    profile.givenName ||
    profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname'] ||
    profile['urn:oid:2.5.4.42'] ||
    ''
  )

  const lastName = (
    profile.lastName ||
    profile.surname ||
    profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname'] ||
    profile['urn:oid:2.5.4.4'] ||
    ''
  )

  if (!email || !email.includes('@')) {
    throw new Error('SAML assertion did not contain a valid email address')
  }

  return {
    email,
    firstName,
    lastName,
    name: [firstName, lastName].filter(Boolean).join(' ') || email.split('@')[0],
    nameId: profile.nameID,
    sessionIndex: profile.sessionIndex,
  }
}

/**
 * Generate a SAML AuthnRequest redirect URL.
 */
export async function getLoginUrl(connection, relayState) {
  const saml = buildSamlInstance(connection)
  const url = await saml.getAuthorizeUrlAsync(relayState || '', {}, {})
  return url
}
