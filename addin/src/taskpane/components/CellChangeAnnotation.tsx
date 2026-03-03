import * as React from "react";
import { CellChange, ChangeCategory } from "../types";
import { colors } from "../theme";

interface CellChangeAnnotationProps {
  change: CellChange;
}

const borderMap: Record<ChangeCategory, string> = {
  beneficial: colors.beneficialBorder,
  tradeoff: colors.tradeoffBorder,
  new_item: colors.newItemBorder,
  preview: colors.previewBorder,
};

const styles = {
  container: {
    display: "flex" as const,
    borderLeft: "3px solid",
    padding: "6px 10px",
    marginBottom: 4,
    background: colors.offWhite,
    borderRadius: "0 6px 6px 0",
    gap: 8,
    alignItems: "flex-start" as const,
  },
  cellRef: {
    fontSize: 11,
    fontWeight: 600 as const,
    fontFamily: "'Cascadia Code', 'Fira Code', monospace",
    color: colors.primary,
    whiteSpace: "nowrap" as const,
    minWidth: 70,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  values: {
    display: "flex" as const,
    alignItems: "center" as const,
    gap: 6,
    fontSize: 12,
    marginBottom: 2,
  },
  oldVal: {
    color: colors.muted,
    textDecoration: "line-through" as const,
  },
  arrow: {
    color: colors.muted,
    fontSize: 10,
  },
  newVal: {
    fontWeight: 600 as const,
    color: colors.primary,
  },
  reason: {
    fontSize: 11,
    color: colors.secondary,
    lineHeight: 1.3,
  },
};

const CellChangeAnnotation: React.FC<CellChangeAnnotationProps> = ({ change }) => {
  const borderColor = borderMap[change.category] ?? colors.previewBorder;

  return (
    <div style={{ ...styles.container, borderLeftColor: borderColor }}>
      <div style={styles.cellRef}>
        {change.sheet}!{change.cell}
      </div>
      <div style={styles.body}>
        <div style={styles.values}>
          <span style={styles.oldVal}>{change.oldValue ?? "—"}</span>
          <span style={styles.arrow}>→</span>
          <span style={styles.newVal}>{change.newValue}</span>
        </div>
        <div style={styles.reason}>{change.reason}</div>
      </div>
    </div>
  );
};

export default CellChangeAnnotation;
