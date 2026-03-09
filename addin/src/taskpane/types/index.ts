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

export type FlagType = "problem" | "opportunity";

export interface AuditFlag {
  id: string;
  type: FlagType;
  title: string;
  description: string;
  affectedCells: { sheet: string; cell: string }[];
  scenario?: ScenarioResult;
}

export interface AuditResult {
  projectSummary: string;
  problems: AuditFlag[];
  opportunities: AuditFlag[];
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

export interface TranslationSummarySection {
  section: string;
  fields: { label: string; value: string; cell: string }[];
}

export interface TranslationResult {
  filename: string;
  fieldsMapped: number;
  changes: CellChange[];
  summary: TranslationSummarySection[];
}

export type MessageType =
  | "text"
  | "audit_results"
  | "scenario_comparison"
  | "cell_changelog"
  | "net_change_summary"
  | "proforma_upload"
  | "translation_result";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  type: MessageType;
  content: string;
  data?: AuditResult | ScenarioResult | CellChange[] | TranslationResult;
  timestamp: number;
}
