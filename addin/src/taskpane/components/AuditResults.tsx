import * as React from "react";
import { AuditResult, IncentiveProgram, ScenarioResult } from "../types";
import { colors } from "../theme";

interface AuditResultsProps {
  data: AuditResult;
  onApplyScenario: (scenario: ScenarioResult) => void;
  onExploreTradeoffs: (incentive: IncentiveProgram) => void;
}

const styles = {
  container: {
    display: "flex" as const,
    flexDirection: "column" as const,
    gap: 10,
    padding: 4,
  },
  summary: {
    fontSize: 13,
    color: colors.primary,
    lineHeight: 1.4,
    padding: "6px 0",
  },
  tierLabel: {
    fontSize: 11,
    fontWeight: 600 as const,
    textTransform: "uppercase" as const,
    letterSpacing: 0.8,
    color: colors.muted,
    marginBottom: 4,
    marginTop: 6,
  },
  card: {
    border: "1px solid",
    borderRadius: 8,
    padding: "10px 12px",
    background: colors.white,
  },
  programName: {
    fontSize: 13,
    fontWeight: 600 as const,
    color: colors.primary,
    marginBottom: 3,
  },
  value: {
    fontSize: 18,
    fontWeight: 700 as const,
    color: colors.primary,
    marginBottom: 2,
  },
  badge: {
    display: "inline-block" as const,
    padding: "2px 8px",
    borderRadius: 10,
    fontSize: 10,
    fontWeight: 600 as const,
    marginRight: 4,
  },
  gapRow: {
    fontSize: 12,
    color: colors.secondary,
    padding: "4px 0",
    borderTop: `1px solid ${colors.lightGray}`,
    lineHeight: 1.35,
  },
  gapLabel: {
    fontWeight: 600 as const,
    color: colors.primary,
  },
  actionBtn: {
    padding: "7px 14px",
    borderRadius: 6,
    border: "none",
    fontSize: 12,
    fontWeight: 600 as const,
    color: colors.white,
    marginTop: 6,
    transition: "opacity 0.15s",
  },
  netBenefit: {
    fontSize: 12,
    fontWeight: 600 as const,
    marginTop: 4,
  },
  collapsedHeader: {
    cursor: "pointer" as const,
    fontSize: 12,
    color: colors.muted,
    padding: "6px 0",
    userSelect: "none" as const,
  },
  collapsedItem: {
    fontSize: 12,
    color: colors.muted,
    padding: "2px 0 2px 12px",
  },
};

function formatCurrency(val: number): string {
  return val.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

const AuditResults: React.FC<AuditResultsProps> = ({ data, onApplyScenario, onExploreTradeoffs }) => {
  const [naExpanded, setNaExpanded] = React.useState(false);

  const totalQualifiedValue = data.qualified.reduce((sum, p) => sum + p.estimatedValue, 0);

  return (
    <div style={styles.container}>
      <div style={styles.summary}>{data.projectSummary}</div>

      {/* Qualified Tier */}
      {data.qualified.length > 0 && (
        <>
          <div style={styles.tierLabel}>Currently Qualified</div>
          <div style={{ ...styles.card, borderColor: colors.beneficialBorder }}>
            <div style={styles.value}>{formatCurrency(totalQualifiedValue)}</div>
            <div style={{ fontSize: 11, color: colors.muted, marginBottom: 6 }}>
              Total incentive value from {data.qualified.length} program{data.qualified.length > 1 ? "s" : ""}
            </div>
            {data.qualified.map((p) => (
              <div
                key={p.id}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0" }}
              >
                <span style={{ fontSize: 12, color: colors.primary }}>{p.name}</span>
                <span style={{ ...styles.badge, background: colors.beneficialBorder, color: colors.white }}>
                  {formatCurrency(p.estimatedValue)}
                </span>
              </div>
            ))}
            {data.qualifiedScenario && (
              <button
                style={{ ...styles.actionBtn, background: colors.beneficialBorder }}
                onClick={() => onApplyScenario(data.qualifiedScenario!)}
              >
                Apply This Scenario
              </button>
            )}
          </div>
        </>
      )}

      {/* Near Miss Tier */}
      {data.nearMiss.length > 0 && (
        <>
          <div style={styles.tierLabel}>Near Miss</div>
          {data.nearMiss.map((p) => {
            const tradeoffCost = p.tradeoffs.reduce((s, t) => s + Math.abs(t.costDelta), 0);
            const netBenefit = p.estimatedValue - tradeoffCost;
            return (
              <div key={p.id} style={{ ...styles.card, borderColor: colors.tradeoffBorder }}>
                <div style={styles.programName}>{p.name}</div>
                <span style={{ ...styles.badge, background: colors.lightGray, color: colors.primary }}>
                  {p.jurisdiction}
                </span>
                <span style={{ ...styles.badge, background: colors.lightGray, color: colors.secondary }}>
                  {p.category}
                </span>

                <div style={{ marginTop: 6 }}>
                  {p.eligibilityGaps.map((gap, i) => (
                    <div key={i} style={styles.gapRow}>
                      <span style={styles.gapLabel}>Gap: </span>
                      {gap.ruleDescription} — current: {gap.currentValue}, required: {gap.requiredValue}
                    </div>
                  ))}
                </div>

                {tradeoffCost > 0 && (
                  <div style={{ fontSize: 12, color: colors.secondary, marginTop: 4 }}>
                    Tradeoff cost: {formatCurrency(tradeoffCost)}
                  </div>
                )}
                <div style={{ ...styles.netBenefit, color: netBenefit > 0 ? "#4a8c5c" : "#b44" }}>
                  Net benefit: {formatCurrency(netBenefit)}
                </div>

                <button
                  style={{ ...styles.actionBtn, background: colors.tradeoffBorder }}
                  onClick={() => onExploreTradeoffs(p)}
                >
                  What If…
                </button>
              </div>
            );
          })}
        </>
      )}

      {/* Not Applicable Tier */}
      {data.notApplicable.length > 0 && (
        <>
          <div
            style={styles.collapsedHeader}
            onClick={() => setNaExpanded((v) => !v)}
          >
            {naExpanded ? "▾" : "▸"} Not Applicable ({data.notApplicable.length})
          </div>
          {naExpanded &&
            data.notApplicable.map((p) => (
              <div key={p.id} style={styles.collapsedItem}>
                {p.name} — {p.description}
              </div>
            ))}
        </>
      )}
    </div>
  );
};

export default AuditResults;
