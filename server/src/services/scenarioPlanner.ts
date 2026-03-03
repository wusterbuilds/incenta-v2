import { CellChange, ProFormaContext, ScenarioResult, ScenarioReturns, ProgramWithRelations } from "../types";
import { getProgramWithDetails, getStackingRules } from "./incentiveDb";
import { calculateTradeoff } from "./tradeoffEngine";

function parseSheetCell(ref: string): { sheet: string; cell: string } {
  if (ref.includes("!")) {
    const [sheet, cell] = ref.split("!");
    return { sheet, cell };
  }
  return { sheet: "Stable Monthly", cell: ref };
}

function replaceColumn(cellRef: string, newColumn: string): string {
  return cellRef.replace(/^([A-Z]+)(\d+)$/, `${newColumn}$2`);
}

function resolveOldValue(
  cellRef: string,
  ctx: ProFormaContext
): string | number | null {
  const row = parseInt(cellRef.replace(/[A-Z]+/, ""), 10);
  switch (row) {
    case 14: return ctx.purchasePrice;
    case 16: return ctx.renovationBudget;
    case 20: return ctx.financing.ltv;
    case 55: return ctx.expenses.taxes;
    case 56: return ctx.expenses.insurance;
    case 57: return ctx.expenses.utilities;
    case 61: return ctx.expenses.payroll;
    case 62: return ctx.expenses.propertyManagement;
    case 77: return ctx.financing.interestRate;
    case 78: return ctx.financing.amortYears;
    case 79: return ctx.financing.ioMonths;
    case 117: return ctx.exitYear;
    case 120: return ctx.exitCapRate;
    default: return null;
  }
}

function computeSimplifiedReturns(
  context: ProFormaContext,
  totalIncentiveValue: number,
  allChanges: CellChange[]
): ScenarioReturns {
  const totalRevenue = context.rents.reduce(
    (sum, u) => sum + u.rent * u.units * 12,
    0
  );
  const totalExpenses = Object.values(context.expenses).reduce((a, b) => a + b, 0);

  const additionalExpenses = allChanges
    .filter((c) => c.category === "tradeoff")
    .reduce((sum, c) => {
      const delta = typeof c.newValue === "number" && typeof c.oldValue === "number"
        ? c.newValue - c.oldValue
        : 0;
      return sum + Math.max(delta, 0);
    }, 0);

  const revenueReductions = allChanges
    .filter((c) => c.sheet === "Unit Mix" && c.category === "tradeoff")
    .reduce((sum, c) => {
      if (typeof c.newValue === "number" && typeof c.oldValue === "number") {
        return sum + Math.max(c.oldValue - c.newValue, 0) * 12;
      }
      return sum;
    }, 0);

  const adjustedRevenue = totalRevenue - revenueReductions;
  const noi = adjustedRevenue - totalExpenses - additionalExpenses;

  const totalProject = context.purchasePrice + context.renovationBudget + additionalExpenses;
  const equity = totalProject - context.financing.loanAmount + totalIncentiveValue;
  const totalEquityNeeded = Math.max(totalProject - context.financing.loanAmount - totalIncentiveValue, 0);

  const annualDebtService =
    context.financing.loanAmount *
    (context.financing.interestRate / 100) *
    1.1;
  const dscr = annualDebtService > 0 ? noi / annualDebtService : 0;
  const cashFlow = noi - annualDebtService;
  const cashOnCash = totalEquityNeeded > 0 ? cashFlow / totalEquityNeeded : 0;

  const exitValue = noi / (context.exitCapRate / 100);
  const totalReturn = exitValue - context.financing.loanAmount + cashFlow * context.exitYear + totalIncentiveValue;
  const equityMultiple = totalEquityNeeded > 0 ? totalReturn / totalEquityNeeded : 0;

  const irr = estimateIRR(totalEquityNeeded, cashFlow, exitValue - context.financing.loanAmount, context.exitYear);

  return {
    irr: Math.round(irr * 1000) / 1000,
    equityMultiple: Math.round(equityMultiple * 100) / 100,
    cashOnCash: Math.round(cashOnCash * 1000) / 1000,
    dscr: Math.round(dscr * 100) / 100,
    totalEquityNeeded: Math.round(totalEquityNeeded),
    noi: Math.round(noi),
    totalIncentiveValue: Math.round(totalIncentiveValue),
  };
}

function estimateIRR(
  initialInvestment: number,
  annualCashFlow: number,
  exitProceeds: number,
  years: number
): number {
  if (initialInvestment <= 0) return 0;

  let low = -0.5;
  let high = 2.0;

  for (let iter = 0; iter < 100; iter++) {
    const mid = (low + high) / 2;
    let npv = -initialInvestment;

    for (let y = 1; y <= years; y++) {
      npv += annualCashFlow / Math.pow(1 + mid, y);
    }
    npv += exitProceeds / Math.pow(1 + mid, years);

    if (Math.abs(npv) < 1) return mid;
    if (npv > 0) low = mid;
    else high = mid;
  }

  return (low + high) / 2;
}

export async function generateScenario(
  incentiveIds: string[],
  proFormaContext: ProFormaContext,
  targetColumn: string
): Promise<ScenarioResult> {
  const programs: ProgramWithRelations[] = [];

  for (const id of incentiveIds) {
    const program = await getProgramWithDetails(id);
    if (program) programs.push(program);
  }

  if (programs.length === 0) {
    return {
      name: "Empty Scenario",
      description: "No valid incentive programs found",
      incentives: [],
      changes: [],
      returns: {
        irr: 0,
        equityMultiple: 0,
        cashOnCash: 0,
        dscr: 0,
        totalEquityNeeded: 0,
        noi: 0,
        totalIncentiveValue: 0,
      },
    };
  }

  const stackingRules = await getStackingRules(incentiveIds);
  const incompatiblePairs = new Set<string>();
  const basisReductions = new Map<string, string>();

  for (const rule of stackingRules) {
    if (rule.relationship === "incompatible") {
      incompatiblePairs.add(`${rule.programAId}:${rule.programBId}`);
      incompatiblePairs.add(`${rule.programBId}:${rule.programAId}`);
    }
    if (rule.relationship === "basis_reduction" && rule.adjustmentFormula) {
      basisReductions.set(
        `${rule.programAId}:${rule.programBId}`,
        rule.adjustmentFormula
      );
    }
  }

  const validPrograms = programs.filter((p) => {
    for (const other of programs) {
      if (other.id === p.id) continue;
      if (incompatiblePairs.has(`${p.id}:${other.id}`)) return false;
    }
    return true;
  });

  const allChanges: CellChange[] = [];
  let totalIncentiveValue = 0;

  for (const program of validPrograms) {
    const tradeoff = await calculateTradeoff(program, proFormaContext);
    totalIncentiveValue += tradeoff.incentiveValue;

    for (const change of tradeoff.affectedCells) {
      allChanges.push({
        ...change,
        cell: replaceColumn(change.cell, targetColumn),
      });
    }

    for (const impact of program.proFormaImpacts) {
      const rawCells = impact.targetCells.split(",").map((c) => c.trim());
      for (const raw of rawCells) {
        const parsed = parseSheetCell(raw);
        const oldValue = resolveOldValue(parsed.cell, proFormaContext);
        allChanges.push({
          sheet: parsed.sheet,
          cell: replaceColumn(parsed.cell, targetColumn),
          oldValue,
          newValue: Math.round(tradeoff.incentiveValue),
          reason: `${program.name}: ${impact.calculationFormula}`,
          category: impact.impactType === "sources_offset" ? "beneficial" : "new_item",
          incentiveName: program.name,
        });
      }
    }
  }

  const returns = computeSimplifiedReturns(proFormaContext, totalIncentiveValue, allChanges);
  const incentiveNames = validPrograms.map((p) => p.name);

  return {
    name: `Scenario: ${incentiveNames.join(" + ")}`,
    description: `Combined scenario applying ${validPrograms.length} incentive(s) to column ${targetColumn}. Total incentive value: $${totalIncentiveValue.toLocaleString()}.`,
    incentives: incentiveNames,
    changes: allChanges,
    returns,
  };
}
