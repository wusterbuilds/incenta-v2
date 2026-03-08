import * as React from "react";
import { AuditFlag } from "../types";
import { colors } from "../theme";

interface FlagCardProps {
  flag: AuditFlag;
  onApplyScenario?: () => void;
  onClickProblem?: (flag: AuditFlag) => void;
}

const styles = {
  card: {
    border: "1px solid",
    borderRadius: 8,
    padding: "10px 12px",
    background: colors.white,
    transition: "background 0.15s, box-shadow 0.15s",
  },
  clickable: {
    cursor: "pointer" as const,
  },
  header: {
    display: "flex" as const,
    alignItems: "center" as const,
    gap: 6,
    marginBottom: 4,
  },
  icon: {
    fontSize: 14,
    flexShrink: 0,
  },
  title: {
    fontSize: 13,
    fontWeight: 600 as const,
    color: colors.primary,
  },
  description: {
    fontSize: 12,
    color: colors.secondary,
    lineHeight: 1.4,
    marginTop: 4,
  },
  cellRef: {
    fontSize: 10,
    color: colors.muted,
    marginTop: 4,
    fontStyle: "italic" as const,
  },
  actionBtn: {
    padding: "7px 14px",
    borderRadius: 6,
    border: "none",
    fontSize: 12,
    fontWeight: 600 as const,
    color: colors.white,
    marginTop: 8,
    cursor: "pointer" as const,
    transition: "opacity 0.15s",
  },
};

const FlagCard: React.FC<FlagCardProps> = ({ flag, onApplyScenario, onClickProblem }) => {
  const isProblem = flag.type === "problem";
  const borderColor = isProblem ? colors.problemBorder : colors.opportunityBorder;
  const icon = isProblem ? "\u26A0" : "\uD83D\uDCA1";
  const isClickable = isProblem && onClickProblem;

  const cellLabel = flag.affectedCells.length > 0
    ? flag.affectedCells.map((c) => `${c.sheet}!${c.cell}`).join(", ")
    : null;

  return (
    <div
      style={{
        ...styles.card,
        borderColor,
        ...(isClickable ? styles.clickable : {}),
      }}
      onClick={isClickable ? () => onClickProblem(flag) : undefined}
      onMouseEnter={(e) => {
        if (isClickable) {
          e.currentTarget.style.background = "#fff0ff";
          e.currentTarget.style.boxShadow = "0 0 0 1px #FF00FF";
        }
      }}
      onMouseLeave={(e) => {
        if (isClickable) {
          e.currentTarget.style.background = colors.white;
          e.currentTarget.style.boxShadow = "none";
        }
      }}
    >
      <div style={styles.header}>
        <span style={styles.icon}>{icon}</span>
        <span style={styles.title}>{flag.title}</span>
      </div>
      <div style={styles.description}>{flag.description}</div>
      {isProblem && cellLabel && (
        <div style={styles.cellRef}>Click to view: {cellLabel}</div>
      )}
      {onApplyScenario && (
        <button
          style={{ ...styles.actionBtn, background: colors.opportunityBorder }}
          onClick={(e) => {
            e.stopPropagation();
            onApplyScenario();
          }}
        >
          Apply Scenario
        </button>
      )}
    </div>
  );
};

export default FlagCard;
