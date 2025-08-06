/**
 * Teamcode Parser Utility
 * 
 * Parses TFT Team Planner codes using Community Dragon data
 * Based on instructions from: https://gist.github.com/bangingheads/243e396f78be1a4d49dc0577abf57a0b
 */

/**
 * Extracts the TFT set ID from a teamcode
 * @param {string} teamcode - The teamcode string to parse
 * @returns {string|null} - The TFT set ID (e.g., "TFTSet13") or null if not found
 */
export const extractSetFromTeamcode = (teamcode) => {
  try {
    // Teamcodes typically end with the set ID (e.g., "TFTSet13")
    const setMatch = teamcode.match(/TFTSet\d+$/i)
    return setMatch ? setMatch[0] : null
  } catch (error) {
    console.error('Error extracting set from teamcode:', error)
    return null
  }
}

/**
 * Generates champion ID mappings from teamplanner data
 * @param {Object} teamplannerData - The teamplanner data from Community Dragon
 * @param {string} setId - The TFT set ID (e.g., "TFTSet13")
 * @returns {Object} - Mapping of hex codes to champion IDs and vice versa
 */
export const generateChampionMappings = (teamplannerData, setId) => {
  try {
    console.log('generateChampionMappings called with:', { 
      setId, 
      hasData: !!teamplannerData,
      dataType: typeof teamplannerData,
      keys: teamplannerData ? Object.keys(teamplannerData) : 'No data',
      targetSetExists: teamplannerData && teamplannerData[setId] ? true : false,
      targetSetLength: teamplannerData && teamplannerData[setId] ? teamplannerData[setId].length : 'N/A'
    })
    
    if (!teamplannerData || !setId || !teamplannerData[setId]) {
      console.warn('Invalid teamplanner data or set ID:', { setId, hasData: !!teamplannerData })
      return { hexToChampion: {}, championToHex: {} }
    }

    const champions = teamplannerData[setId]
    
    // Sort champions alphabetically by character_id
    const sortedChampions = champions.sort((a, b) => 
      a.character_id.localeCompare(b.character_id)
    )

    const hexToChampion = {}
    const championToHex = {}

    // Generate 2-digit hex codes based on sorted position
    sortedChampions.forEach((champion, index) => {
      // Convert index to 2-digit hex (starting from 01, not 00)
      const hexCode = (index + 1).toString(16).padStart(2, '0').toUpperCase()
      
      hexToChampion[hexCode] = champion.character_id
      championToHex[champion.character_id] = hexCode
    })

    console.log(`Generated ${Object.keys(hexToChampion).length} champion mappings for ${setId}`)
    
    return { hexToChampion, championToHex }
  } catch (error) {
    console.error('Error generating champion mappings:', error)
    return { hexToChampion: {}, championToHex: {} }
  }
}

/**
 * Parses a teamcode string into an array of champion IDs
 * @param {string} teamcode - The teamcode to parse
 * @param {Object} teamplannerData - The teamplanner data from Community Dragon
 * @returns {Object} - Parsed teamcode data with champion IDs and metadata
 */
export const parseTeamcode = (teamcode, teamplannerData) => {
  try {
    if (!teamcode || typeof teamcode !== 'string') {
      throw new Error('Invalid teamcode provided')
    }

    // Clean the teamcode (remove whitespace)
    const cleanTeamcode = teamcode.trim()

    // Extract set ID from the end of the teamcode
    const setId = extractSetFromTeamcode(cleanTeamcode)
    if (!setId) {
      throw new Error('Could not extract TFT set ID from teamcode')
    }

    // Remove the set ID from the end to get the champion codes
    const championCodesString = cleanTeamcode.replace(setId, '')

    // Teamcodes should start with "01"
    if (!championCodesString.startsWith('01')) {
      throw new Error('Teamcode should start with "01"')
    }

    // Remove the "01" prefix
    const codesOnly = championCodesString.substring(2)

    // Generate champion mappings for this set
    const { hexToChampion } = generateChampionMappings(teamplannerData, setId)
    
    console.log('Generated mappings for', setId, ':', Object.keys(hexToChampion).length, 'champions')
    console.log('First few mappings:', Object.entries(hexToChampion).slice(0, 10))

    // Parse champion codes (each champion is represented by 2 hex digits)
    const champions = []
    for (let i = 0; i < codesOnly.length; i += 2) {
      const hexCode = codesOnly.substring(i, i + 2).toUpperCase()
      
      if (hexCode === '00') {
        // Empty slot
        champions.push(null)
      } else if (hexToChampion[hexCode]) {
        // Valid champion
        champions.push(hexToChampion[hexCode])
      } else {
        console.warn(`Unknown champion code: ${hexCode}`)
        champions.push(null)
      }
    }

    return {
      success: true,
      setId,
      champions,
      totalSlots: champions.length,
      filledSlots: champions.filter(Boolean).length,
      emptySlots: champions.filter(c => c === null).length
    }
  } catch (error) {
    console.error('Error parsing teamcode:', error)
    return {
      success: false,
      error: error.message,
      champions: [],
      setId: null,
      totalSlots: 0,
      filledSlots: 0,
      emptySlots: 0
    }
  }
}

/**
 * Generates a teamcode from an array of champion IDs
 * @param {Array} champions - Array of champion character_ids (null for empty slots)
 * @param {string} setId - The TFT set ID (e.g., "TFTSet13")
 * @param {Object} teamplannerData - The teamplanner data from Community Dragon
 * @returns {string|null} - Generated teamcode or null if error
 */
export const generateTeamcode = (champions, setId, teamplannerData) => {
  try {
    if (!Array.isArray(champions) || !setId || !teamplannerData) {
      throw new Error('Invalid parameters for teamcode generation')
    }

    // Generate champion mappings for this set
    const { championToHex } = generateChampionMappings(teamplannerData, setId)

    // Start with "01" prefix
    let teamcode = '01'

    // Convert each champion slot to hex
    champions.forEach(championId => {
      if (championId === null || championId === undefined) {
        // Empty slot
        teamcode += '00'
      } else if (championToHex[championId]) {
        // Valid champion
        teamcode += championToHex[championId]
      } else {
        console.warn(`Unknown champion ID: ${championId}`)
        teamcode += '00' // Treat as empty slot
      }
    })

    // Append set ID
    teamcode += setId

    return teamcode
  } catch (error) {
    console.error('Error generating teamcode:', error)
    return null
  }
}

/**
 * Validates if a string looks like a valid teamcode
 * @param {string} input - The input string to validate
 * @returns {boolean} - True if it looks like a valid teamcode
 */
export const isValidTeamcodeFormat = (input) => {
  try {
    if (!input || typeof input !== 'string') {
      return false
    }

    const cleaned = input.trim()
    
    // Should start with "01"
    if (!cleaned.startsWith('01')) {
      return false
    }

    // Should end with TFTSet followed by numbers
    if (!/TFTSet\d+$/i.test(cleaned)) {
      return false
    }

    // Extract the middle part (champion codes)
    const setMatch = cleaned.match(/TFTSet\d+$/i)
    const championPart = cleaned.substring(2, cleaned.length - setMatch[0].length)
    
    // Champion part should be even length (each champion is 2 hex digits)
    if (championPart.length % 2 !== 0) {
      return false
    }

    // All characters in champion part should be valid hex
    if (!/^[0-9A-Fa-f]*$/.test(championPart)) {
      return false
    }

    return true
  } catch (error) {
    return false
  }
}