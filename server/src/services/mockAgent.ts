import { AuditResult, ProFormaContext } from "../types";

export function getMockResponse(
  message: string,
  proFormaContext: ProFormaContext
): { role: "assistant"; content: string; data?: unknown } {
  const lower = message.toLowerCase();

  if (lower.includes("problem") || lower.includes("issue") || lower.includes("fix")) {
    return {
      role: "assistant",
      content: `Looking at your ${proFormaContext.totalUnits}-unit project at ${proFormaContext.address}, I found two issues:\n\n**Income assumptions**: Your 1BR projected rents are 12% above current AMI limits for this area. The Income tab needs updating to reflect market-accurate rent levels.\n\n**Cost assumptions**: Administration costs at $38K are roughly 2x what comparable projects in this market have paid. You may want to rebid or verify these estimates.\n\nWould you like me to explain either of these in more detail?`,
    };
  }

  if (lower.includes("opportunity") || lower.includes("savings") || lower.includes("program")) {
    return {
      role: "assistant",
      content: `I've identified two opportunities for this project:\n\n**MassWorks Infrastructure Program**: Based on your location and unit count, you likely qualify for this program. It could offset ~$350K in site infrastructure costs. Deadline is March 2026.\n\n**Zoning upside**: This parcel is in a transit overlay district. Reducing parking from 1.0 to 0.5 spaces per unit could save approximately $1.2M in construction cost.\n\nWould you like me to apply either of these as a scenario to your pro forma?`,
    };
  }

  if (lower.includes("scenario") || lower.includes("apply") || lower.includes("write")) {
    return {
      role: "assistant",
      content: `I can apply opportunity scenarios to your pro forma. Each scenario creates a new column preserving your original data.\n\n**Available scenarios:**\n1. MassWorks Infrastructure — $350K grant offset\n2. Parking Reduction — $1.2M construction savings\n\nClick **"Apply Scenario"** on any opportunity card in the audit results, or ask me to apply a specific one.`,
    };
  }

  return {
    role: "assistant",
    content: `I'm your pro forma audit assistant. I can help you:\n\n1. **Find problems** — flag unrealistic assumptions, above-market costs, and data issues\n2. **Spot opportunities** — identify missing programs, zoning advantages, and cost savings\n3. **Apply scenarios** — write optimized columns directly to your spreadsheet\n\nYour project: ${proFormaContext.totalUnits}-unit project at ${proFormaContext.address}.\n\nTry clicking the **Pro Forma Audit** button for a comprehensive analysis, or ask me a question.`,
  };
}

export function getMockAuditResult(proFormaContext: ProFormaContext): AuditResult {
  const col = proFormaContext.scenarioColumn || "N";

  return {
    projectSummary: `${proFormaContext.totalUnits}-unit project at ${proFormaContext.address || "Denver, CO"}. Purchase: $${(proFormaContext.purchasePrice / 1_000_000).toFixed(1)}M, Renovation: $${(proFormaContext.renovationBudget / 1_000).toFixed(0)}K.`,
    problems: [
      {
        id: "mock-problem-income",
        type: "problem",
        title: "Income assumptions",
        description:
          "Projected rents on 1BR units are 12% above current AMI limits for this area. Income tab needs updating.",
        affectedCells: [{ sheet: "Unit Mix", cell: "L15" }],
      },
      {
        id: "mock-problem-cost",
        type: "problem",
        title: "Cost assumptions",
        description:
          "Administration costs at $38K are roughly 2x compared to your last three comparable projects in this market.",
        affectedCells: [{ sheet: "Stable Monthly", cell: "F58" }],
      },
    ],
    opportunities: [
      {
        id: "mock-opp-massworks",
        type: "opportunity",
        title: "Missing program",
        description:
          "You are not capturing MassWorks Infrastructure Program. Based on your location and unit count you likely qualify. Deadline March 2026.",
        affectedCells: [{ sheet: "Stable Monthly", cell: `${col}31` }],
        scenario: {
          name: "MassWorks Infrastructure",
          description: "Apply MassWorks Infrastructure Program grant to offset site infrastructure costs.",
          incentives: ["MassWorks Infrastructure Program"],
          changes: [
            {
              sheet: "Stable Monthly",
              cell: `${col}31`,
              oldValue: null,
              newValue: 350_000,
              reason: "MassWorks Infrastructure Program grant",
              category: "beneficial",
              incentiveName: "MassWorks Infrastructure Program",
            },
          ],
          returns: {
            irr: 0.172,
            equityMultiple: 2.1,
            cashOnCash: 0.118,
            dscr: 1.48,
            totalEquityNeeded: 2_100_000,
            noi: 980_000,
            totalIncentiveValue: 350_000,
          },
        },
      },
      {
        id: "mock-opp-zoning",
        type: "opportunity",
        title: "Zoning upside",
        description:
          "This parcel is in a transit overlay district. Reducing parking from 1.0 to 0.5 spaces per unit could save approximately $1.2M in construction cost.",
        affectedCells: [{ sheet: "Stable Monthly", cell: `${col}16` }],
        scenario: {
          name: "Parking Reduction",
          description: "Reduce parking ratio under transit overlay zoning, saving ~$1.2M.",
          incentives: ["Transit Overlay Parking Reduction"],
          changes: [
            {
              sheet: "Stable Monthly",
              cell: `${col}16`,
              oldValue: proFormaContext.renovationBudget,
              newValue: proFormaContext.renovationBudget - 1_200_000,
              reason: "Parking reduction from 1.0 to 0.5 spaces/unit",
              category: "beneficial",
              incentiveName: "Transit Overlay Parking Reduction",
            },
          ],
          returns: {
            irr: 0.198,
            equityMultiple: 2.28,
            cashOnCash: 0.138,
            dscr: 1.52,
            totalEquityNeeded: 1_600_000,
            noi: 980_000,
            totalIncentiveValue: 1_200_000,
          },
        },
      },
    ],
  };
}
