# TFT Rolldown Tool - Layout Implementation Plan

## Current Issues
- [ ] Right and bottom sides of game board are cutoff after spacing adjustments (0.88/0.44)
- [ ] Need unified proportional scaling system for all UI elements
- [ ] Bench and shop components need proper sizing relative to game board
- [ ] Page layout needs aspect ratio constraints and responsive behavior

## Target Layout Structure

### Overall Proportions (at 1920x1080 base)
```
┌─────────────────────────────────────────────────────────────┐
│ Header/Timer (15% of page height)                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────────────┐ ← 2/3 page width, centered         │
│ │   Opponent Board    │                                     │
│ │     (7x4 hex)       │                                     │
│ ├─────────────────────┤                                     │
│ │   Player Board      │ ← 60% of content height             │
│ │     (7x4 hex)       │                                     │
│ └─────────────────────┘                                     │
│           │ (no gap)                                        │
│           ▼                                                 │
│ ┌───────────────────────┐ ← 12% of content height           │
│ │ Bench (9 tiles)       │                                   │
│ │ Right-aligned to board│                                   │
│ └───────────────────────┘                                   │
│           │ (small gap)                                     │
│           ▼                                                 │
│ ┌─────────────────────────────────────┐ ← 13% content height │
│ │        Shop (5 slots)               │                     │
│ │     (2/3 page width)                │                     │
│ └─────────────────────────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

## Sizing Relationships

### Base Measurements
- **Container Width**: 1280px (2/3 of 1920px)
- **Container Height**: 1080px 
- **Base Unit**: Container Width / 12 = ~107px

### Element Sizes (relative to base unit)
```
Hex Tiles (Game Board):
- Size: Base Unit × 0.8 = ~85px
- Current spacing: 0.88 horizontal, 0.44 vertical offset

Bench Tiles:
- Width: Base Unit × 0.7 × 1.35 = ~101px
- Height: Base Unit × 0.7 = ~75px
- Count: 9 tiles horizontally
- Shape: Rectangular (1.35:1 ratio)

Shop Slots:
- Width: Base Unit × 1.05 × 1.35 = ~151px  
- Height: Base Unit × 1.05 = ~112px
- Count: 5 slots horizontally
- Shape: Rectangular (1.35:1 ratio)
```

## Viewport Scaling System

### Supported Aspect Ratios
- **Minimum**: 1.2:1 (6:5) - below this = horizontal cutoff
- **Maximum**: 3.5:1 (32:9) - above this = letterbox + possible vertical cutoff
- **Optimal Range**: 1.33:1 (4:3) to 2.4:1 (~21:9)

### Minimum Scale Constraints
- **Minimum Scale**: 0.46x (based on 500px minimum height)
- **Minimum Viewport**: 590px × 500px
- **Below minimums**: Content cuts off rather than shrinking further

### Scaling Modes
1. **PROPORTIONAL**: Normal scaling, everything fits
2. **HORIZONTAL_CUTOFF**: Too narrow - scale by height, cut sides
3. **DUAL_CUTOFF**: Too small - use minimum scale, cut both dimensions
4. **MIXED_LETTERBOX_CUTOFF**: Too wide - letterbox sides, maybe cut top/bottom

## Implementation Order

### Phase 1: Viewport Scaling Foundation
1. Create viewport scaling utility (`utils/viewportScaling.js`)
2. Add scaling CSS classes and custom properties
3. Update RolldownTool to use scaling container
4. Test scaling across different viewport sizes

### Phase 2: Fix Current Board Issues  
1. Increase SVG viewport dimensions to prevent cutoff
2. Ensure proper padding around hex grid
3. Test with current 0.88/0.44 spacing values

### Phase 3: Proportional Layout System
1. Create main game content container (1280×1080 at base scale)
2. Convert all sizing to percentage-based within container
3. Implement CSS custom properties for dynamic sizing

### Phase 4: Bench Component
1. Create bench component with 9 rectangular tiles
2. Size tiles relative to base unit (70% of hex size)
3. Position bench touching bottom of game board
4. Align right edge with game board right edge

### Phase 5: Shop Component Updates
1. Resize shop slots to 150% of bench tile size
2. Maintain 1.35:1 aspect ratio
3. Position shop below bench
4. Ensure shop takes full container width

### Phase 6: Integration & Testing
1. Test all elements scale together proportionally
2. Verify aspect ratio handling across all modes
3. Test minimum scale constraints
4. Validate alignment and spacing relationships

## CSS Architecture

### Root Container
```css
.game-root {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
```

### Scaled Content Container
```css
.game-content {
  width: 1280px;   /* Base container width */
  height: 1080px;  /* Base container height */
  transform: scale(var(--game-scale));
  transform-origin: center center;
  position: relative;
}
```

### Proportional Areas
```css
.game-header { height: 15%; }
.game-board-area { height: 60%; }
.bench-area { height: 12%; }
.shop-area { height: 13%; }
```

## File Structure
```
src/components/rolldown/
├── utils/
│   └── viewportScaling.js      # Viewport scaling logic
├── styles/
│   └── rolldown.css           # Updated with scaling classes
├── components/
│   ├── GameBoard.jsx          # Updated with proper viewport
│   ├── Bench.jsx              # New proportional bench
│   └── Shop.jsx               # Updated proportional shop
└── RolldownTool.jsx           # Main container with scaling
```

## Success Criteria
- [ ] Game board never cuts off at supported aspect ratios
- [ ] All elements scale together proportionally
- [ ] Bench tiles are ~90% size of hex tiles
- [ ] Shop slots are ~150% size of bench tiles
- [ ] Layout maintains proportions across viewport sizes
- [ ] Graceful degradation at unsupported aspect ratios
- [ ] Smooth transitions during window resizing