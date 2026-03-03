import * as React from "react";
import { IncentiveProgram } from "../types";
import { colors } from "../theme";

interface TradeoffViewProps {
  incentive: IncentiveProgram;
}

const styles = {
  container: {
    borderRadius: 8,
    border: `1px solid ${colors.tradeoffBorder}`,
    overflow: "hidden" as const,
    background: colors.white,
  },
  header: {
    padding: "10px 14px",
    background: colors.offWhite,
    borderBottom: `1px solid ${colors.lightGray}`,
  },
  title: {
    fontSize: 13,
    fontWeight: 600 as const,
    color: colors.primary,
  },
  body: {
    display: "flex" as const,
    gap: 0,
  },
  column: {
    flex: 1,
    padding: "10px 14px",
  },
  divider: {
    width: 1,
    background: colors.lightGray,
  },
  columnLabel: {
    fontSize: 10,
    fontWeight: 600 as const,
    textTransform: "uppercase" as const,
    letterSpacing: 0.7,
    color: colors.muted,
    marginBottom: 8,
  },
  costItem: {
    display: "flex" as const,
    justifyContent: "space-between" as const,
    padding: "4px 0",
    fontSize: 12,
    color: colors.primary,
    borderBottom: `1px solid ${colors.lightGray}`,
  },
  benefitItem: {
    padding: "4px 0",
    fontSize: 12,
    color: colors.primary,
  },
  benefitValue: {
    fontSize: 18,
    fontWeight: 700 as const,
    color: "#4a8c5c",
    marginTop: 4,
  },
  footer: {
    display: "flex" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    padding: "10px 14px",
    borderTop: `1px solid ${colors.lightGray}`,
    background: colors.offWhite,
  },
  netLabel: {
    fontSize: 12,
    fontWeight: 600 as const,
    color: colors.primary,
  },
  netValue: {
    fontSize: 16,
    fontWeight: 700 as const,
  },
};

function formatCurrency(val: number): string {
  return val.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

const TradeoffView: React.FC<TradeoffViewProps> = ({ incentive }) => {
  const totalCost = incentive.tradeoffs.reduce((s, t) => s + Math.abs(t.costDelta), 0);
  const netImpact = incentive.estimatedValue - totalCost;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>Cost vs Benefit: {incentive.name}</div>
      </div>

      <div style={styles.body}>
        <div style={styles.column}>
          <div style={styles.columnLabel}>Costs</div>
          {incentive.tradeoffs.length > 0 ? (
            incentive.tradeoffs.map((t, i) => (
              <div key={i} style={styles.costItem}>
                <span>{t.description}</span>
                <span style={{ color: "#b44", fontWeight: 600 }}>
                  {formatCurrency(Math.abs(t.costDelta))}
                </span>
              </div>
            ))
          ) : (
            <div style={{ fontSize: 12, color: colors.muted }}>No additional costs</div>
          )}
        </div>

        <div style={styles.divider} />

        <div style={styles.column}>
          <div style={styles.columnLabel}>Benefits</div>
          <div style={styles.benefitItem}>{incentive.name}</div>
          <div style={styles.benefitValue}>{formatCurrency(incentive.estimatedValue)}</div>
        </div>
      </div>

      <div style={styles.footer}>
        <span style={styles.netLabel}>Net Impact</span>
        <span style={{ ...styles.netValue, color: netImpact >= 0 ? "#4a8c5c" : "#b44" }}>
          {netImpact >= 0 ? "+" : ""}
          {formatCurrency(netImpact)}
        </span>
      </div>
    </div>
  );
};

export default TradeoffView;
