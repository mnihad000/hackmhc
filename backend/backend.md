# backend.md

## Overview

The backend powers the simulation, agent behavior, world state, and real-time updates for What-If NYC.

Its job is to take a user-defined scenario, apply changes to the city environment, simulate how agents respond over time, and return both individual and aggregate outcomes to the frontend.

At a high level, the backend is responsible for:
- managing scenarios
- storing and updating world state
- simulating agents
- applying disruptions and interventions
- computing metrics
- streaming results to the frontend

## Core backend responsibilities

### 1. Scenario management
The backend should accept scenario inputs such as:
- weather changes
- transit delays
- street closures
- event start or end times
- venue openings
- bike-lane additions

It should validate and store those scenario settings, then use them to initialize a simulation run.

### 2. World state engine
The backend maintains the active city state for the selected neighborhood.

This includes:
- map nodes and edges
- transit stations and routes
- venues and points of interest
- congestion levels
- weather conditions
- active disruptions
- time within the simulation

The world state is what agents observe and react to.

### 3. Agent simulation
The backend manages all agents in the system.

Each agent has:
- an identity and persona type
- goals
- preferences
- constraints
- current location
- current plan
- memory
- action history

Agents should be simulated in ticks. On each tick, they observe the world, evaluate choices, possibly replan, and execute the next step in their behavior.

### 4. Metrics and aggregation
The backend should compute outputs that the frontend can visualize.

Examples:
- crowd density by zone
- route flow counts
- venue demand shifts
- congestion hotspots
- average travel delays
- agent decision summaries

### 5. Real-time streaming
The backend should stream simulation updates to the frontend using WebSockets so the UI can update live.

## Recommended stack

- Python
- FastAPI
- Pydantic
- SQLAlchemy
- PostgreSQL
- WebSockets
- Redis later if faster tick/state handling is needed

## Backend architecture

The backend can be split into five major layers.

### API layer
Handles incoming requests from the frontend.

Responsibilities:
- create scenarios
- fetch scenario data
- start simulation runs
- fetch run results
- return agent details
- expose metrics
- open websocket connections

### Simulation layer
Runs the actual simulation loop.

Responsibilities:
- advance time
- apply world events
- call agent decision logic
- update locations and state
- compute aggregate metrics
- emit updates

### Agent layer
Contains the logic for agent cognition and action.

Responsibilities:
- observation
- memory retrieval
- option evaluation
- action selection
- replanning
- explanation generation
- reflection

### Service layer
Contains reusable backend services.

Examples:
- routing service
- event application service
- demand scoring service
- world update service
- persistence service
- websocket broadcast service

### Data layer
Handles persistence and schemas.

Stores:
- scenarios
- simulation runs
- neighborhoods
- agents
- event history
- aggregate metrics
- optional memory snapshots

## Simulation flow

A typical simulation run should work like this:

1. The frontend sends a scenario configuration.
2. The backend validates and stores the scenario.
3. The backend loads the selected neighborhood state.
4. The simulation initializes agents and environment conditions.
5. A tick loop begins.
6. On each tick:
   - simulation time advances
   - active events are applied
   - each agent observes its environment
   - each agent evaluates options
   - agents may keep their plan or replan
   - agents execute an action
   - world state is updated
   - metrics are recomputed
   - updates are streamed to the frontend
7. The simulation ends after a configured time horizon.
8. Final run results are stored.

## Agent logic design

The backend should keep agent behavior structured, not purely LLM-driven.

That means:
- routing should be algorithmic
- hard constraints should be deterministic
- scoring should be explicit where possible
- LLM usage should be limited to explanation, reflection, and possibly high-level replanning

### Recommended internal agent pipeline

Each tick, an agent should go through something like:

1. `observe()`
2. `retrieve_memory()`
3. `evaluate_options()`
4. `choose_action()`
5. `execute_action()`
6. `log_outcome()`
7. `reflect()` optionally after major events or at the end of the run

### Example observations
- current weather
- nearby congestion
- transit delay status
- venue wait estimates
- nearby agents or crowd density
- active closures

### Example action choices
- continue current route
- reroute
- delay departure
- switch destination
- cancel trip
- communicate with another agent

## World model

The backend should represent the neighborhood as a graph.

### Graph structure
Nodes can represent:
- intersections
- transit stations
- venues
- pickup zones
- landmarks

Edges can represent:
- walkable paths
- streets
- transit segments
- bike routes

Each node or edge can have dynamic properties such as:
- congestion level
- closure status
- weather penalty
- transit delay
- event-related crowd multiplier

## Suggested backend folder structure

```text
backend/
├── app/
│   ├── api/
│   │   ├── routes/
│   │   └── websocket.py
│   ├── core/
│   │   ├── config.py
│   │   └── database.py
│   ├── models/
│   ├── schemas/
│   ├── services/
│   ├── simulation/
│   ├── agents/
│   ├── utils/
│   └── main.py
├── tests/
├── requirements.txt
└── alembic/
```

## What each backend folder should contain

### `api/`
FastAPI routes and request handlers.

Examples:
- scenario routes
- simulation routes
- agent detail routes
- metrics routes
- websocket connection logic

### `core/`
App-wide configuration.

Examples:
- environment variables
- database connection setup
- settings management

### `models/`
SQLAlchemy database models.

Examples:
- Scenario
- SimulationRun
- Agent
- Event
- Neighborhood
- MetricSnapshot

### `schemas/`
Pydantic request and response schemas.

Examples:
- scenario input schema
- agent response schema
- run summary schema
- metrics payload schema

### `services/`
Reusable business logic.

Examples:
- routing service
- event processor
- metrics calculator
- broadcaster
- simulation persistence service

### `simulation/`
Core simulation engine code.

Examples:
- tick loop
- world state manager
- scheduler
- run controller

### `agents/`
Agent definitions and behavior logic.

Examples:
- persona classes
- memory handlers
- decision policies
- explanation logic
- reflection logic

## Suggested API endpoints

These do not need to be perfect on day one. They just provide a clean direction.

### Scenario endpoints
- `POST /scenarios` create a scenario
- `GET /scenarios/{id}` fetch scenario details
- `GET /scenarios` list scenarios

### Simulation endpoints
- `POST /simulations/start` start a simulation run
- `GET /simulations/{id}` fetch run summary
- `GET /simulations/{id}/state` fetch current simulation state
- `GET /simulations/{id}/metrics` fetch metrics

### Agent endpoints
- `GET /agents/{id}` fetch agent details
- `GET /simulations/{id}/agents` fetch agents in a run

### WebSocket endpoint
- `WS /ws/simulations/{id}` stream live run updates

## Database design direction

Keep the initial schema simple.

### Good starting tables
- `neighborhoods`
- `scenarios`
- `simulation_runs`
- `agents`
- `events`
- `metric_snapshots`

### Optional later tables
- `agent_memories`
- `agent_decisions`
- `world_state_snapshots`
- `venue_states`

## Real-time update strategy

Each simulation tick should produce a compact update payload for the frontend.

That payload might include:
- current simulated time
- moved agents and their new positions
- congestion deltas
- changed venue demand
- event state changes
- key metrics

The frontend should not need the full world reloaded on every tick.

## Important design decisions

### 1. Keep the simulation deterministic where possible
The backend should stay understandable and debuggable.

### 2. Use LLMs sparingly
Use them for:
- agent explanations
- memory summaries
- reflection summaries
- maybe high-level action reasoning

Do not use them for:
- shortest path calculations
- world state transitions
- hard constraints
- simple numeric scoring

### 3. Build for one neighborhood first
The backend should support multiple neighborhoods later, but the first version should stay small and focused.

### 4. Prefer clean state transitions
Every tick should clearly update:
- time
- world state
- agent state
- metrics

That will make debugging much easier.

## Example backend execution flow

A run might look like this:

- initialize Williamsburg neighborhood
- create 50 agents across a few persona types
- apply light rain at 6:15 PM
- apply L train delay at 6:20 PM
- run simulation in 5-minute ticks
- compute movement and congestion each tick
- stream live updates to frontend
- store final metrics and summaries

## First implementation priorities

The backend should be built in this order:

1. FastAPI app setup
2. database connection and models
3. scenario creation endpoint
4. neighborhood graph loader
5. basic agent model
6. simulation tick loop
7. simple decision policy
8. websocket update stream
9. metrics calculator
10. explanation layer

## Guiding principle

The backend does not need to simulate the entire city perfectly.

It needs to make agent behavior believable, simulation state consistent, and outputs useful enough for the frontend to tell a compelling story.

