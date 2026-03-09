import * as React from "react";
import { TranslationResult } from "../types";
import { colors, fonts } from "../theme";

interface TranslationSummaryProps {
  data: TranslationResult;
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: colors.offWhite,
    borderRadius: 10,
    border: `1px solid ${colors.lightGray}`,
    overflow: "hidden",
    fontFamily: fonts.sans,
  },
  header: {
    background: colors.primary,
    color: colors.white,
    padding: "10px 14px",
    fontSize: 13,
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    background: colors.warm,
    color: colors.white,
    borderRadius: 10,
    padding: "2px 8px",
    fontSize: 11,
    fontWeight: 600,
  },
  section: {
    padding: "8px 14px",
    borderBottom: `1px solid ${colors.lightGray}`,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: colors.secondary,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  fieldRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "3px 0",
    fontSize: 12,
    lineHeight: 1.4,
  },
  fieldLabel: {
    color: colors.muted,
  },
  fieldValue: {
    color: colors.primary,
    fontWeight: 500,
    textAlign: "right" as const,
  },
  checkmark: {
    color: colors.opportunityBorder,
    marginRight: 4,
    fontSize: 11,
  },
};

const TranslationSummary: React.FC<TranslationSummaryProps> = ({ data }) => {
  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span>&#8644; Translated</span>
        <span style={{ fontWeight: 400, opacity: 0.8 }}>{data.filename}</span>
        <span style={styles.badge}>{data.fieldsMapped} fields</span>
      </div>
      {data.summary.map((section, si) => (
        <div
          key={si}
          style={{
            ...styles.section,
            ...(si === data.summary.length - 1 ? { borderBottom: "none" } : {}),
          }}
        >
          <div style={styles.sectionTitle}>{section.section}</div>
          {section.fields.map((field, fi) => (
            <div key={fi} style={styles.fieldRow}>
              <span style={styles.fieldLabel}>
                <span style={styles.checkmark}>&#10003;</span>
                {field.label}
              </span>
              <span style={styles.fieldValue}>{field.value}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default TranslationSummary;
