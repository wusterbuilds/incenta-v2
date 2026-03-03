import { CellChange, ProFormaContext, TradeoffResult, ProgramWithRelations } from "../types";
import { getAmiRentLimits, getHvacCosts, getConstructionCosts } from "./marketData";

function parseLocation(address: string): string {
  const parts = address.split(",").map((p) => p.trim());
  return parts[parts.length - 2] || "Denver";
}

function parseCellRef(ref: string): { sheet: string; cell: string } {
  if (ref.includes("!")) {
    const [sheet, cell] = ref.split("!");
    return { sheet, cell };
  }
  return { sheet: "Stable Monthly", cell: ref };
}

export async function calculateTradeoff(
  program: ProgramWithRelations,
  proFormaContext: ProFormaContext,
  marketData?: Record<string, unknown>
): Promise<TradeoffResult> {
  const city = parseLocation(proFormaContext.address);
  let totalAdditionalCosts = 0;
  const affectedCells: CellChange[] = [];

  for (const tradeoff of program.tradeoffs) {
    switch (tradeoff.tradeoffType) {
      case "cost_increase": {
        let costIncrease = 0;
        if (tradeoff.costMultiplier) {
          const multiplier = Number(tradeoff.costMultiplier);
          costIncrease = proFormaContext.renovationBudget * (multiplier - 1);
        } else if (tradeoff.fixedCost) {
          costIncrease = Number(tradeoff.fixedCost);
        }

        if (
          tradeoff.marketDataKey === "hvac_energy_star_premium" ||
          tradeoff.affectedCategory === "renovation"
        ) {
          const hvac = await getHvacCosts(city);
          if (hvac && tradeoff.marketDataKey === "hvac_energy_star_premium") {
            const perUnitDelta = hvac.energyStar - hvac.standard;
            costIncrease = perUnitDelta * proFormaContext.totalUnits;
          }
        }

        if (tradeoff.marketDataKey === "historic_materials_premium") {
          const construction = await getConstructionCosts(city);
          if (construction) {
            costIncrease = proFormaContext.renovationBudget * construction.historicPremium;
          }
        }

        totalAdditionalCosts += costIncrease;

        const rawCells = tradeoff.affectedProFormaCells?.split(",").map((c) => c.trim()) || [];
        for (const raw of rawCells) {
          const { sheet, cell } = parseCellRef(raw);
          affectedCells.push({
            sheet,
            cell,
            oldValue: proFormaContext.renovationBudget,
            newValue: proFormaContext.renovationBudget + costIncrease,
            reason: tradeoff.description,
            category: "tradeoff",
            incentiveName: program.name,
          });
        }
        break;
      }

      case "revenue_decrease": {
        const ami = await getAmiRentLimits(city);
        if (!ami) break;

        let annualRevenueReduction = 0;
        const amiLimits80 = Object.values(ami).map((v) => v.maxRent80pct);
        const avgAmiRent = amiLimits80.length > 0
          ? amiLimits80.reduce((a, b) => a + b, 0) / amiLimits80.length
          : 1120;

        for (const unit of proFormaContext.rents) {
          if (unit.rent > avgAmiRent) {
            const restrictedUnits = Math.ceil(unit.units * 0.2);
            const monthlyLoss = (unit.rent - avgAmiRent) * restrictedUnits;
            annualRevenueReduction += monthlyLoss * 12;
          }
        }

        totalAdditionalCosts += annualRevenueReduction * Math.min(proFormaContext.exitYear, 15);

        const rawCells = tradeoff.affectedProFormaCells?.split(",").map((c) => c.trim()) || [];
        for (const raw of rawCells) {
          const { sheet, cell } = parseCellRef(raw);
          affectedCells.push({
            sheet,
            cell,
            oldValue: null,
            newValue: avgAmiRent,
            reason: `Restrict rents to 80% AMI ($${avgAmiRent.toLocaleString()}/mo) for LIHTC compliance`,
            category: "tradeoff",
            incentiveName: program.name,
          });
        }
        break;
      }

      case "timeline_extension": {
        affectedCells.push({
          sheet: "Stable Monthly",
          cell: "F117",
          oldValue: proFormaContext.exitYear,
          newValue: 10,
          reason: "Opportunity Zone requires 10-year hold period for full capital gains exclusion",
          category: "tradeoff",
          incentiveName: program.name,
        });
        break;
      }

      case "compliance_cost": {
        const complianceCost = tradeoff.fixedCost ? Number(tradeoff.fixedCost) : 25000;
        totalAdditionalCosts += complianceCost;

        const raw = tradeoff.affectedProFormaCells?.split(",")[0]?.trim() || "F65";
        const { sheet, cell } = parseCellRef(raw);
        affectedCells.push({
          sheet,
          cell,
          oldValue: proFormaContext.expenses["compliance"] || 0,
          newValue: (proFormaContext.expenses["compliance"] || 0) + complianceCost,
          reason: tradeoff.description,
          category: "tradeoff",
          incentiveName: program.name,
        });
        break;
      }
    }
  }

  const rate = program.creditRate ? Number(program.creditRate) : 0;
  let incentiveValue = 0;

  switch (program.calculationBasis) {
    case "renovation_budget":
    case "qualified_rehabilitation_expenditures":
      incentiveValue = (proFormaContext.renovationBudget + totalAdditionalCosts) * rate;
      break;
    case "eligible_basis":
      incentiveValue =
        (proFormaContext.purchasePrice + proFormaContext.renovationBudget) * rate * 0.9;
      break;
    case "per_unit":
      incentiveValue = proFormaContext.totalUnits * rate;
      break;
    case "property_tax": {
      const annualTax = proFormaContext.purchasePrice * 0.02;
      incentiveValue = annualTax * rate * 10;
      break;
    }
    case "capital_gains":
      incentiveValue = proFormaContext.purchasePrice * 0.15 * rate;
      break;
    default:
      incentiveValue = proFormaContext.renovationBudget * rate;
  }

  const netBenefit = incentiveValue - totalAdditionalCosts;

  return {
    additionalCosts: totalAdditionalCosts,
    incentiveValue,
    netBenefit,
    affectedCells,
    description: `${program.name}: $${incentiveValue.toLocaleString()} incentive value, $${totalAdditionalCosts.toLocaleString()} additional costs, net benefit $${netBenefit.toLocaleString()}`,
  };
}
