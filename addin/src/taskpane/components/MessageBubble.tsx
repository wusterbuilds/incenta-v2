import * as React from "react";
import {
  ChatMessage,
  AuditResult,
  AuditFlag,
  ScenarioResult,
  CellChange,
} from "../types";
import { colors } from "../theme";
import AuditResults from "./AuditResults";
import ScenarioComparison from "./ScenarioComparison";
import ChangelogPanel from "./ChangelogPanel";
import NetChangeSummary from "./NetChangeSummary";

interface MessageBubbleProps {
  message: ChatMessage;
  onApplyScenario?: (scenario: ScenarioResult) => void;
  onClickProblem?: (flag: AuditFlag) => void;
  onApplyChanges?: () => void;
  onUndo?: () => void;
  onDismiss?: () => void;
}

const styles = {
  userBubble: {
    alignSelf: "flex-end" as const,
    background: colors.warm,
    color: colors.white,
    borderRadius: "14px 14px 4px 14px",
    padding: "9px 14px",
    maxWidth: "82%",
    lineHeight: 1.45,
    fontSize: 13,
    wordBreak: "break-word" as const,
  },
  assistantBubble: {
    alignSelf: "flex-start" as const,
    background: colors.offWhite,
    color: colors.primary,
    borderRadius: "14px 14px 14px 4px",
    padding: "9px 14px",
    maxWidth: "92%",
    lineHeight: 1.45,
    fontSize: 13,
    wordBreak: "break-word" as const,
  },
  systemBubble: {
    alignSelf: "center" as const,
    background: colors.lightGray,
    color: colors.muted,
    borderRadius: 10,
    padding: "6px 14px",
    fontSize: 11,
    fontStyle: "italic" as const,
  },
  richContent: {
    alignSelf: "flex-start" as const,
    maxWidth: "100%",
    width: "100%",
  },
  timestamp: {
    fontSize: 10,
    opacity: 0.5,
    marginTop: 3,
  },
};

function formatText(text: string): React.ReactNode {
  const lines = text.split("\n");
  return lines.map((line, li) => {
    const parts = line.split(/(\*\*.*?\*\*|`.*?`)/g);
    const formatted = parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={i}
            style={{
              background: colors.lightGray,
              padding: "1px 5px",
              borderRadius: 3,
              fontSize: 12,
            }}
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
    return (
      <React.Fragment key={li}>
        {formatted}
        {li < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onApplyScenario,
  onClickProblem,
  onApplyChanges,
  onUndo,
  onDismiss,
}) => {
  if (message.role === "system") {
    return <div style={styles.systemBubble}>{message.content}</div>;
  }

  if (message.role === "user") {
    return (
      <div style={styles.userBubble}>
        {formatText(message.content)}
        <div style={{ ...styles.timestamp, textAlign: "right" as const }}>
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
    );
  }

  if (message.type === "audit_results" && message.data) {
    return (
      <div style={styles.richContent}>
        <AuditResults
          data={message.data as AuditResult}
          onApplyScenario={onApplyScenario || (() => {})}
          onClickProblem={onClickProblem || (() => {})}
        />
      </div>
    );
  }

  if (message.type === "scenario_comparison" && message.data) {
    const scenario = message.data as ScenarioResult;
    return (
      <div style={styles.richContent}>
        <ScenarioComparison
          baseline={scenario.returns}
          optimized={scenario.returns}
          changes={scenario.changes}
        />
      </div>
    );
  }

  if (message.type === "cell_changelog" && message.data) {
    return (
      <div style={styles.richContent}>
        <ChangelogPanel
          changes={message.data as CellChange[]}
          onApply={onApplyChanges || (() => {})}
          onUndo={onUndo || (() => {})}
          onDismiss={onDismiss || (() => {})}
          isApplied={false}
        />
      </div>
    );
  }

  if (message.type === "net_change_summary" && message.data) {
    const scenarioData = message.data as ScenarioResult;
    return (
      <div style={styles.richContent}>
        <NetChangeSummary
          changes={scenarioData.changes}
          returns={scenarioData.returns}
        />
      </div>
    );
  }

  return (
    <div style={styles.assistantBubble}>
      {formatText(message.content)}
      <div style={styles.timestamp}>
        {new Date(message.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>
    </div>
  );
};

export default MessageBubble;
