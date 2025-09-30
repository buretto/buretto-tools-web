// Test to verify DDragon resolution works in integrated flow
import { generateDirectImageUrl, preFetchDDragonFileListing } from './src/components/rolldown/utils/imageLoader.js'

// Mock localStorage for Node.js environment
const mockStorage = {}
global.localStorage = {
  getItem: (key) => mockStorage[key] || null,
  setItem: (key, value) => { mockStorage[key] = value },
  removeItem: (key) => { delete mockStorage[key] },
  clear: () => { Object.keys(mockStorage).forEach(key => delete mockStorage[key]) }
}

// Mock fetch to count API calls
const originalFetch = global.fetch
let apiCallCount = 0

global.fetch = (...args) => {
  const url = args[0]
  if (url.includes('api.github.com')) {
    apiCallCount++
    console.log(`🔥 API CALL #${apiCallCount}: DDragon listing fetch`)
  }
  return originalFetch(...args)
}

async function testIntegratedResolution() {
  console.log('🧪 Testing integrated DDragon resolution...\n')
  
  const version = '15.15.1'
  
  console.log('Step 1: Generate URLs without pre-fetch (should use fallback)')
  let url1 = generateDirectImageUrl(version, 'TFT15_Duelist', 'trait')
  console.log(`  Without pre-fetch: ${url1}`)
  
  console.log('\nStep 2: Pre-fetch DDragon data')
  await preFetchDDragonFileListing(version, ['trait'])
  
  console.log('\nStep 3: Generate URLs with pre-fetch (should use resolution)')
  let url2 = generateDirectImageUrl(version, 'TFT15_Duelist', 'trait')
  console.log(`  With pre-fetch: ${url2}`)
  
  console.log('\nStep 4: Generate multiple URLs (should use cached data)')
  const testTraits = ['TFT15_Strategist', 'TFT15_8Bit', 'TFT15_Duelist']
  testTraits.forEach(traitId => {
    const url = generateDirectImageUrl(version, traitId, 'trait')
    console.log(`  ${traitId} -> ${url.includes('Trait_Icon') ? '✅ resolved' : '❌ fallback'}`)
  })
  
  console.log('\n📊 Final Results:')
  console.log(`Total API calls: ${apiCallCount}`)
  console.log(`URL changed after pre-fetch: ${url1 !== url2 ? '✅ YES' : '❌ NO'}`)
  
  if (apiCallCount === 1 && url1 !== url2) {
    console.log('✅ SUCCESS: Resolution is working correctly!')
    console.log('  - API called only once for traits')
    console.log('  - URLs changed after pre-fetch (resolution active)')
    console.log('  - Multiple URLs use cached data')
  } else {
    console.log('❌ FAILURE: Issues detected')
    if (apiCallCount !== 1) console.log(`  - Expected 1 API call, got ${apiCallCount}`)
    if (url1 === url2) console.log('  - URLs did not change after pre-fetch')
  }
  
  // Restore original fetch
  global.fetch = originalFetch
}

testIntegratedResolution().catch(console.error)