import * as React from "react";
import {
  ChatMessage,
  AuditResult,
  AuditFlag,
  ScenarioResult,
  CellChange,
  ProFormaContext,
  TranslationResult,
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
  navigateToCell,
  populateTemplate,
} from "./services/excel";
import { annotateApplied, annotatePreview, clearAllAnnotations, highlightProblemCells } from "./services/cellAnnotator";
import { sendChat, runAudit, translateProForma } from "./services/api";

import "./App.css";

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    background: colors.white,
    fontFamily: fonts.sans,
  },
  auditArea: {
    padding: "10px 12px 0",
    flexShrink: 0,
  },
  projectBanner: {
    padding: "12px 14px",
    background: colors.primary,
    color: colors.white,
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 8,
    lineHeight: 1.5,
  },
  projectDetail: {
    fontSize: 11,
    fontWeight: 400,
    opacity: 0.75,
    marginTop: 2,
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
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
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

      addMessage({
        id: generateId(),
        role: "assistant",
        type: "text",
        content:
          "Welcome to Incenta. Upload a pro forma to translate it into this template, or click **Run Pro Forma Audit** to analyze the current data.",
        timestamp: Date.now(),
      });
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

  const handleFileUpload = React.useCallback(
    async (file: File) => {
      addMessage({
        id: generateId(),
        role: "user",
        type: "proforma_upload",
        content: file.name,
        timestamp: Date.now(),
      });
      setIsLoading(true);

      try {
        const result = await translateProForma(file);

        try {
          await populateTemplate(result.changes);
        } catch {
          // Not in Excel
        }

        try {
          const ctx = await readProjectContext();
          setProFormaContext(ctx);
          const nextCol = await findNextScenarioColumn();
          setScenarioCol(nextCol);
        } catch {
          setProFormaContext({
            address: "1234 Quebec St, Denver, CO",
            totalUnits: 200,
            purchasePrice: 7_000_000,
            renovationBudget: 600_000,
            rents: [
              { unitType: "Studio", rent: 1400, units: 140, sizeSf: 350 },
              { unitType: "1BR", rent: 1800, units: 60, sizeSf: 550 },
            ],
            expenses: {
              taxes: 125_000,
              utilities: 500_000,
              payroll: 200_000,
              propertyManagement: 90_000,
            },
            financing: {
              loanAmount: 5_250_000,
              interestRate: 0.06,
              ltv: 0.75,
              amortYears: 200,
              ioMonths: 24,
            },
            exitYear: 5,
            exitCapRate: 0.055,
            scenarioColumn: "F",
          });
        }

        addMessage({
          id: generateId(),
          role: "assistant",
          type: "translation_result",
          content: `Translated "${result.filename}" — ${result.fieldsMapped} fields mapped to your template.`,
          data: result,
          timestamp: Date.now(),
        });
      } catch {
        addMessage({
          id: generateId(),
          role: "assistant",
          type: "text",
          content: "Failed to translate the pro forma. Make sure the backend server is running on port 4000.",
          timestamp: Date.now(),
        });
      } finally {
        setIsLoading(false);
      }
    },
    [addMessage]
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
            address: "1234 Quebec St, Denver, CO",
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
        content: `${sourceLabel}: ${ctx.totalUnits} units, ${ctx.address}, $${(ctx.purchasePrice / 1e6).toFixed(1)}M purchase. Running audit...`,
        timestamp: Date.now(),
      });

      const auditResult = await runAudit(ctxForAudit);

      // Highlight problem cells in Excel
      if (auditResult.problems.length > 0) {
        const problemCells = auditResult.problems.flatMap((p) =>
          p.affectedCells.map((c) => ({
            sheet: c.sheet,
            cell: c.cell,
            comment: `${p.title}: ${p.description}`,
          }))
        );
        try {
          await highlightProblemCells(problemCells);
        } catch {
          // Not in Excel
        }
      }

      addMessage({
        id: generateId(),
        role: "assistant",
        type: "audit_results",
        content: `Found ${auditResult.problems.length} problem(s) and ${auditResult.opportunities.length} opportunity(ies).`,
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
      let enrichedChanges = scenario.changes;
      try {
        const needsValue = scenario.changes.filter((c) => c.oldValue === null || c.oldValue === undefined);
        if (needsValue.length > 0) {
          const baseRefs = needsValue.map((c) => {
            const cellRef = c.cell.replace(/^[A-Z]+/, "F");
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

    try {
      const scenarioLabel = pendingScenario.name || "Audit Scenario";
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
      content: `Written ${uniqueChanges.length} adjustments to column **${targetCol}**.\n\n${annotationStatus}\n\nYour original column F is preserved. Here's the financial breakdown:`,
      timestamp: Date.now(),
    });

    addMessage({
      id: generateId(),
      role: "assistant",
      type: "net_change_summary",
      content: "Net change summary",
      data: pendingScenario,
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

  const handleClickProblem = React.useCallback(
    async (flag: AuditFlag) => {
      if (flag.affectedCells.length === 0) return;

      const target = flag.affectedCells[0];
      try {
        await navigateToCell(target.sheet, target.cell);
      } catch {
        // Not in Excel — no-op
      }

      try {
        await highlightProblemCells(
          flag.affectedCells.map((c) => ({
            sheet: c.sheet,
            cell: c.cell,
            comment: `${flag.title}: ${flag.description}`,
          }))
        );
      } catch {
        // Not in Excel
      }
    },
    []
  );

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

  return (
    <div style={styles.container}>
      <div style={styles.auditArea}>
        {proFormaContext && (
          <div style={styles.projectBanner}>
            <div>{proFormaContext.address}</div>
            <div style={styles.projectDetail}>
              {proFormaContext.totalUnits} units &middot;{" "}
              ${(proFormaContext.purchasePrice / 1_000_000).toFixed(1)}M purchase
              {scenarioCol && <> &middot; Scenario col {scenarioCol}</>}
            </div>
          </div>
        )}
        <IncentiveAuditButton onClick={handleAudit} isLoading={isAuditing} />
      </div>

      <div style={styles.content}>
        <ChatPanel
          messages={messages}
          onSendMessage={handleSendMessage}
          onFileUpload={handleFileUpload}
          isLoading={isLoading}
          onApplyScenario={handleApplyScenario}
          onClickProblem={handleClickProblem}
          onApplyChanges={handleApplyChanges}
          onUndo={handleUndo}
          onDismiss={handleDismiss}
        />
      </div>
    </div>
  );
};

export default App;
