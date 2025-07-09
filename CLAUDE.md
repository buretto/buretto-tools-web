# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
This is a React-based web application hosting a personal collection of miscellaneous tools and utilities. The project auto-deploys via GitHub Actions when pushed to main branch. Tools can be organized by tags or categories and may include calculators, converters, generators, or any other useful web-based utilities.

## Development Commands

### Start Development Server
```bash
npm run dev
```

### Deployment
Deployment is automated via GitHub Actions. Simply push to main:
```bash
git push origin main
```

## Architecture

### Tech Stack
- **Framework**: React 19.1.0 with Vite 6.3.5
- **Styling**: Tailwind CSS 3.4.17 with custom Buretto brand colors
- **Icons**: Lucide React
- **Build Tool**: Vite with React plugin
- **Deployment**: GitHub Actions (auto-builds and deploys on push to main)

### Project Structure
```
src/
├── App.jsx              # Main app component with page routing
├── main.jsx             # React entry point
├── index.css            # Global styles and Tailwind imports
└── components/
    ├── Navigation.jsx   # Top navigation with Buretto branding
    ├── Home.jsx         # Landing page with tool selection
    └── [Tool components] # Individual tool components
```

### Navigation System
The app uses a simple state-based navigation system in `App.jsx` with `currentPage` state. Pages are rendered conditionally via a switch statement in the `renderPage()` function. New tools should be added to:
1. Import statement in `App.jsx`
2. Switch case in `renderPage()` function
3. Navigation menu in `Navigation.jsx`
4. Tool grid in `Home.jsx`

### Brand Colors (Tailwind Config)
- `buretto-primary`: #1a1a1a (dark gray)
- `buretto-secondary`: #f59e0b (amber)
- `buretto-accent`: #6b7280 (gray)
- `buretto-light`: #f9fafb (light gray)

### Component Patterns
- Tool components should follow consistent structure with form inputs and result displays
- Navigation component includes custom Buretto logo with Epic Games-inspired styling
- Consistent use of Tailwind classes for responsive design and theming
- Tools can be categorized or tagged for organization as the collection grows

## Key Configuration Files
- `vite.config.js`: Vite configuration with React plugin
- `tailwind.config.js`: Custom Buretto brand colors and Roboto font
- `postcss.config.js`: PostCSS configuration for Tailwind
- `index.html`: Meta tags optimized for SEO
- `.github/workflows/deploy.yml`: GitHub Actions for automated deployment