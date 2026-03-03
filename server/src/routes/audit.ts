import { Router, Request, Response } from "express";
import { getAllProgramsForJurisdiction, getStackingRules } from "../services/incentiveDb";
import { getAmiRentLimits } from "../services/marketData";
import { calculateTradeoff } from "../services/tradeoffEngine";
import { generateScenario } from "../services/scenarioPlanner";
import { getMockAuditResult } from "../services/mockAgent";
import {
  ProFormaContext,
  AuditResult,
  IncentiveProgramResult,
  EligibilityGap,
  TradeoffSummary,
  ProgramWithRelations,
} from "../types";

const router = Router();

function parseLocation(address: string): { state: string; city: string } {
  const parts = address.split(",").map((p) => p.trim());
  const stateZip = parts[parts.length - 1] || "";
  const state = stateZip.split(" ")[0] || "CO";
  const city = parts[parts.length - 2] || "Denver";
  return { state, city };
}

function thresholdToString(val: unknown): string {
  if (val === null || val === undefined) return "N/A";
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (Array.isArray(val)) return val.join(", ");
  if (typeof val === "object") {
    const entries = Object.entries(val as Record<string, unknown>);
    return entries.map(([k, v]) => `${k}: ${v}`).join(", ");
  }
  return JSON.stringify(val);
}

function evaluateRule(
  rule: ProgramWithRelations["eligibilityRules"][0],
  context: ProFormaContext
): { passes: boolean; gap: EligibilityGap | null } {
  const { ruleType, thresholdValue, description } = rule;
  const threshold = thresholdValue as Record<string, unknown>;

  switch (ruleType) {
    case "property_type": {
      return { passes: true, gap: null };
    }

    case "building_age": {
      const maxYear = (threshold as { max_year?: number }).max_year;
      return {
        passes: true,
        gap: null,
      };
    }

    case "unit_mix": {
      const pctRequired = (threshold as { pct_units_at_ami?: number }).pct_units_at_ami || 0.2;
      const amiLevel = (threshold as { ami_level?: number }).ami_level || 0.8;
      return {
        passes: false,
        gap: {
          ruleDescription: description,
          currentValue: "0% of units at restricted rents",
          requiredValue: `${(pctRequired * 100).toFixed(0)}% of units at ${(amiLevel * 100).toFixed(0)}% AMI`,
          gapSeverity: "moderate",
        },
      };
    }

    case "energy": {
      const required = typeof threshold === "string" ? threshold : thresholdToString(threshold);
      return {
        passes: false,
        gap: {
          ruleDescription: description,
          currentValue: "Standard HVAC/envelope",
          requiredValue: required.replace(/_/g, " "),
          gapSeverity: "moderate",
        },
      };
    }

    case "location": {
      const required = typeof threshold === "string"
        ? threshold
        : (threshold as { type?: string }).type || thresholdToString(threshold);
      const readable = required.replace(/_/g, " ");

      if (typeof threshold === "boolean") {
        return {
          passes: false,
          gap: {
            ruleDescription: description,
            currentValue: "Unverified for this location",
            requiredValue: "Must be verified",
            gapSeverity: "major",
          },
        };
      }

      const passes = context.address.toLowerCase().includes(readable.toLowerCase());
      return {
        passes,
        gap: passes
          ? null
          : {
              ruleDescription: description,
              currentValue: context.address,
              requiredValue: readable,
              gapSeverity: "major",
            },
      };
    }

    case "cost_threshold": {
      const minRatio = (threshold as { min_ratio?: number }).min_ratio || 0;
      const totalCost = context.purchasePrice + context.renovationBudget;
      const passes = minRatio > 0 ? context.renovationBudget >= context.purchasePrice * minRatio : true;
      return {
        passes,
        gap: passes
          ? null
          : {
              ruleDescription: description,
              currentValue: `Renovation: $${context.renovationBudget.toLocaleString()}`,
              requiredValue: `>= $${(context.purchasePrice * minRatio).toLocaleString()} (${(minRatio * 100).toFixed(0)}% of basis)`,
              gapSeverity: "minor",
            },
      };
    }

    default: {
      return { passes: true, gap: null };
    }
  }
}

function evaluateEligibility(
  program: ProgramWithRelations,
  context: ProFormaContext
): { status: "qualified" | "near_miss" | "not_applicable"; gaps: EligibilityGap[] } {
  const gaps: EligibilityGap[] = [];
  let hasHardFailure = false;
  let failCount = 0;

  for (const rule of program.eligibilityRules) {
    const { passes, gap } = evaluateRule(rule, context);
    if (!passes && gap) {
      gaps.push(gap);
      failCount++;
      if (rule.isHardRequirement && gap.gapSeverity === "major") {
        hasHardFailure = true;
      }
    }
  }

  if (failCount === 0) return { status: "qualified", gaps: [] };
  if (hasHardFailure && failCount > 2) return { status: "not_applicable", gaps };
  return { status: "near_miss", gaps };
}

function estimateIncentiveValue(
  program: ProgramWithRelations,
  context: ProFormaContext
): number {
  const rate = program.creditRate ? Number(program.creditRate) : 0;
  const basis = program.calculationBasis || "renovation_budget";

  switch (basis) {
    case "renovation_budget":
      return context.renovationBudget * rate;
    case "qualified_rehabilitation_expenditures":
      return context.renovationBudget * rate;
    case "eligible_basis":
      return (context.purchasePrice + context.renovationBudget) * rate * 0.9;
    case "per_unit":
      return context.totalUnits * rate;
    case "property_tax":
      return context.purchasePrice * 0.02 * rate * 10;
    case "capital_gains":
      return context.purchasePrice * 0.15 * rate;
    default:
      return context.renovationBudget * rate;
  }
}

router.post("/audit", async (req: Request, res: Response) => {
  try {
    const { proFormaContext } = req.body as { proFormaContext: ProFormaContext };

    if (!proFormaContext) {
      res.status(400).json({ error: "proFormaContext is required" });
      return;
    }

    let programs: ProgramWithRelations[];
    try {
      const { state, city } = parseLocation(proFormaContext.address);
      programs = await getAllProgramsForJurisdiction(state, city);
    } catch (dbError) {
      console.warn("DB unavailable, using mock audit:", dbError);
      const mockResult = getMockAuditResult(proFormaContext);
      res.json(mockResult);
      return;
    }

    if (programs.length === 0) {
      const mockResult = getMockAuditResult(proFormaContext);
      res.json(mockResult);
      return;
    }

    const qualified: IncentiveProgramResult[] = [];
    const nearMiss: IncentiveProgramResult[] = [];
    const notApplicable: IncentiveProgramResult[] = [];

    for (const program of programs) {
      const { status, gaps } = evaluateEligibility(program, proFormaContext);
      const estimatedValue = estimateIncentiveValue(program, proFormaContext);

      const tradeoffSummaries: TradeoffSummary[] = [];
      for (const td of program.tradeoffs) {
        let costDelta = 0;
        if (td.costMultiplier) {
          costDelta = proFormaContext.renovationBudget * (Number(td.costMultiplier) - 1);
        } else if (td.fixedCost) {
          costDelta = Number(td.fixedCost);
        }
        tradeoffSummaries.push({
          type: td.tradeoffType,
          description: td.description,
          costDelta,
          affectedCells: td.affectedProFormaCells?.split(",").map((c) => c.trim()) || [],
        });
      }

      const result: IncentiveProgramResult = {
        id: program.id,
        name: program.name,
        jurisdiction: program.jurisdiction.name,
        category: program.category,
        creditRate: program.creditRate ? Number(program.creditRate) : null,
        description: program.description,
        estimatedValue,
        qualificationStatus: status,
        eligibilityGaps: gaps,
        tradeoffs: tradeoffSummaries,
      };

      if (status === "qualified") qualified.push(result);
      else if (status === "near_miss") nearMiss.push(result);
      else notApplicable.push(result);
    }

    const qualifiedIds = qualified.map((q) => q.id);
    let qualifiedScenario = null;

    if (qualifiedIds.length > 0) {
      try {
        qualifiedScenario = await generateScenario(
          qualifiedIds,
          proFormaContext,
          proFormaContext.scenarioColumn || "H"
        );
      } catch {
        qualifiedScenario = null;
      }
    }

    const nearMissScenarios = [];
    for (const nm of nearMiss) {
      try {
        const scenario = await generateScenario(
          [...qualifiedIds, nm.id],
          proFormaContext,
          proFormaContext.scenarioColumn || "H"
        );
        nearMissScenarios.push(scenario);
      } catch {
        // Skip scenarios that fail to generate
      }
    }

    const auditResult: AuditResult = {
      projectSummary: `${proFormaContext.totalUnits}-unit conversion at ${proFormaContext.address}. Purchase: $${(proFormaContext.purchasePrice / 1_000_000).toFixed(1)}M, Renovation: $${(proFormaContext.renovationBudget / 1_000).toFixed(0)}K.`,
      qualified,
      nearMiss,
      notApplicable,
      qualifiedScenario,
      nearMissScenarios,
    };

    res.json(auditResult);
  } catch (error) {
    console.error("Audit error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
