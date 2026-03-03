import { ProFormaContext } from "../types";
import {
  getAllProgramsForJurisdiction,
  getProgramWithDetails,
  getStackingRules,
} from "./incentiveDb";
import {
  getAmiRentLimits,
  getHvacCosts,
  getConstructionCosts,
  getTaxRates,
  getRentComps,
} from "./marketData";
import { calculateTradeoff } from "./tradeoffEngine";
import { generateScenario } from "./scenarioPlanner";

export const toolDefinitions = [
  {
    name: "lookup_incentives",
    description:
      "Look up available incentive programs for a given location and project type. Returns a list of programs with eligibility status, estimated value, and requirements.",
    input_schema: {
      type: "object" as const,
      properties: {
        location: {
          type: "string",
          description: "City and state (e.g. 'Denver, CO')",
        },
        propertyType: {
          type: "string",
          description: "Type of property (e.g. 'multifamily', 'hotel_conversion')",
        },
        projectCost: {
          type: "number",
          description: "Total project cost (purchase + renovation)",
        },
        unitCount: {
          type: "number",
          description: "Number of residential units",
        },
        yearBuilt: {
          type: "number",
          description: "Year the building was originally constructed",
        },
        conversionType: {
          type: "string",
          description: "Type of conversion (e.g. 'hotel_to_residential')",
        },
      },
      required: ["location"],
    },
  },
  {
    name: "check_qualification_gap",
    description:
      "Check what specific changes are needed for a project to qualify for a given incentive program. Returns the gap analysis with required modifications.",
    input_schema: {
      type: "object" as const,
      properties: {
        incentiveId: {
          type: "string",
          description: "The ID of the incentive program to check",
        },
        currentProForma: {
          type: "object",
          description: "Current pro forma values to check against eligibility rules",
        },
      },
      required: ["incentiveId"],
    },
  },
  {
    name: "get_market_data",
    description:
      "Get location-specific market data including AMI rent limits, HVAC costs, construction costs, tax rates, and rent comps.",
    input_schema: {
      type: "object" as const,
      properties: {
        location: {
          type: "string",
          description: "City name (e.g. 'Denver')",
        },
        dataType: {
          type: "string",
          enum: [
            "ami_levels",
            "rent_comps",
            "hvac_costs",
            "construction_costs",
            "tax_rates",
          ],
          description: "Type of market data to retrieve",
        },
      },
      required: ["location", "dataType"],
    },
  },
  {
    name: "calculate_tradeoff",
    description:
      "Calculate the full cost/benefit tradeoff for a specific incentive program given the current pro forma. Returns additional costs, incentive value, net benefit, and affected cells.",
    input_schema: {
      type: "object" as const,
      properties: {
        incentiveId: {
          type: "string",
          description: "The ID of the incentive program",
        },
        requiredChanges: {
          type: "object",
          description: "Any specific changes being considered for qualification",
        },
      },
      required: ["incentiveId"],
    },
  },
  {
    name: "generate_scenario",
    description:
      "Generate a complete set of pro forma cell changes for applying one or more incentives. Checks stacking rules and calculates net impact on returns.",
    input_schema: {
      type: "object" as const,
      properties: {
        incentiveIds: {
          type: "array",
          items: { type: "string" },
          description: "Array of incentive program IDs to apply",
        },
        targetScenarioColumn: {
          type: "string",
          description: "Target column in the spreadsheet (e.g. 'H' for Scenario 2)",
        },
      },
      required: ["incentiveIds"],
    },
  },
  {
    name: "compare_scenarios",
    description:
      "Compare two scenarios side-by-side, showing differences in IRR, equity multiple, cash-on-cash, DSCR, total equity needed, and NOI.",
    input_schema: {
      type: "object" as const,
      properties: {
        scenarioA: {
          type: "object",
          description: "First scenario returns (or 'base' to use current pro forma)",
        },
        scenarioB: {
          type: "object",
          description: "Second scenario returns",
        },
      },
      required: ["scenarioA", "scenarioB"],
    },
  },
];

export async function handleToolCall(
  toolName: string,
  input: Record<string, unknown>,
  proFormaContext: ProFormaContext
): Promise<unknown> {
  switch (toolName) {
    case "lookup_incentives": {
      const location = (input.location as string) || "Denver, CO";
      const parts = location.split(",").map((p) => p.trim());
      const city = parts[0] || "Denver";
      const state = parts[1] || "CO";

      const programs = await getAllProgramsForJurisdiction(state, city);
      return programs.map((p) => ({
        id: p.id,
        name: p.name,
        jurisdiction: p.jurisdiction.name,
        category: p.category,
        creditRate: p.creditRate ? Number(p.creditRate) : null,
        description: p.description,
        isActive: p.isActive,
        rulesCount: p.eligibilityRules.length,
        tradeoffsCount: p.tradeoffs.length,
      }));
    }

    case "check_qualification_gap": {
      const incentiveId = input.incentiveId as string;
      const program = await getProgramWithDetails(incentiveId);
      if (!program) return { error: `Program ${incentiveId} not found` };

      const gaps = [];
      for (const rule of program.eligibilityRules) {
        gaps.push({
          rule: rule.ruleType,
          description: rule.description,
          operator: rule.operator,
          threshold: rule.thresholdValue,
          fieldReference: rule.fieldReference,
          isHardRequirement: rule.isHardRequirement,
        });
      }

      return {
        programName: program.name,
        totalRules: program.eligibilityRules.length,
        rules: gaps,
        tradeoffs: program.tradeoffs.map((t) => ({
          type: t.tradeoffType,
          category: t.affectedCategory,
          description: t.description,
          costMultiplier: t.costMultiplier ? Number(t.costMultiplier) : null,
          fixedCost: t.fixedCost ? Number(t.fixedCost) : null,
        })),
      };
    }

    case "get_market_data": {
      const location = (input.location as string) || "Denver";
      const dataType = input.dataType as string;

      switch (dataType) {
        case "ami_levels":
          return await getAmiRentLimits(location);
        case "rent_comps":
          return await getRentComps(location);
        case "hvac_costs":
          return await getHvacCosts(location);
        case "construction_costs":
          return await getConstructionCosts(location);
        case "tax_rates":
          return await getTaxRates(location);
        default:
          return { error: `Unknown data type: ${dataType}` };
      }
    }

    case "calculate_tradeoff": {
      const incentiveId = input.incentiveId as string;
      const program = await getProgramWithDetails(incentiveId);
      if (!program) return { error: `Program ${incentiveId} not found` };

      return await calculateTradeoff(program, proFormaContext);
    }

    case "generate_scenario": {
      const incentiveIds = (input.incentiveIds as string[]) || [];
      const targetColumn = (input.targetScenarioColumn as string) || proFormaContext.scenarioColumn || "H";

      return await generateScenario(incentiveIds, proFormaContext, targetColumn);
    }

    case "compare_scenarios": {
      const scenarioA = input.scenarioA as Record<string, number>;
      const scenarioB = input.scenarioB as Record<string, number>;

      const metrics = [
        "irr",
        "equityMultiple",
        "cashOnCash",
        "dscr",
        "totalEquityNeeded",
        "noi",
        "totalIncentiveValue",
      ];

      const comparison: Record<string, { a: number; b: number; delta: number; pctChange: string }> = {};
      for (const metric of metrics) {
        const a = scenarioA[metric] || 0;
        const b = scenarioB[metric] || 0;
        const delta = b - a;
        const pctChange = a !== 0 ? `${((delta / a) * 100).toFixed(1)}%` : "N/A";
        comparison[metric] = { a, b, delta, pctChange };
      }

      return { comparison };
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}
