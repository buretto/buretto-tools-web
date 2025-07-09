# TFT Roll-Down Practice Tool

## Project Overview
A comprehensive Teamfight Tactics (TFT) roll-down practice emulator that mimics the in-game player perspective for training purposes. The tool will simulate the complete TFT shopping and positioning experience with placeholder units to avoid copyright issues.

## Core Features

### UI Components
- **Hexagonal Board Layout**: 7x4 hex grid with proper positioning and visual feedback
- **Shop Interface**: 5-slot shop with refresh button, proper cost-color coding
- **Bench**: 9-slot unit storage with drag/drop functionality
- **Gold Display**: Current gold, interest calculation, economy tracking
- **Timer**: Countdown for turn phases with visual/audio cues
- **Player Level**: Affects shop odds and unit availability

### Game Mechanics
- **Unit Pool System**: Accurate pool sizes per cost tier (1-cost: 29 copies, 2-cost: 22, 3-cost: 18, 4-cost: 12, 5-cost: 10)
- **Pool Depletion**: Units gradually removed from pool based on predictable opponent board compositions
- **Drag & Drop**: Bench ↔ Board, Shop → Bench/Board, positioning
- **Purchase/Sell**: Click to buy, drag to sell, proper gold calculations
- **Refresh Mechanism**: Shop rerolls with proper randomization

### Challenge Modes
- **High Gold Rolldown**: Start with 150+ gold, optimize spending
- **Think Fast**: Infinite rolls but time pressure
- **Random Conditions**: Randomized starting scenarios
- **Scouting Phase**: Configurable duration (default 1 minute) applies to all modes

### Analytics & Feedback
- **Performance Metrics**: Rolls per minute, gold efficiency, positioning speed
- **End-Game Analysis**: Detailed breakdown of decisions and timing
- **Progress Tracking**: Historical performance data

## Technical Architecture

### Core Components Structure
```
rolldown/
├── CLAUDE.md                 # This file
├── RolldownTool.jsx          # Main container component
├── components/
│   ├── GameBoard.jsx         # Hexagonal board layout
│   ├── Shop.jsx              # Shop interface and logic
│   ├── Bench.jsx             # Unit storage bench
│   ├── PlayerInfo.jsx        # Gold, level, timer display
│   ├── OpponentBoards.jsx    # Static opponent board visualization
│   ├── Unit.jsx              # Individual unit component
│   ├── Timer.jsx             # Game phase timer
│   └── Analytics.jsx         # Performance tracking
├── hooks/
│   ├── useGameState.js       # Central game state management
│   ├── useDragDrop.js        # Drag and drop logic
│   ├── useUnitPool.js        # Unit availability tracking
│   ├── useTimer.js           # Timer and phase management
│   └── useAnalytics.js       # Performance metrics
├── data/
│   ├── placeholderUnits.js   # Unit definitions with metadata
│   ├── gameConstants.js      # Pool sizes, costs, probabilities
│   └── challengeModes.js     # Different practice scenarios
├── utils/
│   ├── hexGrid.js            # Hexagonal positioning calculations
│   ├── poolManager.js        # Unit pool distribution logic
│   └── audioManager.js       # Sound effects system
└── styles/
    └── rolldown.css          # Component-specific styles
```

### Data Structures

#### Unit Schema
```javascript
{
  id: string,
  name: string,
  cost: number,
  traits: string[],
  placeholder_art: string,
  stats: {
    attack: number,
    health: number,
    armor: number,
    magic_resist: number
  },
  synergies: string[]
}
```

#### Game State Schema
```javascript
{
  phase: 'scouting' | 'shopping' | 'combat' | 'analysis',
  timer: number,
  player: {
    gold: number,
    level: number,
    exp: number,
    board: Unit[],
    bench: Unit[],
    shop: Unit[]
  },
  opponentBoards: StaticBoard[], // Static compositions, no dynamic updates
  unitPool: Map<string, number>,
  analytics: {
    rollsPerMinute: number,
    goldSpent: number,
    startTime: number,
    actions: Action[]
  }
}
```

## Implementation Phases

### Phase 1: Core UI Framework
- [ ] Basic component structure
- [ ] Hexagonal grid layout system
- [ ] Drag and drop foundation
- [ ] Basic unit rendering with placeholders
- [ ] Gold and level display

### Phase 2: Game Logic
- [ ] Unit pool management system
- [ ] Shop refresh mechanics
- [ ] Purchase/sell logic
- [ ] Board positioning validation
- [ ] Basic timer implementation

### Phase 3: Pool Management
- [ ] Static opponent board generation
- [ ] Predictable unit pool depletion
- [ ] Pool visualization for scouting
- [ ] Challenge mode configurations

### Phase 4: Advanced Features
- [ ] Challenge modes implementation
- [ ] Analytics tracking system
- [ ] Sound effects integration
- [ ] Performance optimization
- [ ] Mobile responsiveness

### Phase 5: Polish & Enhancement
- [ ] Advanced analytics dashboard
- [ ] Custom scenario creation
- [ ] Settings and preferences (scouting time, etc.)
- [ ] Tutorial system

## Technical Challenges

### Critical Challenges
1. **Hexagonal Grid Mathematics**: Complex positioning calculations for proper hex layout
2. **State Management**: Coordinating player board with shared unit pools
3. **Performance**: Real-time updates without lag
4. **Drag & Drop UX**: Smooth interactions with proper collision detection
5. **Unit Pool Accuracy**: Maintaining correct distribution with predictable depletion

### Potential Solutions
- **Hex Grid**: Use cube coordinates with proper conversion utilities
- **State Management**: Context API with useReducer for complex state updates
- **Performance**: React.memo, useMemo for expensive calculations
- **Drag & Drop**: Custom hooks with pointer events for cross-device compatibility
- **Pool Management**: Centralized pool state with validation checks

## Missing Considerations

### Currently Out of Scope (Future Enhancements)
- **Items/Augments**: Focus on units first, items later
- **Different TFT Sets**: Start with one set, expand later
- **Ranked System**: Personal progression tracking
- **Multiplayer**: Real-time practice with friends
- **Replay System**: Save and review practice sessions
- **Dynamic AI Opponents**: Static boards only for pool depletion

### Technical Debt Considerations
- **Copyright Safety**: Ensure all assets are original/placeholder
- **Accessibility**: Proper ARIA labels for screen readers
- **Internationalization**: Multi-language support structure
- **Testing**: Unit tests for complex game logic

## Next Steps
1. Create basic component structure
2. Implement hexagonal grid system
3. Build drag & drop foundation
4. Create placeholder unit system
5. Implement basic shop mechanics

## Sound Effects Needed
- Shop refresh sound
- Unit purchase sound
- Unit sell sound
- Unit placement sound
- Timer warning sounds
- Phase transition sounds
- Success/failure feedback sounds