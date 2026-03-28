# frontend.md

## Overview

The frontend is responsible for turning the simulation into a clear, interactive, and visually compelling product.

Its job is to let users configure scenarios, run simulations, inspect agent behavior, and understand both individual and city-level outcomes through a map-based interface.

At a high level, the frontend should:
- render the neighborhood map
- provide controls for scenario changes
- show live simulation updates
- display agent-level reasoning
- surface aggregate metrics and comparisons

## Recommended frontend stack

- React.js
- Vite
- TypeScript
- Tailwind CSS
- Mapbox GL JS
- Zustand
- Recharts

## Why this stack

### React.js
React is a good fit because this product is mainly an interactive dashboard, not a content-heavy website.

### Vite
Vite keeps setup simple and makes local development fast.

### TypeScript
TypeScript helps keep component props, API payloads, and simulation data consistent as the project grows.

### Tailwind CSS
Tailwind is the fastest way to build a polished interface without spending too much time on custom CSS.

### Mapbox GL JS
Mapbox is the most important frontend library in this project because the map is the centerpiece of the product.

### Zustand
Zustand is a lightweight way to manage shared UI state such as selected scenario, selected agent, run status, and live simulation data.

### Recharts
Recharts is useful for simple, clear analytics panels like congestion trends, venue demand, and before-vs-after comparisons.

## Core frontend responsibilities

### 1. Map visualization
The map is the center of the product.

It should display:
- the selected neighborhood
- important locations such as stations, venues, and intersections
- agent positions and movement
- congestion hotspots
- closures
- route flow changes
- before vs after simulation differences

### 2. Scenario controls
The frontend should let users configure the city conditions they want to test.

Examples:
- weather changes
- transit delays
- street closures
- event start or end times
- venue openings
- bike-lane additions

These controls should be easy to change and easy to reset.

### 3. Simulation control panel
The user should be able to:
- start a simulation
- pause a simulation
- reset a simulation
- switch scenarios
- scrub or inspect time if replay is added later

### 4. Agent inspection
The frontend should allow the user to click an agent and inspect:
- persona type
- current goal
- current plan
- recent observations
- selected action
- explanation for why the action changed

This is one of the most important parts of the UI because it helps prove the simulation is not fake.

### 5. Analytics and metrics
The frontend should show city-level outputs such as:
- crowd density
- congestion by zone
- route flow counts
- venue demand changes
- average travel delay
- comparisons between baseline and modified scenarios

## Main frontend views

The frontend does not need many pages. It mostly needs one strong dashboard.

### 1. Main simulation dashboard
This should be the primary view.

It should include:
- the map
- scenario controls
- simulation controls
- agent details panel
- metrics panel

### 2. Scenario comparison view
This can be a separate page or a panel inside the dashboard.

It should compare:
- baseline scenario
- modified scenario
- key changes in flow, congestion, and demand

### 3. Optional replay or timeline view
Later, the frontend can add a timeline to inspect how the simulation evolved over time.

## Suggested frontend layout

A good default layout is:

- left sidebar for scenario and simulation controls
- center map for neighborhood visualization
- right sidebar for selected agent details and metrics
- top bar for title, active scenario, and run status

This layout is simple and works well for dashboard-style products.

## Suggested component structure

```text
frontend/
├── src/
│   ├── components/
│   │   ├── map/
│   │   ├── controls/
│   │   ├── agents/
│   │   ├── metrics/
│   │   └── layout/
│   ├── pages/
│   ├── hooks/
│   ├── store/
│   ├── services/
│   ├── types/
│   ├── utils/
│   ├── App.tsx
│   └── main.tsx
├── public/
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## What each frontend folder should contain

### `components/`
Reusable UI pieces.

Examples:
- map container
- scenario form
- control buttons
- agent detail card
- metric charts
- legend
- top bar

### `pages/`
High-level route views.

At the beginning, this may only contain one main dashboard page.

### `hooks/`
Custom hooks for frontend logic.

Examples:
- websocket connection hook
- map initialization hook
- simulation polling or subscription hook

### `store/`
Zustand state stores.

Examples:
- selected scenario state
- selected agent state
- simulation run state
- live metrics state

### `services/`
API calls and websocket helpers.

Examples:
- create scenario request
- start simulation request
- fetch metrics
- websocket event handlers

### `types/`
TypeScript types for:
- agents
- scenarios
- metrics
- websocket payloads
- map entities

## Core components to build first

### MapPanel
Responsible for:
- rendering the map
- showing nodes, venues, and agents
- visualizing flows and congestion

### ScenarioControls
Responsible for:
- toggling events
- editing scenario settings
- resetting controls

### SimulationControls
Responsible for:
- start, pause, reset
- showing current time and run status

### AgentInspector
Responsible for:
- displaying selected agent info
- showing explanation and reasoning

### MetricsPanel
Responsible for:
- charts
- summary stats
- before vs after comparisons

## Frontend data flow

A simple flow should look like this:

1. User changes scenario settings in the UI.
2. Frontend sends scenario data to backend.
3. User starts simulation.
4. Backend starts the run.
5. Frontend listens for live updates through WebSocket.
6. Map, agent details, and charts update as new data arrives.
7. User clicks an agent to inspect why it changed behavior.

## State management direction

Use Zustand for shared app state.

Good global state examples:
- selected neighborhood
- selected scenario
- current simulation id
- run status
- selected agent id
- latest metrics
- current simulation time

Keep short-lived local UI state inside components when possible.

## WebSocket handling

The frontend should maintain a live connection during simulation runs.

Incoming events may include:
- simulation tick update
- agent moved
- metric updated
- event applied
- simulation ended

The frontend should update only the parts of the UI that changed instead of reloading everything.

## Styling direction

The UI should feel clean and technical.

Recommended style goals:
- dark dashboard-style theme
- strong map contrast
- clear panels and cards
- minimal clutter
- readable legends and labels
- polished but not overly flashy

The map should remain the visual focus.

## Important frontend design principles

### 1. Keep the map central
The user should immediately understand that the simulation happens on the map.

### 2. Make the controls simple
Too many controls at once will make the product feel confusing.

### 3. Make explanations visible
If users cannot inspect why agents changed behavior, the simulation will feel less believable.

### 4. Prefer clarity over animation
Animations are helpful, but only if they make movement easier to understand.

### 5. Keep panels modular
Each panel should be easy to change without breaking the rest of the dashboard.

## First implementation priorities

Build the frontend in this order:

1. React + Vite setup
2. Tailwind setup
3. base app layout
4. Mapbox map panel
5. scenario controls panel
6. simulation controls
7. API connection to backend
8. WebSocket live updates
9. agent inspector panel
10. metrics charts

## Example first-screen experience

When the app opens, the user should see:
- a map centered on the selected neighborhood
- a left panel with scenario toggles
- a start simulation button
- a right panel for metrics and selected agent details

After starting the simulation:
- agents begin moving
- congestion zones update
- metrics refresh live
- the user can click any agent to inspect its reasoning

## Guiding principle

The frontend should make complex backend behavior feel intuitive.

If the backend is the brain of the project, the frontend is what makes the intelligence visible, believable, and impressive.

