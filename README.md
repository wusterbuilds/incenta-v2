# Incenta - Excel Add-in for Incentive Optimization

Real estate incentive optimizer that runs as an Excel Office Add-in. Helps developers find, evaluate, and stack government incentives (tax credits, abatements, grants) directly in their pro forma spreadsheet.

## Architecture

- **Excel Add-in** (React + TypeScript): Cursor-style chat panel inside Excel task pane
- **Backend** (Express + TypeScript): API server with Claude AI integration and incentive logic
- **Database** (Docker Postgres + Prisma): Normalized schema for incentive programs, eligibility rules, tradeoffs, stacking rules, and market data

## Prerequisites

- Node.js 18+
- Docker Desktop
- Excel (desktop or web) for sideloading the add-in

## Quick Start

### 1. Start the database

```bash
docker compose up -d
```

### 2. Set up the backend

```bash
cd server
npm install
npx prisma migrate dev
npx tsx prisma/seed.ts   # Seeds Denver demo data
npm run dev              # Starts on port 4000
```

### 3. Set up the add-in

```bash
cd addin
npm install
npm run dev              # Starts webpack dev server on https://localhost:3000
```

### 4. Sideload into Excel

```bash
cd addin
npx office-addin-debugging start manifest.xml
```

Or manually sideload `manifest.xml` via Excel > Insert > My Add-ins > Upload My Add-in.

## Environment Variables

Create `server/.env`:

```
DATABASE_URL="postgresql://incenta:incenta_dev@localhost:5433/incenta?schema=public"
ANTHROPIC_API_KEY="sk-ant-your-key-here"  # Optional, falls back to mock responses
PORT=4000
```

## Demo Flow

1. Open the masked pro forma template (`proforma_template_MASKED.xlsx`) in Excel
2. Open the Incenta task pane from the ribbon
3. Click **Run Incentive Audit** for a one-click analysis
4. Review qualified programs, near-miss opportunities with tradeoff costs
5. Click **Apply This Scenario** to write changes to the spreadsheet
6. Each modified cell gets annotations (comments + color-coded borders)
7. Chat with the AI to explore tradeoffs or generate alternative scenarios
8. Click **Undo** to revert all changes

## Project Structure

```
incenta-v2/
  docker-compose.yml
  addin/
    manifest.xml
    webpack.config.js
    src/taskpane/
      App.tsx                    # Main app orchestrator
      theme.ts                   # Color palette
      components/
        ChatPanel.tsx            # Chat message list + input
        MessageBubble.tsx        # Rich message renderer
        IncentiveAuditButton.tsx # One-click audit trigger
        AuditResults.tsx         # Qualified/Near-Miss/N-A tiers
        IncentiveCard.tsx        # Single incentive program card
        TradeoffView.tsx         # Cost vs benefit analysis
        ScenarioComparison.tsx   # Before/after returns table
        ChangelogPanel.tsx       # Cell changes with Apply/Undo
        CellChangeAnnotation.tsx # Individual cell change display
      services/
        excel.ts                 # Office.js read/write
        cellAnnotator.ts         # Comments + border annotations
        api.ts                   # Backend API client
  server/
    prisma/
      schema.prisma              # Normalized DB schema
      seed.ts                    # Denver demo data
    src/
      index.ts                   # Express server
      routes/
        agent.ts                 # POST /agent/chat
        audit.ts                 # POST /agent/audit
      services/
        claude.ts                # Anthropic API + tool use
        mockAgent.ts             # Demo fallback responses
        tools.ts                 # 6 Claude tool definitions
        incentiveDb.ts           # Prisma DB queries
        tradeoffEngine.ts        # Net cost/benefit calculator
        scenarioPlanner.ts       # Pro forma scenario generator
        marketData.ts            # Location-aware data lookups
```

## Color Theme

| Role | Hex | Usage |
|------|-----|-------|
| Primary | `#606165` | Headers, primary buttons |
| Secondary | `#727074` | Borders, secondary text |
| Surface | `#aea9a4` | Card backgrounds, hover |
| Muted | `#969a98` | Disabled states, dividers |
| Warm | `#928888` | Accent, active states, incentive badges |
