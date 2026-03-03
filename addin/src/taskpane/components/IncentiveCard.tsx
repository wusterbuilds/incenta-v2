import * as React from "react";
import { IncentiveProgram } from "../types";
import { colors } from "../theme";

interface IncentiveCardProps {
  incentive: IncentiveProgram;
}

const statusColors: Record<string, { bg: string; fg: string }> = {
  qualified: { bg: "#e6f3eb", fg: "#3a7a50" },
  near_miss: { bg: "#fef3e2", fg: "#a67c2e" },
  not_applicable: { bg: colors.lightGray, fg: colors.muted },
};

const statusLabels: Record<string, string> = {
  qualified: "Qualified",
  near_miss: "Near Miss",
  not_applicable: "N/A",
};

const styles = {
  card: {
    border: `1px solid ${colors.lightGray}`,
    borderRadius: 8,
    padding: "12px 14px",
    background: colors.white,
  },
  header: {
    display: "flex" as const,
    justifyContent: "space-between" as const,
    alignItems: "flex-start" as const,
    marginBottom: 6,
  },
  name: {
    fontSize: 13,
    fontWeight: 600 as const,
    color: colors.primary,
    lineHeight: 1.3,
    flex: 1,
  },
  statusBadge: {
    padding: "2px 8px",
    borderRadius: 10,
    fontSize: 10,
    fontWeight: 600 as const,
    flexShrink: 0,
    marginLeft: 6,
  },
  tagRow: {
    display: "flex" as const,
    gap: 5,
    marginBottom: 8,
  },
  tag: {
    display: "inline-block" as const,
    padding: "2px 7px",
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 500 as const,
    background: colors.lightGray,
    color: colors.secondary,
  },
  value: {
    fontSize: 20,
    fontWeight: 700 as const,
    color: colors.primary,
    marginBottom: 4,
  },
  gapSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTop: `1px solid ${colors.lightGray}`,
  },
  gapTitle: {
    fontSize: 11,
    fontWeight: 600 as const,
    color: colors.muted,
    textTransform: "uppercase" as const,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  gapItem: {
    fontSize: 12,
    color: colors.secondary,
    padding: "3px 0",
    lineHeight: 1.35,
  },
  severityDot: {
    display: "inline-block" as const,
    width: 6,
    height: 6,
    borderRadius: "50%",
    marginRight: 5,
    verticalAlign: "middle" as const,
  },
};

const severityColor: Record<string, string> = {
  minor: "#e8c547",
  moderate: "#d4882a",
  major: "#b44444",
};

function formatCurrency(val: number): string {
  return val.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

const IncentiveCard: React.FC<IncentiveCardProps> = ({ incentive }) => {
  const sc = statusColors[incentive.qualificationStatus] ?? statusColors.not_applicable;

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div style={styles.name}>{incentive.name}</div>
        <span style={{ ...styles.statusBadge, background: sc.bg, color: sc.fg }}>
          {statusLabels[incentive.qualificationStatus]}
        </span>
      </div>

      <div style={styles.tagRow}>
        <span style={styles.tag}>{incentive.jurisdiction}</span>
        <span style={styles.tag}>{incentive.category}</span>
      </div>

      <div style={styles.value}>{formatCurrency(incentive.estimatedValue)}</div>

      <div style={{ fontSize: 12, color: colors.secondary, lineHeight: 1.35 }}>{incentive.description}</div>

      {incentive.qualificationStatus === "near_miss" && incentive.eligibilityGaps.length > 0 && (
        <div style={styles.gapSection}>
          <div style={styles.gapTitle}>Eligibility Gaps</div>
          {incentive.eligibilityGaps.map((gap, i) => (
            <div key={i} style={styles.gapItem}>
              <span style={{ ...styles.severityDot, background: severityColor[gap.gapSeverity] ?? "#ccc" }} />
              {gap.ruleDescription}: {gap.currentValue} → {gap.requiredValue}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default IncentiveCard;
