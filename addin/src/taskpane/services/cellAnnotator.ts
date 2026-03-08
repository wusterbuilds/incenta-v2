import { CellChange, ChangeCategory } from "../types";
import { colors } from "../theme";

const COMMENT_PREFIX = "[Incenta]";

function stripSheetPrefix(cellRef: string): string {
  return cellRef.includes("!") ? cellRef.split("!")[1] : cellRef;
}

function borderColorForCategory(category: ChangeCategory): string {
  switch (category) {
    case "beneficial":
      return colors.beneficialBorder;
    case "tradeoff":
      return colors.tradeoffBorder;
    case "new_item":
      return colors.newItemBorder;
    case "preview":
      return colors.previewBorder;
    default:
      return colors.muted;
  }
}

async function annotateSingleCell(
  change: CellChange,
  style: "Dash" | "Continuous"
): Promise<string | null> {
  try {
    await Excel.run(async (context) => {
      const ws = context.workbook.worksheets.getItem(change.sheet);
      const cell = ws.getRange(stripSheetPrefix(change.cell));
      const border = cell.format.borders.getItem("EdgeLeft");
      border.style = style;
      border.color = borderColorForCategory(change.category);
      border.weight = "Thick";
      if (style === "Continuous") {
        cell.format.fill.color = "#f5f4f2";
      }
      await context.sync();
    });
    return null;
  } catch (e) {
    return `${change.sheet}!${change.cell}: ${e instanceof Error ? e.message : String(e)}`;
  }
}

async function addCommentToCell(change: CellChange): Promise<void> {
  const lines = [COMMENT_PREFIX];
  if (change.incentiveName) lines.push(change.incentiveName);
  const oldStr =
    change.oldValue != null
      ? typeof change.oldValue === "number"
        ? `$${change.oldValue.toLocaleString()}`
        : String(change.oldValue)
      : "(empty)";
  const newStr =
    typeof change.newValue === "number"
      ? `$${change.newValue.toLocaleString()}`
      : String(change.newValue);
  lines.push(`${oldStr} → ${newStr}`);
  lines.push(change.reason);
  const text = lines.join("\n");

  // Try threaded comment first
  try {
    await Excel.run(async (context) => {
      const ws = context.workbook.worksheets.getItem(change.sheet);
      const cell = ws.getRange(stripSheetPrefix(change.cell));
      context.workbook.comments.add(cell, text);
      await context.sync();
    });
    return;
  } catch {
    // threaded comments not supported
  }

  // Fallback: cell note
  try {
    await Excel.run(async (context) => {
      const ws = context.workbook.worksheets.getItem(change.sheet);
      const cell = ws.getRange(stripSheetPrefix(change.cell));
      (cell as any).note = text;
      await context.sync();
    });
  } catch {
    // notes not supported either, skip
  }
}

export async function annotatePreview(changes: CellChange[]): Promise<void> {
  const deduped = new Map<string, CellChange>();
  for (const c of changes) {
    deduped.set(`${c.sheet}!${stripSheetPrefix(c.cell)}`, c);
  }
  for (const change of deduped.values()) {
    await annotateSingleCell(change, "Dash");
  }
}

export async function annotateApplied(changes: CellChange[]): Promise<string> {
  const deduped = new Map<string, CellChange>();
  for (const c of changes) {
    deduped.set(`${c.sheet}!${stripSheetPrefix(c.cell)}`, c);
  }
  const unique = Array.from(deduped.values());

  const borderErrors: string[] = [];
  for (const change of unique) {
    const err = await annotateSingleCell(change, "Continuous");
    if (err) borderErrors.push(err);
  }

  let commentCount = 0;
  for (const change of unique) {
    try {
      await addCommentToCell(change);
      commentCount++;
    } catch {
      // skip
    }
  }

  const parts: string[] = [];
  if (borderErrors.length === 0) {
    parts.push(`Borders added to ${unique.length} cell(s).`);
  } else if (borderErrors.length < unique.length) {
    parts.push(
      `Borders added to ${unique.length - borderErrors.length}/${unique.length} cell(s).`
    );
  } else {
    parts.push("Borders could not be applied (cells may be merged or protected).");
  }
  if (commentCount > 0) {
    parts.push(`Comments added to ${commentCount} cell(s).`);
  }
  return parts.join(" ");
}

export async function highlightProblemCells(
  cells: { sheet: string; cell: string; comment: string }[]
): Promise<string> {
  const errors: string[] = [];

  for (const item of cells) {
    try {
      await Excel.run(async (context) => {
        const ws = context.workbook.worksheets.getItem(item.sheet);
        const cell = ws.getRange(stripSheetPrefix(item.cell));

        const border = cell.format.borders.getItem("EdgeLeft");
        border.style = "Continuous";
        border.color = "#FF00FF";
        border.weight = "Thick";

        cell.format.fill.color = "#fff0ff";

        await context.sync();
      });
    } catch (e) {
      errors.push(`${item.sheet}!${item.cell}: ${e instanceof Error ? e.message : String(e)}`);
    }

    try {
      await Excel.run(async (context) => {
        const ws = context.workbook.worksheets.getItem(item.sheet);
        const cell = ws.getRange(stripSheetPrefix(item.cell));
        const text = `${COMMENT_PREFIX} Problem\n${item.comment}`;
        context.workbook.comments.add(cell, text);
        await context.sync();
      });
    } catch {
      try {
        await Excel.run(async (context) => {
          const ws = context.workbook.worksheets.getItem(item.sheet);
          const cell = ws.getRange(stripSheetPrefix(item.cell));
          (cell as any).note = `${COMMENT_PREFIX} Problem\n${item.comment}`;
          await context.sync();
        });
      } catch {
        // skip comments
      }
    }
  }

  if (errors.length === 0) {
    return `Highlighted ${cells.length} problem cell(s).`;
  }
  return `Highlighted ${cells.length - errors.length}/${cells.length} problem cell(s).`;
}

export async function clearAllAnnotations(): Promise<void> {
  try {
    await Excel.run(async (context) => {
      const comments = context.workbook.comments;
      comments.load("items");
      await context.sync();

      for (const comment of comments.items) {
        try {
          const content =
            typeof comment.content === "string" ? comment.content : "";
          if (content.startsWith(COMMENT_PREFIX)) {
            comment.delete();
          }
        } catch {
          // skip
        }
      }
      await context.sync();
    });
  } catch {
    // Comments API not available
  }
}
