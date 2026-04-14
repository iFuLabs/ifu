import { PricingClient, GetProductsCommand } from '@aws-sdk/client-pricing'
import { redis } from './redis.js'

const PRICING_CACHE_TTL = 60 * 60 * 24 * 7 // 7 days

/**
 * Get accurate AWS pricing for resources.
 * Prices are cached in Redis for 7 days since they rarely change.
 */

export async function getEBSPricing(region, volumeType = 'gp2') {
  const cacheKey = `aws:pricing:ebs:${region}:${volumeType}`
  
  try {
    const cached = await redis.get(cacheKey)
    if (cached) return parseFloat(cached)
  } catch { /* ignore cache errors */ }

  try {
    const pricing = new PricingClient({ region: 'us-east-1' }) // Pricing API only in us-east-1
    
    const { PriceList } = await pricing.send(new GetProductsCommand({
      ServiceCode: 'AmazonEC2',
      Filters: [
        { Type: 'TERM_MATCH', Field: 'productFamily', Value: 'Storage' },
        { Type: 'TERM_MATCH', Field: 'volumeApiName', Value: volumeType },
        { Type: 'TERM_MATCH', Field: 'location', Value: getLocationName(region) }
      ],
      MaxResults: 1
    }))

    if (PriceList && PriceList.length > 0) {
      const product = JSON.parse(PriceList[0])
      const terms = Object.values(product.terms?.OnDemand || {})[0]
      const priceDimension = Object.values(terms?.priceDimensions || {})[0]
      const pricePerGb = parseFloat(priceDimension?.pricePerUnit?.USD || '0.10')
      
      await redis.setEx(cacheKey, PRICING_CACHE_TTL, pricePerGb.toString()).catch(() => {})
      return pricePerGb
    }
  } catch (err) {
    console.warn('AWS Pricing API failed for EBS:', err.message)
  }

  // Fallback to rough estimates
  const fallbackPrices = { gp2: 0.10, gp3: 0.08, io1: 0.125, io2: 0.125, st1: 0.045, sc1: 0.015 }
  return fallbackPrices[volumeType] || 0.10
}

export async function getSnapshotPricing(region) {
  const cacheKey = `aws:pricing:snapshot:${region}`
  
  try {
    const cached = await redis.get(cacheKey)
    if (cached) return parseFloat(cached)
  } catch { /* ignore */ }

  try {
    const pricing = new PricingClient({ region: 'us-east-1' })
    
    const { PriceList } = await pricing.send(new GetProductsCommand({
      ServiceCode: 'AmazonEC2',
      Filters: [
        { Type: 'TERM_MATCH', Field: 'productFamily', Value: 'Storage Snapshot' },
        { Type: 'TERM_MATCH', Field: 'location', Value: getLocationName(region) }
      ],
      MaxResults: 1
    }))

    if (PriceList && PriceList.length > 0) {
      const product = JSON.parse(PriceList[0])
      const terms = Object.values(product.terms?.OnDemand || {})[0]
      const priceDimension = Object.values(terms?.priceDimensions || {})[0]
      const pricePerGb = parseFloat(priceDimension?.pricePerUnit?.USD || '0.05')
      
      await redis.setEx(cacheKey, PRICING_CACHE_TTL, pricePerGb.toString()).catch(() => {})
      return pricePerGb
    }
  } catch (err) {
    console.warn('AWS Pricing API failed for snapshots:', err.message)
  }

  return 0.05 // Fallback
}

export async function getNATGatewayPricing(region) {
  const cacheKey = `aws:pricing:natgateway:${region}`
  
  try {
    const cached = await redis.get(cacheKey)
    if (cached) return parseFloat(cached)
  } catch { /* ignore */ }

  try {
    const pricing = new PricingClient({ region: 'us-east-1' })
    
    const { PriceList } = await pricing.send(new GetProductsCommand({
      ServiceCode: 'AmazonEC2',
      Filters: [
        { Type: 'TERM_MATCH', Field: 'productFamily', Value: 'NAT Gateway' },
        { Type: 'TERM_MATCH', Field: 'location', Value: getLocationName(region) }
      ],
      MaxResults: 1
    }))

    if (PriceList && PriceList.length > 0) {
      const product = JSON.parse(PriceList[0])
      const terms = Object.values(product.terms?.OnDemand || {})[0]
      
      // NAT Gateway has multiple price dimensions (hourly + per-GB data processing)
      // We need the hourly charge, not the data processing charge
      const hourlyDimension = Object.values(terms?.priceDimensions || {})
        .find(d => d.description?.toLowerCase().includes('hour') || d.unit === 'Hrs')
      
      const pricePerHour = parseFloat(hourlyDimension?.pricePerUnit?.USD || '0.045')
      const pricePerMonth = pricePerHour * 730 // ~730 hours/month
      
      await redis.setEx(cacheKey, PRICING_CACHE_TTL, pricePerMonth.toString()).catch(() => {})
      return pricePerMonth
    }
  } catch (err) {
    console.warn('AWS Pricing API failed for NAT Gateway:', err.message)
  }

  return 32 // Fallback ~$0.045/hour * 730 hours
}

export async function getLoadBalancerPricing(region, type = 'application') {
  const cacheKey = `aws:pricing:lb:${region}:${type}`
  
  try {
    const cached = await redis.get(cacheKey)
    if (cached) return parseFloat(cached)
  } catch { /* ignore */ }

  try {
    const pricing = new PricingClient({ region: 'us-east-1' })
    
    // Map load balancer types to Pricing API product families
    const productFamily = 
      type === 'network'  ? 'Load Balancer-Network' :
      type === 'classic'  ? 'Load Balancer' :
                            'Load Balancer-Application'
    
    const { PriceList } = await pricing.send(new GetProductsCommand({
      ServiceCode: 'AWSELB',
      Filters: [
        { Type: 'TERM_MATCH', Field: 'productFamily', Value: productFamily },
        { Type: 'TERM_MATCH', Field: 'location', Value: getLocationName(region) }
      ],
      MaxResults: 1
    }))

    if (PriceList && PriceList.length > 0) {
      const product = JSON.parse(PriceList[0])
      const terms = Object.values(product.terms?.OnDemand || {})[0]
      const priceDimension = Object.values(terms?.priceDimensions || {})[0]
      const pricePerHour = parseFloat(priceDimension?.pricePerUnit?.USD || '0.025')
      const pricePerMonth = pricePerHour * 730
      
      await redis.setEx(cacheKey, PRICING_CACHE_TTL, pricePerMonth.toString()).catch(() => {})
      return pricePerMonth
    }
  } catch (err) {
    console.warn('AWS Pricing API failed for Load Balancer:', err.message)
  }

  // Fallback estimates
  return type === 'network' ? 22 : type === 'classic' ? 18 : 16
}

export async function getRDSPricing(region, instanceClass, engine = 'postgres') {
  const cacheKey = `aws:pricing:rds:${region}:${instanceClass}:${engine}`
  
  try {
    const cached = await redis.get(cacheKey)
    if (cached) return parseFloat(cached)
  } catch { /* ignore */ }

  try {
    const pricing = new PricingClient({ region: 'us-east-1' })
    
    // Normalize engine name for pricing API
    const engineMap = {
      'postgres': 'PostgreSQL',
      'mysql': 'MySQL',
      'mariadb': 'MariaDB',
      'oracle': 'Oracle',
      'sqlserver': 'SQL Server',
      'aurora-mysql': 'Aurora MySQL',
      'aurora-postgresql': 'Aurora PostgreSQL'
    }
    const engineName = engineMap[engine.toLowerCase()] || 'PostgreSQL'
    
    const { PriceList } = await pricing.send(new GetProductsCommand({
      ServiceCode: 'AmazonRDS',
      Filters: [
        { Type: 'TERM_MATCH', Field: 'instanceType', Value: instanceClass },
        { Type: 'TERM_MATCH', Field: 'databaseEngine', Value: engineName },
        { Type: 'TERM_MATCH', Field: 'location', Value: getLocationName(region) },
        { Type: 'TERM_MATCH', Field: 'deploymentOption', Value: 'Single-AZ' }
      ],
      MaxResults: 1
    }))

    if (PriceList && PriceList.length > 0) {
      const product = JSON.parse(PriceList[0])
      const terms = Object.values(product.terms?.OnDemand || {})[0]
      const priceDimension = Object.values(terms?.priceDimensions || {})[0]
      const pricePerHour = parseFloat(priceDimension?.pricePerUnit?.USD || '0')
      const pricePerMonth = pricePerHour * 730
      
      await redis.setEx(cacheKey, PRICING_CACHE_TTL, pricePerMonth.toString()).catch(() => {})
      return pricePerMonth
    }
  } catch (err) {
    console.warn('AWS Pricing API failed for RDS:', err.message)
  }

  // Fallback estimates based on instance class
  if (instanceClass?.includes('xlarge')) return 200
  if (instanceClass?.includes('large')) return 80
  if (instanceClass?.includes('medium')) return 40
  return 20
}

// Map AWS region codes to Pricing API location names
function getLocationName(region) {
  const locationMap = {
    // US Regions
    'us-east-1': 'US East (N. Virginia)',
    'us-east-2': 'US East (Ohio)',
    'us-west-1': 'US West (N. California)',
    'us-west-2': 'US West (Oregon)',
    
    // Europe Regions
    'eu-west-1': 'EU (Ireland)',
    'eu-west-2': 'EU (London)',
    'eu-west-3': 'EU (Paris)',
    'eu-central-1': 'EU (Frankfurt)',
    'eu-north-1': 'EU (Stockholm)',
    'eu-south-1': 'EU (Milan)',
    
    // Asia Pacific Regions
    'ap-south-1': 'Asia Pacific (Mumbai)',
    'ap-southeast-1': 'Asia Pacific (Singapore)',
    'ap-southeast-2': 'Asia Pacific (Sydney)',
    'ap-southeast-3': 'Asia Pacific (Jakarta)',
    'ap-northeast-1': 'Asia Pacific (Tokyo)',
    'ap-northeast-2': 'Asia Pacific (Seoul)',
    'ap-northeast-3': 'Asia Pacific (Osaka)',
    'ap-east-1': 'Asia Pacific (Hong Kong)',
    
    // Other Regions
    'sa-east-1': 'South America (Sao Paulo)',
    'ca-central-1': 'Canada (Central)',
    'ca-west-1': 'Canada West (Calgary)',
    'af-south-1': 'Africa (Cape Town)',
    'me-south-1': 'Middle East (Bahrain)',
    'me-central-1': 'Middle East (UAE)',
  }
  
  const location = locationMap[region]
  
  if (!location) {
    console.warn(`aws-pricing: unknown region ${region}, falling back to us-east-1 pricing`)
    return 'US East (N. Virginia)'
  }
  
  return location
}
