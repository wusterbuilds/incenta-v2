import * as React from "react";
import {
  ChatMessage,
  AuditResult,
  IncentiveProgram,
  ScenarioResult,
  CellChange,
  ProFormaContext,
} from "./types";
import { colors, fonts } from "./theme";
import ChatPanel from "./components/ChatPanel";
import IncentiveAuditButton from "./components/IncentiveAuditButton";
import {
  readProjectContext,
  writeCellChanges,
  undoLastChanges,
  findNextScenarioColumn,
  setupScenarioColumn,
  readCellValues,
} from "./services/excel";
import { annotateApplied, annotatePreview, clearAllAnnotations } from "./services/cellAnnotator";
import { sendChat, runAudit } from "./services/api";

import "./App.css";

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    background: colors.white,
    fontFamily: fonts.sans,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    background: colors.primary,
    color: colors.white,
    flexShrink: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: 600,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 11,
    opacity: 0.7,
    fontWeight: 400,
  },
  auditArea: {
    padding: "10px 12px 0",
    flexShrink: 0,
  },
  projectBanner: {
    padding: "8px 12px",
    background: colors.offWhite,
    borderRadius: 8,
    fontSize: 12,
    color: colors.secondary,
    marginBottom: 8,
    lineHeight: 1.4,
  },
  content: {
    flex: 1,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
};

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const App: React.FC = () => {
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      id: generateId(),
      role: "assistant",
      type: "text",
      content:
        "Hello! I'm Incenta, your real estate incentive advisor. I can analyze your pro forma to find tax credits, abatements, and grants you may qualify for.\n\nClick **Run Incentive Audit** to start, or ask me anything about development incentives.",
      timestamp: Date.now(),
    },
  ]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isAuditing, setIsAuditing] = React.useState(false);
  const [proFormaContext, setProFormaContext] = React.useState<ProFormaContext | null>(null);
  const [pendingScenario, setPendingScenario] = React.useState<ScenarioResult | null>(null);
  const [scenarioCol, setScenarioCol] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const ctx = await readProjectContext();
        setProFormaContext(ctx);
        const nextCol = await findNextScenarioColumn();
        setScenarioCol(nextCol);
      } catch {
        // Not running in Excel
      }
    })();
  }, []);

  const addMessage = React.useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const handleSendMessage = React.useCallback(
    async (text: string) => {
      const userMsg: ChatMessage = {
        id: generateId(),
        role: "user",
        type: "text",
        content: text,
        timestamp: Date.now(),
      };
      addMessage(userMsg);
      setIsLoading(true);

      try {
        const response = await sendChat([...messages, userMsg], proFormaContext ?? undefined);
        addMessage(response);
      } catch {
        addMessage({
          id: generateId(),
          role: "assistant",
          type: "text",
          content: "Sorry, something went wrong. Please try again.",
          timestamp: Date.now(),
        });
      } finally {
        setIsLoading(false);
      }
    },
    [messages, proFormaContext, addMessage]
  );

  const handleAudit = React.useCallback(async () => {
    setIsAuditing(true);

    try {
      let ctx = proFormaContext;
      let source = "cached";
      let targetCol = scenarioCol || "N";

      if (!ctx) {
        try {
          ctx = await readProjectContext();
          setProFormaContext(ctx);
          source = "excel";
          targetCol = await findNextScenarioColumn();
          setScenarioCol(targetCol);
        } catch {
          ctx = {
            address: "1234 Example Blvd, Anytown, CO",
            totalUnits: 200,
            purchasePrice: 7_000_000,
            renovationBudget: 600_000,
            rents: [
              { unitType: "Studio", rent: 1450, units: 40, sizeSf: 450 },
              { unitType: "1BR", rent: 1800, units: 80, sizeSf: 650 },
              { unitType: "2BR", rent: 2200, units: 60, sizeSf: 900 },
              { unitType: "3BR", rent: 2800, units: 20, sizeSf: 1200 },
            ],
            expenses: {
              taxes: 350000,
              insurance: 120000,
              utilities: 180000,
              payroll: 200000,
              propertyManagement: 150000,
            },
            financing: {
              loanAmount: 4_900_000,
              interestRate: 0.065,
              ltv: 0.70,
              amortYears: 30,
              ioMonths: 24,
            },
            exitYear: 5,
            exitCapRate: 0.055,
            scenarioColumn: "F",
          };
          setProFormaContext(ctx);
          source = "fallback";
        }
      }

      // Tell the backend to generate changes for the new column, not F
      const ctxForAudit = { ...ctx, scenarioColumn: targetCol };

      const sourceLabel =
        source === "excel"
          ? "Read from spreadsheet"
          : source === "cached"
          ? "Using previously read data"
          : "Using demo data (Excel not available)";

      addMessage({
        id: generateId(),
        role: "system",
        type: "text",
        content: `${sourceLabel}: ${ctx.totalUnits} units, ${ctx.address}, $${(ctx.purchasePrice / 1e6).toFixed(1)}M purchase. Scenarios will write to column **${targetCol}**. Running audit...`,
        timestamp: Date.now(),
      });

      const auditResult = await runAudit(ctxForAudit);

      addMessage({
        id: generateId(),
        role: "assistant",
        type: "audit_results",
        content: `Found ${auditResult.qualified.length} qualifying program(s) and ${auditResult.nearMiss.length} near-miss opportunity(ies).`,
        data: auditResult,
        timestamp: Date.now(),
      });
    } catch {
      addMessage({
        id: generateId(),
        role: "assistant",
        type: "text",
        content: "Failed to run the audit. Make sure the backend server is running on port 4000.",
        timestamp: Date.now(),
      });
    } finally {
      setIsAuditing(false);
    }
  }, [proFormaContext, scenarioCol, addMessage]);

  const handleApplyScenario = React.useCallback(
    async (scenario: ScenarioResult) => {
      // Read actual current values from column F for cells where oldValue is null
      let enrichedChanges = scenario.changes;
      try {
        const needsValue = scenario.changes.filter((c) => c.oldValue === null || c.oldValue === undefined);
        if (needsValue.length > 0) {
          // Read from column F (base scenario) to get what the old value should be
          const baseRefs = needsValue.map((c) => {
            const cellRef = c.cell.replace(/^[A-Z]+/, "F"); // Replace target column with F
            return { sheet: c.sheet, cell: cellRef };
          });
          const values = await readCellValues(baseRefs);

          enrichedChanges = scenario.changes.map((c) => {
            if (c.oldValue !== null && c.oldValue !== undefined) return c;
            const baseCellRef = c.cell.replace(/^[A-Z]+/, "F");
            const key = `${c.sheet}!${baseCellRef}`;
            const actualValue = values.get(key);
            return { ...c, oldValue: actualValue ?? null };
          });
        }
      } catch {
        // Not in Excel, use whatever oldValues we have
      }

      const enrichedScenario = { ...scenario, changes: enrichedChanges };
      setPendingScenario(enrichedScenario);

      try {
        await annotatePreview(enrichedScenario.changes);
      } catch {
        // Not in Excel
      }

      addMessage({
        id: generateId(),
        role: "assistant",
        type: "cell_changelog",
        content: `Preview: ${enrichedScenario.changes.length} cell changes for "${enrichedScenario.name}". A new scenario column will be created preserving your original data. Click Apply to write.`,
        data: enrichedScenario.changes,
        timestamp: Date.now(),
      });
    },
    [addMessage]
  );

  const handleApplyChanges = React.useCallback(async () => {
    if (!pendingScenario) return;

    try {
      await clearAllAnnotations();
    } catch (e) {
      console.log("[Incenta] clearAnnotations (ok to fail):", e);
    }

    const targetCol = scenarioCol || "N";

    // Step 1: Copy base column F to the new scenario column
    try {
      const scenarioLabel = pendingScenario.name || "Incenta Scenario";
      await setupScenarioColumn("F", targetCol, scenarioLabel);
      addMessage({
        id: generateId(),
        role: "system",
        type: "text",
        content: `Created new scenario column **${targetCol}** ("${scenarioLabel}") with base values copied from column F.`,
        timestamp: Date.now(),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      addMessage({
        id: generateId(),
        role: "assistant",
        type: "text",
        content: `Could not create scenario column: ${msg}. Writing changes to existing cells instead.`,
        timestamp: Date.now(),
      });
    }

    // Step 2: Write the incentive-adjusted values on top
    const deduped = new Map<string, CellChange>();
    for (const c of pendingScenario.changes) {
      deduped.set(`${c.sheet}!${c.cell}`, c);
    }
    const uniqueChanges = Array.from(deduped.values());
    const cellList = uniqueChanges.map((c) => `${c.sheet}!${c.cell}`).join(", ");

    try {
      await writeCellChanges(pendingScenario.changes);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      addMessage({
        id: generateId(),
        role: "assistant",
        type: "text",
        content: `Write failed: ${msg}\n\nAttempted cells: ${cellList}`,
        timestamp: Date.now(),
      });
      setPendingScenario(null);
      return;
    }

    // Step 3: Annotate
    let annotationStatus = "";
    try {
      annotationStatus = await annotateApplied(pendingScenario.changes);
    } catch (e) {
      annotationStatus = `Annotations skipped: ${e instanceof Error ? e.message : String(e)}`;
    }

    addMessage({
      id: generateId(),
      role: "assistant",
      type: "text",
      content: `Written ${uniqueChanges.length} incentive adjustments to column **${targetCol}**: ${cellList}\n\n${annotationStatus}\n\nYour original column F is preserved. Check column **${targetCol}** on the **Stable Monthly** sheet to compare.`,
      timestamp: Date.now(),
    });
    setPendingScenario(null);
  }, [pendingScenario, scenarioCol, addMessage]);

  const handleUndo = React.useCallback(async () => {
    try {
      await undoLastChanges();
      await clearAllAnnotations();
      addMessage({
        id: generateId(),
        role: "assistant",
        type: "text",
        content: "All changes have been undone and annotations cleared.",
        timestamp: Date.now(),
      });
    } catch {
      addMessage({
        id: generateId(),
        role: "assistant",
        type: "text",
        content: "Undo complete (outside Excel environment).",
        timestamp: Date.now(),
      });
    }
    setPendingScenario(null);
  }, [addMessage]);

  const handleDismiss = React.useCallback(async () => {
    try {
      await clearAllAnnotations();
    } catch {
      // not in Excel
    }
    setPendingScenario(null);
    addMessage({
      id: generateId(),
      role: "assistant",
      type: "text",
      content: "Changes dismissed. Feel free to explore other scenarios.",
      timestamp: Date.now(),
    });
  }, [addMessage]);

  const handleExploreTradeoffs = React.useCallback(
    (incentive: IncentiveProgram) => {
      const prompt = `Tell me more about the tradeoffs for ${incentive.name}. What would I need to change in my pro forma to qualify?`;
      handleSendMessage(prompt);
    },
    [handleSendMessage]
  );

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <div style={styles.title}>Incenta</div>
          <div style={styles.subtitle}>Incentive Advisor</div>
        </div>
      </header>

      <div style={styles.auditArea}>
        {proFormaContext && (
          <div style={styles.projectBanner}>
            📍 {proFormaContext.address} — {proFormaContext.totalUnits} units,{" "}
            ${(proFormaContext.purchasePrice / 1_000_000).toFixed(1)}M purchase
            {scenarioCol && (
              <span style={{ opacity: 0.7 }}> · Next scenario: col {scenarioCol}</span>
            )}
          </div>
        )}
        <IncentiveAuditButton onClick={handleAudit} isLoading={isAuditing} />
      </div>

      <div style={styles.content}>
        <ChatPanel
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          onApplyScenario={handleApplyScenario}
          onExploreTradeoffs={handleExploreTradeoffs}
          onApplyChanges={handleApplyChanges}
          onUndo={handleUndo}
          onDismiss={handleDismiss}
        />
      </div>
    </div>
  );
};

export default App;
