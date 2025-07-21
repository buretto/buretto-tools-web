/**
 * Audio Manager for TFT Rolldown Tool
 * Handles loading and playing sound effects at the right moments
 */

class AudioManager {
  constructor() {
    this.sounds = new Map()
    this.isEnabled = true
    this.volume = 0.7
    this.isLoading = false
  }

  /**
   * Initialize and preload all sound effects
   */
  async initialize() {
    if (this.isLoading) return
    this.isLoading = true

    const soundFiles = [
      'buy-xp.mp3',
      'buy-roll.mp3', 
      'buy-unit.mp3',
      'sell-unit.mp3',
      'unit-pickup.mp3',
      'unit-drop.mp3',
      'drag-hover-new-tile.mp3',
      '2-star.mp3',
      '3-star.mp3'
    ]

    const loadPromises = soundFiles.map(filename => this.loadSound(filename))
    
    try {
      await Promise.all(loadPromises)
      console.log('🔊 Audio Manager: All sound effects loaded')
    } catch (error) {
      console.warn('⚠️ Audio Manager: Some sounds failed to load', error)
    } finally {
      this.isLoading = false
    }
  }

  /**
   * Load a single sound file
   */
  async loadSound(filename) {
    return new Promise((resolve, reject) => {
      // Load from public directory (works in both dev and production)
      const audio = new Audio(`/audio/${filename}`)
      audio.volume = this.volume
      audio.preload = 'auto'
      
      audio.addEventListener('canplaythrough', () => {
        const soundName = filename.replace('.mp3', '')
        this.sounds.set(soundName, audio)
        resolve()
      })
      
      audio.addEventListener('error', (e) => {
        console.warn(`Failed to load sound: ${filename}`, e)
        reject(e)
      })
    })
  }

  /**
   * Play a sound effect
   */
  play(soundName) {
    if (!this.isEnabled) return
    
    const sound = this.sounds.get(soundName)
    if (!sound) {
      console.warn(`Sound not found: ${soundName}`)
      return
    }

    // Reset playback position and play
    try {
      sound.currentTime = 0
      sound.play().catch(e => {
        console.warn(`Failed to play sound: ${soundName}`, e)
      })
    } catch (error) {
      console.warn(`Error playing sound: ${soundName}`, error)
    }
  }

  /**
   * Set volume for all sounds (0.0 - 1.0)
   */
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume))
    this.sounds.forEach(sound => {
      sound.volume = this.volume
    })
  }

  /**
   * Enable/disable all sounds
   */
  setEnabled(enabled) {
    this.isEnabled = enabled
  }

  /**
   * Convenience methods for specific game actions
   */
  playBuyXP() { this.play('buy-xp') }
  playBuyRoll() { this.play('buy-roll') }
  playBuyUnit() { this.play('buy-unit') }
  playSellUnit() { this.play('sell-unit') }
  playUnitPickup() { this.play('unit-pickup') }
  playUnitDrop() { this.play('unit-drop') }
  playDragHover() { this.play('drag-hover-new-tile') }
  play2Star() { this.play('2-star') }
  play3Star() { this.play('3-star') }
}

// Create a singleton instance
const audioManager = new AudioManager()

export default audioManager