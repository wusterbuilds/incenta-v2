import { Router, Request, Response } from "express";
import { ProFormaContext, AuditResult, AuditFlag, ScenarioResult } from "../types";

const router = Router();

function buildDemoFlags(ctx: ProFormaContext): AuditResult {
  const col = ctx.scenarioColumn || "N";

  const problems: AuditFlag[] = [
    {
      id: "problem-income-assumptions",
      type: "problem",
      title: "Income assumptions",
      description:
        "Projected rents on 1BR units are 12% above current AMI limits for this area. Income tab needs updating.",
      affectedCells: [
        { sheet: "Unit Mix", cell: "L15" },
      ],
    },
    {
      id: "problem-cost-assumptions",
      type: "problem",
      title: "Cost assumptions",
      description:
        "Administration costs at $38K are roughly 2x compared to your last three comparable projects in this market.",
      affectedCells: [
        { sheet: "Stable Monthly", cell: "F58" },
      ],
    },
  ];

  const opportunities: AuditFlag[] = [
    {
      id: "opportunity-missing-program",
      type: "opportunity",
      title: "Missing program",
      description:
        "You are not capturing MassWorks Infrastructure Program. Based on your location and unit count you likely qualify. Deadline March 2026.",
      affectedCells: [
        { sheet: "Stable Monthly", cell: `${col}31` },
      ],
      scenario: {
        name: "MassWorks Infrastructure",
        description:
          "Apply MassWorks Infrastructure Program grant to offset site infrastructure costs.",
        incentives: ["MassWorks Infrastructure Program"],
        changes: [
          {
            sheet: "Stable Monthly",
            cell: `${col}31`,
            oldValue: null,
            newValue: 350_000,
            reason: "MassWorks Infrastructure Program grant for qualifying site work",
            category: "beneficial",
            incentiveName: "MassWorks Infrastructure Program",
          },
          {
            sheet: "Stable Monthly",
            cell: `${col}16`,
            oldValue: ctx.renovationBudget,
            newValue: Math.max(ctx.renovationBudget - 350_000, 0),
            reason: "Infrastructure costs offset by MassWorks grant",
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
      id: "opportunity-zoning-upside",
      type: "opportunity",
      title: "Zoning upside",
      description:
        "This parcel is in a transit overlay district. Reducing parking from 1.0 to 0.5 spaces per unit could save approximately $1.2M in construction cost.",
      affectedCells: [
        { sheet: "Stable Monthly", cell: `${col}16` },
      ],
      scenario: {
        name: "Parking Reduction",
        description:
          "Reduce parking ratio from 1.0 to 0.5 spaces/unit under transit overlay zoning, saving ~$1.2M in construction.",
        incentives: ["Transit Overlay Parking Reduction"],
        changes: [
          {
            sheet: "Stable Monthly",
            cell: `${col}16`,
            oldValue: ctx.renovationBudget,
            newValue: ctx.renovationBudget - 1_200_000,
            reason: "Parking reduction from 1.0 to 0.5 spaces/unit saves ~$1.2M construction cost",
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
  ];

  return {
    projectSummary: `${ctx.totalUnits}-unit project at ${ctx.address}. Purchase: $${(ctx.purchasePrice / 1_000_000).toFixed(1)}M, Renovation: $${(ctx.renovationBudget / 1_000).toFixed(0)}K.`,
    problems,
    opportunities,
  };
}

router.post("/audit", async (req: Request, res: Response) => {
  try {
    const { proFormaContext } = req.body as { proFormaContext: ProFormaContext };

    if (!proFormaContext) {
      res.status(400).json({ error: "proFormaContext is required" });
      return;
    }

    const auditResult = buildDemoFlags(proFormaContext);
    res.json(auditResult);
  } catch (error) {
    console.error("Audit error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
