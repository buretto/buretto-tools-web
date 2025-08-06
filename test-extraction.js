// Quick test to verify runtime extraction works
import { extractSetData } from './src/components/rolldown/utils/runtimeExtractor.js'

const testExtraction = async () => {
  try {
    console.log('🧪 Testing Set 15 extraction...')
    const result = await extractSetData(15, (progress) => {
      console.log(`📊 Progress: ${progress.stage} - ${progress.progress}%`)
    })
    
    if (result) {
      console.log('✅ Extraction successful!')
      console.log(`📦 Result keys: ${Object.keys(result)}`)
      if (result.champions) {
        console.log(`👥 Champions found: ${Object.keys(result.champions).length}`)
        console.log(`📝 Sample champions: ${Object.keys(result.champions).slice(0, 3)}`)
      }
    } else {
      console.log('❌ Extraction returned null')
    }
  } catch (error) {
    console.error('💥 Extraction failed:', error)
  }
}

testExtraction()