# What-If NYC

What-If NYC is a multi-agent urban simulation platform that models how people and city systems react when urban conditions change.

Instead of showing static traffic or mobility data, the platform simulates how different types of agents across a neighborhood respond to disruptions and changes such as rain, subway delays, street closures, event endings, bike-lane additions, and new venue openings. Each agent has its own goals, preferences, constraints, and memory, which allows the system to generate more realistic movement, routing, and demand shifts.

The goal is to make the city feel like a living system where individuals and organizations continuously observe, plan, react, and adapt.

## Why this project matters

Cities are full of second-order effects.

A delayed subway line does not only affect train riders. It can increase street congestion, shift foot traffic to nearby venues, create delivery slowdowns, overload alternate transit paths, and change neighborhood demand patterns. Most tools are not built to simulate that chain of reactions in a way that is both interactive and explainable.

What-If NYC is designed to answer a simple but powerful question:

**What happens next when the city changes?**

## Core idea

Users can introduce a change into a city environment and watch a set of AI-driven agents react in real time.

Examples of scenario changes:

* heavy rain starts during rush hour
* a subway line is delayed
* a concert or sports event ends
* a street is closed
* a temporary bike lane is added
* a pop-up market opens

Agents representing different urban roles then adapt their plans.

Example agent types:

* commuter
* student
* tourist
* delivery worker
* nightlife-goer
* small business operator
* transit operator

The system then shows the downstream effects, such as:

* route changes
* crowd movement
* congestion hotspots
* venue demand shifts
* neighborhood spillover
* agent-by-agent explanations of why decisions changed

## Main use cases

### City planning and mobility analysis

Test how disruptions or infrastructure changes affect movement, congestion, and demand before those changes happen in real life.

### Event operations

Simulate crowd exit waves, transit overload, and spillover movement after concerts, games, or nightlife events.

### Business and venue strategy

Estimate how nearby disruptions, weather, or events change customer foot traffic, staffing needs, and demand.

### Logistics and delivery operations

Model how couriers and routing patterns respond to closures, congestion, and weather.

## What makes it agentic

This is not just a rules-based map simulation.

Each agent can:

* observe the local environment
* remember past experiences
* plan actions based on goals and constraints
* replan when conditions change
* explain why it made a decision
* reflect on outcomes and adapt over time

This makes the platform feel more like a real urban behavior engine than a simple dashboard.

## Feature overview

### Scenario controls

Users can toggle or configure urban events and conditions.

Examples:

* weather changes
* transit disruptions
* venue openings and closings
* road or sidewalk closures
* bike-lane additions
* event ending times

### Multi-agent simulation

The platform simulates multiple agents with different priorities, preferences, and behaviors.

### Live city-state updates

The simulation updates over time and shows how movement and demand shift as agents respond.

### Explainability layer

Users can inspect an agent and see:

* what it observed
* what memory or preference mattered
* what options it considered
* why it chose a new route or destination

### Aggregate analytics

The platform surfaces city-level outputs such as:

* foot traffic intensity
* congestion hotspots
* route flow changes
* venue demand changes
* before vs after comparisons

## High-level architecture

The project is split into a frontend and backend.

### Frontend

The frontend is responsible for:

* rendering the neighborhood map
* showing scenario controls
* displaying agent cards and analytics panels
* visualizing movement, crowding, and demand changes
* receiving real-time simulation updates

### Backend

The backend is responsible for:

* storing and loading scenarios
* maintaining world state
* running the simulation engine
* managing agent behavior and memory
* applying events and disruptions
* computing metrics and aggregate outputs
* streaming updates to the frontend

## Tech stack

### Frontend

* React.js
* Mapbox GL JS
* Zustand
* Recharts

### Backend

* Python
* FastAPI
* Pydantic
* SQLAlchemy
* WebSockets

### Data and infrastructure

* PostgreSQL
* Redis (optional later for fast real-time state)
* Docker Compose for local development

## Repo structure

```text
what-if-nyc/
├── frontend/
├── backend/
├── shared/
├── docker-compose.yml
├── README.md
└── .gitignore
```

### Suggested folder purpose

* `frontend/` contains the UI, map views, controls, and visualization logic
* `backend/` contains the APIs, simulation engine, agent logic, and data models
* `shared/` contains sample data, shared schemas, and project docs

## How the product works

1. A user chooses a neighborhood and configures a scenario.
2. The backend applies the new city conditions.
3. Agents observe the updated world.
4. Each agent evaluates options using goals, preferences, constraints, and memory.
5. Agents replan and act.
6. The simulation updates the city state.
7. The frontend visualizes both individual and aggregate outcomes.

## Example scenario

A user simulates the following situation:

* light rain begins at 6:15 PM
* the L train is delayed by 20 minutes
* a concert ends at 10:30 PM
* one nearby street is closed

Possible outcomes:

* commuters reroute away from the delayed station
* nightlife-goers shift to alternate venues
* delivery workers avoid congested blocks
* nearby businesses see an increase in walk-in demand
* crowding spreads into adjacent streets

## Why this is compelling

What-If NYC combines:

* urban systems thinking
* multi-agent reasoning
* real-time simulation
* explainability
* interactive visual storytelling

It is both a technically interesting system and a product with clear real-world applications.

## Development goals

### Phase 1

* set up monorepo
* initialize frontend and backend
* render a small neighborhood map
* define basic scenario inputs
* define initial agent types

### Phase 2

* build simulation loop
* add event toggles
* create agent decision logic
* connect frontend to backend

### Phase 3

* add real-time updates
* add analytics and comparison views
* add explanation panels
* improve realism and behavior diversity

## Running the project

This section will be filled in as the repos are initialized.

Planned commands will likely include:

```bash
# frontend
cd frontend
npm install
npm run dev

# backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Team alignment

This project should stay focused on one main principle:

**Make the agents believable, and the rest of the system becomes impressive naturally.**

The map, UI, and analytics should all support that core idea.
