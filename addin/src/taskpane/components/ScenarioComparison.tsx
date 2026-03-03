import * as React from "react";
import { ScenarioReturns, CellChange } from "../types";
import { colors } from "../theme";

interface ScenarioComparisonProps {
  baseline: ScenarioReturns;
  optimized: ScenarioReturns;
  changes: CellChange[];
}

interface MetricRow {
  label: string;
  key: keyof ScenarioReturns;
  format: (v: number) => string;
}

function pct(v: number): string {
  return (v * 100).toFixed(2) + "%";
}

function currency(v: number): string {
  return v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function multiple(v: number): string {
  return v.toFixed(2) + "x";
}

const metrics: MetricRow[] = [
  { label: "IRR", key: "irr", format: pct },
  { label: "Equity Multiple", key: "equityMultiple", format: multiple },
  { label: "Cash-on-Cash", key: "cashOnCash", format: pct },
  { label: "DSCR", key: "dscr", format: (v) => v.toFixed(2) },
  { label: "Total Equity Needed", key: "totalEquityNeeded", format: currency },
  { label: "NOI", key: "noi", format: currency },
  { label: "Total Incentive Value", key: "totalIncentiveValue", format: currency },
];

const styles = {
  container: {
    borderRadius: 8,
    border: `1px solid ${colors.lightGray}`,
    overflow: "hidden" as const,
    background: colors.white,
  },
  header: {
    display: "flex" as const,
    padding: "8px 12px",
    background: colors.offWhite,
    borderBottom: `1px solid ${colors.lightGray}`,
    fontSize: 11,
    fontWeight: 600 as const,
    textTransform: "uppercase" as const,
    letterSpacing: 0.6,
    color: colors.muted,
  },
  headerCell: {
    flex: 1,
  },
  row: {
    display: "flex" as const,
    padding: "7px 12px",
    borderBottom: `1px solid ${colors.lightGray}`,
    fontSize: 12,
    alignItems: "center" as const,
  },
  cell: {
    flex: 1,
  },
  metricLabel: {
    fontWeight: 600 as const,
    color: colors.primary,
  },
  baselineVal: {
    color: colors.secondary,
  },
  optimizedVal: {
    fontWeight: 600 as const,
    color: colors.primary,
  },
  changeCount: {
    padding: "8px 12px",
    fontSize: 11,
    color: colors.muted,
    background: colors.offWhite,
  },
};

const ScenarioComparison: React.FC<ScenarioComparisonProps> = ({ baseline, optimized, changes }) => {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerCell}>Metric</div>
        <div style={styles.headerCell}>Baseline</div>
        <div style={styles.headerCell}>Optimized</div>
        <div style={{ ...styles.headerCell, textAlign: "right" as const }}>Delta</div>
      </div>

      {metrics.map((m) => {
        const bv = baseline[m.key];
        const ov = optimized[m.key];
        const delta = ov - bv;
        const isPositive = delta > 0;
        const isNegative = delta < 0;

        const equityMetric = m.key === "totalEquityNeeded";
        const deltaColor = equityMetric
          ? isNegative ? "#4a8c5c" : isPositive ? "#b44" : colors.muted
          : isPositive ? "#4a8c5c" : isNegative ? "#b44" : colors.muted;

        return (
          <div key={m.key} style={styles.row}>
            <div style={{ ...styles.cell, ...styles.metricLabel }}>{m.label}</div>
            <div style={{ ...styles.cell, ...styles.baselineVal }}>{m.format(bv)}</div>
            <div style={{ ...styles.cell, ...styles.optimizedVal }}>{m.format(ov)}</div>
            <div style={{ ...styles.cell, textAlign: "right" as const, fontWeight: 600, color: deltaColor }}>
              {delta === 0 ? "—" : `${delta > 0 ? "+" : ""}${m.format(delta)}`}
            </div>
          </div>
        );
      })}

      <div style={styles.changeCount}>
        {changes.length} cell change{changes.length !== 1 ? "s" : ""} required
      </div>
    </div>
  );
};

export default ScenarioComparison;
