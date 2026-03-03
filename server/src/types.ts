export type ChangeCategory = "beneficial" | "tradeoff" | "new_item" | "preview";

export interface CellChange {
  sheet: string;
  cell: string;
  oldValue: string | number | null;
  newValue: string | number;
  reason: string;
  category: ChangeCategory;
  incentiveName?: string;
}

export interface ProFormaContext {
  address: string;
  totalUnits: number;
  purchasePrice: number;
  renovationBudget: number;
  rents: { unitType: string; rent: number; units: number; sizeSf: number }[];
  expenses: Record<string, number>;
  financing: {
    loanAmount: number;
    interestRate: number;
    ltv: number;
    amortYears: number;
    ioMonths: number;
  };
  exitYear: number;
  exitCapRate: number;
  scenarioColumn: string;
}

export interface EligibilityGap {
  ruleDescription: string;
  currentValue: string;
  requiredValue: string;
  gapSeverity: "minor" | "moderate" | "major";
}

export interface TradeoffSummary {
  type: string;
  description: string;
  costDelta: number;
  affectedCells: string[];
}

export interface IncentiveProgramResult {
  id: string;
  name: string;
  jurisdiction: string;
  category: string;
  creditRate: number | null;
  description: string;
  estimatedValue: number;
  qualificationStatus: "qualified" | "near_miss" | "not_applicable";
  eligibilityGaps: EligibilityGap[];
  tradeoffs: TradeoffSummary[];
}

export interface ScenarioReturns {
  irr: number;
  equityMultiple: number;
  cashOnCash: number;
  dscr: number;
  totalEquityNeeded: number;
  noi: number;
  totalIncentiveValue: number;
}

export interface ScenarioResult {
  name: string;
  description: string;
  incentives: string[];
  changes: CellChange[];
  returns: ScenarioReturns;
}

export interface AuditResult {
  projectSummary: string;
  qualified: IncentiveProgramResult[];
  nearMiss: IncentiveProgramResult[];
  notApplicable: IncentiveProgramResult[];
  qualifiedScenario: ScenarioResult | null;
  nearMissScenarios: ScenarioResult[];
}

export interface TradeoffResult {
  additionalCosts: number;
  incentiveValue: number;
  netBenefit: number;
  affectedCells: CellChange[];
  description: string;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface ProgramWithRelations {
  id: string;
  jurisdictionId: string;
  name: string;
  programCode: string;
  category: string;
  creditRate: number | null;
  calculationBasis: string | null;
  description: string;
  effectiveDate: Date | null;
  sunsetDate: Date | null;
  isActive: boolean;
  jurisdiction: { id: string; name: string; level: string; stateCode: string | null };
  eligibilityRules: Array<{
    id: string;
    ruleType: string;
    fieldReference: string;
    operator: string;
    thresholdValue: unknown;
    description: string;
    isHardRequirement: boolean;
  }>;
  tradeoffs: Array<{
    id: string;
    tradeoffType: string;
    affectedCategory: string;
    affectedProFormaCells: string | null;
    costMultiplier: number | null;
    fixedCost: number | null;
    marketDataKey: string | null;
    description: string;
  }>;
  proFormaImpacts: Array<{
    id: string;
    impactType: string;
    targetSection: string;
    calculationFormula: string;
    targetCells: string;
    timing: unknown;
  }>;
  stackingRulesAsA: Array<{
    id: string;
    programBId: string;
    relationship: string;
    constraintDescription: string;
    adjustmentFormula: string | null;
  }>;
  stackingRulesAsB: Array<{
    id: string;
    programAId: string;
    relationship: string;
    constraintDescription: string;
    adjustmentFormula: string | null;
  }>;
}
