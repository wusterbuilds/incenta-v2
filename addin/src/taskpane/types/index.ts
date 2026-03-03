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

export type ChangeCategory =
  | "beneficial"
  | "tradeoff"
  | "new_item"
  | "preview";

export interface CellChange {
  sheet: string;
  cell: string;
  oldValue: string | number | null;
  newValue: string | number;
  reason: string;
  category: ChangeCategory;
  incentiveName?: string;
}

export interface IncentiveProgram {
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

export interface AuditResult {
  projectSummary: string;
  qualified: IncentiveProgram[];
  nearMiss: IncentiveProgram[];
  notApplicable: IncentiveProgram[];
  qualifiedScenario: ScenarioResult | null;
  nearMissScenarios: ScenarioResult[];
}

export interface ScenarioResult {
  name: string;
  description: string;
  incentives: string[];
  changes: CellChange[];
  returns: ScenarioReturns;
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

export type MessageType =
  | "text"
  | "incentive_card"
  | "audit_results"
  | "tradeoff_analysis"
  | "scenario_comparison"
  | "cell_changelog";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  type: MessageType;
  content: string;
  data?: AuditResult | IncentiveProgram | ScenarioResult | CellChange[];
  timestamp: number;
}
