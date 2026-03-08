import * as React from "react";
import { AuditResult, AuditFlag, ScenarioResult } from "../types";
import { colors } from "../theme";
import FlagCard from "./FlagCard";

interface AuditResultsProps {
  data: AuditResult;
  onApplyScenario: (scenario: ScenarioResult) => void;
  onClickProblem: (flag: AuditFlag) => void;
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
  sectionLabel: {
    fontSize: 11,
    fontWeight: 600 as const,
    textTransform: "uppercase" as const,
    letterSpacing: 0.6,
    paddingBottom: 4,
    marginBottom: 6,
    marginTop: 8,
  },
  problemLabel: {
    color: colors.problemBorder,
    borderBottom: `1px solid ${colors.problemBorder}`,
  },
  opportunityLabel: {
    color: colors.opportunityBorder,
    borderBottom: `1px solid ${colors.opportunityBorder}`,
  },
};

const AuditResults: React.FC<AuditResultsProps> = ({ data, onApplyScenario, onClickProblem }) => {
  return (
    <div style={styles.container}>
      <div style={styles.summary}>{data.projectSummary}</div>

      {data.problems.length > 0 && (
        <>
          <div style={{ ...styles.sectionLabel, ...styles.problemLabel }}>
            Problems to Fix
          </div>
          {data.problems.map((flag) => (
            <FlagCard key={flag.id} flag={flag} onClickProblem={onClickProblem} />
          ))}
        </>
      )}

      {data.opportunities.length > 0 && (
        <>
          <div style={{ ...styles.sectionLabel, ...styles.opportunityLabel }}>
            Opportunities to Capture
          </div>
          {data.opportunities.map((flag) => (
            <FlagCard
              key={flag.id}
              flag={flag}
              onApplyScenario={flag.scenario ? () => onApplyScenario(flag.scenario!) : undefined}
            />
          ))}
        </>
      )}
    </div>
  );
};

export default AuditResults;
