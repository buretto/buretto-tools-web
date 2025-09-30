/**
 * Request Deduplicator - Prevents duplicate network requests
 */

// Map to store active promises by URL
const activeRequests = new Map()

/**
 * Deduplicates network requests by URL
 * @param {string} url - The URL to fetch
 * @param {Function} fetcher - Function that returns a promise for the actual fetch
 * @returns {Promise} The fetch result (either from cache or new request)
 */
export const deduplicateRequest = async (url, fetcher) => {
  // If this URL is already being fetched, return the existing promise
  if (activeRequests.has(url)) {
    console.log(`🔄 Deduplicating request for: ${url}`)
    return activeRequests.get(url)
  }
  
  // Start the fetch and store the promise
  const promise = fetcher()
    .finally(() => {
      // Clean up the active request when done
      activeRequests.delete(url)
    })
  
  activeRequests.set(url, promise)
  return promise
}

/**
 * Clears all active requests (useful for cleanup)
 */
export const clearActiveRequests = () => {
  activeRequests.clear()
}

/**
 * Gets the number of active requests (useful for debugging)
 */
export const getActiveRequestCount = () => {
  return activeRequests.size
}