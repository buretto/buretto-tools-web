/**
 * Network utilities with timeout and offline mode support
 */

import { deduplicateRequest } from './requestDeduplicator'

const NETWORK_TIMEOUT = 10000 // 10 seconds
const OFFLINE_MODE_KEY = 'tft_offline_mode'
const FAILED_REQUESTS_KEY = 'tft_failed_requests'

// Circuit breaker state
let circuitBreakerOpen = false
let circuitBreakerOpenTime = 0
const CIRCUIT_BREAKER_TIMEOUT = 2 * 60 * 1000 // 2 minutes before retry
const MAJOR_FAILURE_THRESHOLD = 2 // Major failures in a row

/**
 * Check if circuit breaker should block requests
 */
const checkCircuitBreaker = () => {
  if (!circuitBreakerOpen) return false
  
  const now = Date.now()
  if (now - circuitBreakerOpenTime > CIRCUIT_BREAKER_TIMEOUT) {
    // Reset circuit breaker after timeout
    circuitBreakerOpen = false
    circuitBreakerOpenTime = 0
    console.log('🔄 Circuit breaker reset - attempting network requests again')
    return false
  }
  
  return true
}

/**
 * Open circuit breaker to block subsequent requests
 */
const openCircuitBreaker = () => {
  circuitBreakerOpen = true
  circuitBreakerOpenTime = Date.now()
  console.log('🚫 Circuit breaker opened - blocking network requests for 2 minutes')
}

/**
 * Fetch with timeout and circuit breaker protection
 * @param {string} url - URL to fetch
 * @param {number} timeout - Timeout in milliseconds (default 10s)
 * @returns {Promise<Response>}
 */
export const fetchWithTimeout = async (url, timeout = NETWORK_TIMEOUT) => {
  // Check circuit breaker first
  if (checkCircuitBreaker()) {
    throw new Error('Circuit breaker open - network requests blocked')
  }
  
  const controller = new AbortController()
  
  const timeoutId = setTimeout(() => {
    controller.abort()
  }, timeout)
  
  try {
    const response = await fetch(url, {
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`)
    }
    throw error
  }
}

/**
 * Check if we should use offline mode
 * @returns {boolean}
 */
export const shouldUseOfflineMode = () => {
  try {
    return localStorage.getItem(OFFLINE_MODE_KEY) === 'true'
  } catch {
    return false
  }
}

/**
 * Enable offline mode (use bundled data only)
 */
export const enableOfflineMode = () => {
  try {
    localStorage.setItem(OFFLINE_MODE_KEY, 'true')
    console.log('🔌 Offline mode enabled - using bundled data only')
  } catch (error) {
    console.warn('Failed to save offline mode preference:', error)
  }
}

/**
 * Disable offline mode (try network requests first)
 */
export const disableOfflineMode = () => {
  try {
    localStorage.removeItem(OFFLINE_MODE_KEY)
    localStorage.removeItem(FAILED_REQUESTS_KEY)
    console.log('🌐 Online mode enabled - will attempt network requests')
  } catch (error) {
    console.warn('Failed to clear offline mode preference:', error)
  }
}

// Track consecutive major failures for circuit breaker
let consecutiveMajorFailures = 0

/**
 * Track failed requests to automatically enable offline mode and circuit breaker
 * @param {string} url - The URL that failed
 * @param {boolean} isMajorFailure - Whether this is a major failure (JSON fetch, version fetch, etc.)
 */
export const trackFailedRequest = (url, isMajorFailure = false) => {
  try {
    const now = Date.now()
    const failedRequests = JSON.parse(localStorage.getItem(FAILED_REQUESTS_KEY) || '[]')
    
    // Add this failure
    failedRequests.push({ url, timestamp: now, major: isMajorFailure })
    
    // Remove failures older than 1 hour
    const oneHourAgo = now - (60 * 60 * 1000)
    const recentFailures = failedRequests.filter(failure => failure.timestamp > oneHourAgo)
    
    localStorage.setItem(FAILED_REQUESTS_KEY, JSON.stringify(recentFailures))
    
    // Track consecutive major failures for circuit breaker
    if (isMajorFailure) {
      consecutiveMajorFailures++
      console.log(`📊 Major failure ${consecutiveMajorFailures}/${MAJOR_FAILURE_THRESHOLD} for ${url}`)
      
      // Open circuit breaker after consecutive major failures
      if (consecutiveMajorFailures >= MAJOR_FAILURE_THRESHOLD) {
        openCircuitBreaker()
        enableOfflineMode()
        consecutiveMajorFailures = 0 // Reset counter
        return true
      }
    } else {
      // Reset consecutive counter on successful non-major request
      consecutiveMajorFailures = 0
    }
    
    // If we have 3+ failures in the last hour, enable offline mode
    if (recentFailures.length >= 3) {
      enableOfflineMode()
      return true // Indicates offline mode was auto-enabled
    }
    
    return false
  } catch (error) {
    console.warn('Failed to track failed request:', error)
    return false
  }
}

/**
 * Fetch with automatic offline mode fallback and circuit breaker
 * @param {string} url - URL to fetch
 * @param {Function} fallbackFn - Function to call if request fails
 * @param {string} dataType - Type of data being fetched (for logging)
 * @param {boolean} isMajorFailure - Whether this is a critical request (version, JSON data)
 * @returns {Promise<any>}
 */
export const fetchWithFallback = async (url, fallbackFn, dataType = 'data', isMajorFailure = false) => {
  // Check if we should skip network requests
  if (shouldUseOfflineMode()) {
    console.log(`🔌 Offline mode: using bundled ${dataType}`)
    return fallbackFn()
  }
  
  try {
    // Use request deduplication to prevent multiple identical requests
    const data = await deduplicateRequest(url, async () => {
      console.log(`🌐 Fetching ${dataType} from:`, url)
      const response = await fetchWithTimeout(url)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const jsonData = await response.json()
      console.log(`✅ Successfully fetched ${dataType}`)
      return jsonData
    })
    
    // Reset consecutive failures on success
    if (isMajorFailure) {
      consecutiveMajorFailures = 0
    }
    
    return data
  } catch (error) {
    console.warn(`❌ Failed to fetch ${dataType}:`, error.message)
    
    // Track failure with major flag
    const autoEnabledOffline = trackFailedRequest(url, isMajorFailure)
    if (autoEnabledOffline) {
      console.log(`🔌 Auto-enabled offline mode due to repeated failures`)
    }
    
    console.log(`📦 Using bundled ${dataType} as fallback`)
    return fallbackFn()
  }
}