import * as React from "react";
import { CellChange, ScenarioReturns } from "../types";
import { colors, fonts } from "../theme";

interface NetChangeSummaryProps {
  changes: CellChange[];
  returns?: ScenarioReturns;
}

interface LineItem {
  label: string;
  delta: number;
  cell: string;
}

function currency(v: number): string {
  const abs = Math.abs(v);
  const formatted = abs.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
  return v < 0 ? `-${formatted}` : formatted;
}

function signedCurrency(v: number): string {
  const prefix = v > 0 ? "+" : "";
  return prefix + currency(v);
}

function computeLineItems(changes: CellChange[]): {
  costs: LineItem[];
  benefits: LineItem[];
} {
  const costs: LineItem[] = [];
  const benefits: LineItem[] = [];

  for (const c of changes) {
    if (typeof c.newValue !== "number") continue;
    const oldNum = typeof c.oldValue === "number" ? c.oldValue : 0;
    const delta = c.newValue - oldNum;
    if (delta === 0) continue;

    const label = c.incentiveName
      ? `${c.incentiveName} — ${c.reason}`
      : c.reason;

    const item: LineItem = { label, delta, cell: `${c.sheet}!${c.cell}` };

    if (c.category === "tradeoff") {
      costs.push(item);
    } else if (c.category === "beneficial" || c.category === "new_item") {
      benefits.push(item);
    }
  }

  return { costs, benefits };
}

const styles = {
  container: {
    borderRadius: 8,
    border: `1px solid ${colors.lightGray}`,
    background: colors.white,
    overflow: "hidden" as const,
    fontSize: 12,
  },
  sectionHeader: {
    display: "flex" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    padding: "8px 12px",
    fontWeight: 600 as const,
    fontSize: 11,
    textTransform: "uppercase" as const,
    letterSpacing: 0.6,
    borderBottom: `1px solid ${colors.lightGray}`,
  },
  costHeader: {
    background: "#fdf2f2",
    color: "#b44",
  },
  benefitHeader: {
    background: "#f0f7f2",
    color: "#3a7a50",
  },
  row: {
    display: "flex" as const,
    justifyContent: "space-between" as const,
    alignItems: "flex-start" as const,
    padding: "6px 12px",
    borderBottom: `1px solid ${colors.lightGray}`,
    gap: 8,
  },
  rowLabel: {
    flex: 1,
    color: colors.secondary,
    lineHeight: 1.4,
    minWidth: 0,
  },
  rowCell: {
    fontSize: 10,
    color: colors.muted,
    fontFamily: fonts.mono,
  },
  rowValue: {
    fontWeight: 600 as const,
    whiteSpace: "nowrap" as const,
    fontFamily: fonts.mono,
    fontSize: 12,
  },
  costValue: {
    color: "#b44",
  },
  benefitValue: {
    color: "#3a7a50",
  },
  subtotalRow: {
    display: "flex" as const,
    justifyContent: "space-between" as const,
    padding: "6px 12px",
    borderBottom: `1px solid ${colors.lightGray}`,
    background: colors.offWhite,
    fontWeight: 600 as const,
  },
  netBar: {
    display: "flex" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    padding: "10px 12px",
    fontWeight: 700 as const,
    fontSize: 13,
  },
  netPositive: {
    background: "#e6f3eb",
    color: "#2d6a3e",
  },
  netNegative: {
    background: "#fdf2f2",
    color: "#b44",
  },
  netNeutral: {
    background: colors.offWhite,
    color: colors.primary,
  },
  returnsSection: {
    padding: "8px 12px",
    borderTop: `1px solid ${colors.lightGray}`,
    background: colors.offWhite,
  },
  returnsTitle: {
    fontSize: 11,
    fontWeight: 600 as const,
    textTransform: "uppercase" as const,
    letterSpacing: 0.6,
    color: colors.muted,
    marginBottom: 6,
  },
  returnRow: {
    display: "flex" as const,
    justifyContent: "space-between" as const,
    padding: "3px 0",
    fontSize: 12,
  },
  returnLabel: {
    color: colors.secondary,
  },
  returnValue: {
    fontWeight: 600 as const,
    color: colors.primary,
    fontFamily: fonts.mono,
  },
};

const NetChangeSummary: React.FC<NetChangeSummaryProps> = ({
  changes,
  returns,
}) => {
  const { costs, benefits } = computeLineItems(changes);

  const totalCosts = costs.reduce((sum, c) => sum + Math.abs(c.delta), 0);
  const totalBenefits = benefits.reduce((sum, b) => sum + Math.abs(b.delta), 0);
  const net = totalBenefits - totalCosts;

  const netStyle = net > 0 ? styles.netPositive : net < 0 ? styles.netNegative : styles.netNeutral;

  return (
    <div style={styles.container}>
      {/* Cost Increases */}
      <div style={{ ...styles.sectionHeader, ...styles.costHeader }}>
        <span>Cost Increases</span>
        <span>{costs.length} item{costs.length !== 1 ? "s" : ""}</span>
      </div>
      {costs.length === 0 && (
        <div style={{ ...styles.row, color: colors.muted, fontStyle: "italic" }}>
          No additional costs
        </div>
      )}
      {costs.map((c, i) => (
        <div key={`cost-${i}`} style={styles.row}>
          <div style={styles.rowLabel}>
            {c.label}
            <div style={styles.rowCell}>{c.cell}</div>
          </div>
          <div style={{ ...styles.rowValue, ...styles.costValue }}>
            +{currency(Math.abs(c.delta))}
          </div>
        </div>
      ))}
      {costs.length > 0 && (
        <div style={styles.subtotalRow}>
          <span>Subtotal</span>
          <span style={styles.costValue}>{currency(totalCosts)}</span>
        </div>
      )}

      {/* Benefit Gains */}
      <div style={{ ...styles.sectionHeader, ...styles.benefitHeader }}>
        <span>Benefit Gains</span>
        <span>{benefits.length} item{benefits.length !== 1 ? "s" : ""}</span>
      </div>
      {benefits.length === 0 && (
        <div style={{ ...styles.row, color: colors.muted, fontStyle: "italic" }}>
          No direct benefits
        </div>
      )}
      {benefits.map((b, i) => (
        <div key={`ben-${i}`} style={styles.row}>
          <div style={styles.rowLabel}>
            {b.label}
            <div style={styles.rowCell}>{b.cell}</div>
          </div>
          <div style={{ ...styles.rowValue, ...styles.benefitValue }}>
            +{currency(Math.abs(b.delta))}
          </div>
        </div>
      ))}
      {benefits.length > 0 && (
        <div style={styles.subtotalRow}>
          <span>Subtotal</span>
          <span style={styles.benefitValue}>{currency(totalBenefits)}</span>
        </div>
      )}

      {/* Net Impact */}
      <div style={{ ...styles.netBar, ...netStyle }}>
        <span>Net Impact</span>
        <span>{signedCurrency(net)}</span>
      </div>

      {/* Return metrics */}
      {returns && (
        <div style={styles.returnsSection}>
          <div style={styles.returnsTitle}>Projected Returns</div>
          <div style={styles.returnRow}>
            <span style={styles.returnLabel}>IRR</span>
            <span style={styles.returnValue}>
              {(returns.irr * 100).toFixed(1)}%
            </span>
          </div>
          <div style={styles.returnRow}>
            <span style={styles.returnLabel}>Equity Multiple</span>
            <span style={styles.returnValue}>
              {returns.equityMultiple.toFixed(2)}x
            </span>
          </div>
          <div style={styles.returnRow}>
            <span style={styles.returnLabel}>Cash-on-Cash</span>
            <span style={styles.returnValue}>
              {(returns.cashOnCash * 100).toFixed(1)}%
            </span>
          </div>
          <div style={styles.returnRow}>
            <span style={styles.returnLabel}>NOI</span>
            <span style={styles.returnValue}>{currency(returns.noi)}</span>
          </div>
          <div style={styles.returnRow}>
            <span style={styles.returnLabel}>Total Incentive Value</span>
            <span style={{ ...styles.returnValue, ...styles.benefitValue }}>
              {currency(returns.totalIncentiveValue)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default NetChangeSummary;
