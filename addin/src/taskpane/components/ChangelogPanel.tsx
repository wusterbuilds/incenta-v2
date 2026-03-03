import * as React from "react";
import { CellChange } from "../types";
import { colors } from "../theme";
import CellChangeAnnotation from "./CellChangeAnnotation";

interface ChangelogPanelProps {
  changes: CellChange[];
  onApply: () => void;
  onUndo: () => void;
  onDismiss: () => void;
  isApplied: boolean;
}

const styles = {
  container: {
    borderRadius: 8,
    border: `1px solid ${colors.lightGray}`,
    background: colors.white,
    overflow: "hidden" as const,
  },
  header: {
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    padding: "10px 12px",
    background: colors.offWhite,
    cursor: "pointer" as const,
    userSelect: "none" as const,
  },
  headerLeft: {
    display: "flex" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  count: {
    fontSize: 13,
    fontWeight: 600 as const,
    color: colors.primary,
  },
  chevron: {
    fontSize: 12,
    color: colors.muted,
    transition: "transform 0.15s",
  },
  list: {
    padding: "8px 10px",
    maxHeight: 280,
    overflowY: "auto" as const,
  },
  actions: {
    display: "flex" as const,
    gap: 8,
    padding: "10px 12px",
    borderTop: `1px solid ${colors.lightGray}`,
  },
  btn: {
    flex: 1,
    padding: "8px 0",
    borderRadius: 6,
    border: "none",
    fontSize: 12,
    fontWeight: 600 as const,
    transition: "opacity 0.15s",
  },
  applyBtn: {
    background: colors.beneficialBorder,
    color: colors.white,
  },
  undoBtn: {
    background: colors.tradeoffBorder,
    color: colors.white,
  },
  dismissBtn: {
    background: colors.lightGray,
    color: colors.primary,
  },
  appliedBadge: {
    display: "inline-block" as const,
    padding: "2px 8px",
    borderRadius: 10,
    fontSize: 10,
    fontWeight: 600 as const,
    background: "#e6f3eb",
    color: "#3a7a50",
  },
};

const ChangelogPanel: React.FC<ChangelogPanelProps> = ({ changes, onApply, onUndo, onDismiss, isApplied }) => {
  const [expanded, setExpanded] = React.useState(true);

  return (
    <div style={styles.container}>
      <div style={styles.header} onClick={() => setExpanded((v) => !v)}>
        <div style={styles.headerLeft}>
          <span style={styles.count}>
            {changes.length} Cell Change{changes.length !== 1 ? "s" : ""}
          </span>
          {isApplied && <span style={styles.appliedBadge}>Applied</span>}
        </div>
        <span
          style={{
            ...styles.chevron,
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          ▾
        </span>
      </div>

      {expanded && (
        <div style={styles.list}>
          {changes.map((c, i) => (
            <CellChangeAnnotation key={`${c.sheet}-${c.cell}-${i}`} change={c} />
          ))}
        </div>
      )}

      <div style={styles.actions}>
        {!isApplied ? (
          <>
            <button style={{ ...styles.btn, ...styles.applyBtn }} onClick={onApply}>
              Apply Changes
            </button>
            <button style={{ ...styles.btn, ...styles.dismissBtn }} onClick={onDismiss}>
              Dismiss
            </button>
          </>
        ) : (
          <>
            <button style={{ ...styles.btn, ...styles.undoBtn }} onClick={onUndo}>
              Undo Changes
            </button>
            <button style={{ ...styles.btn, ...styles.dismissBtn }} onClick={onDismiss}>
              Dismiss
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ChangelogPanel;
