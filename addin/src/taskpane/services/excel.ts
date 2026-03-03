import { ProFormaContext, CellChange } from "../types";

let changeSnapshot: CellChange[] = [];
let isApplied = false;
let scenarioColumnUsed: string | null = null;

function colLetterToIndex(col: string): number {
  let idx = 0;
  for (let i = 0; i < col.length; i++) {
    idx = idx * 26 + (col.charCodeAt(i) - 64);
  }
  return idx;
}

function indexToColLetter(idx: number): string {
  let result = "";
  while (idx > 0) {
    const rem = (idx - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    idx = Math.floor((idx - 1) / 26);
  }
  return result;
}

export async function findNextScenarioColumn(): Promise<string> {
  return Excel.run(async (context) => {
    const ws = context.workbook.worksheets.getItem("Stable Monthly");

    const startIdx = colLetterToIndex("N");
    const ranges: Excel.Range[] = [];
    const candidates: string[] = [];

    for (let i = 0; i < 5; i++) {
      const colIdx = startIdx + i * 2;
      const col = indexToColLetter(colIdx);
      candidates.push(col);
      const r = ws.getRange(`${col}14`);
      r.load("values");
      ranges.push(r);
    }
    await context.sync();

    for (let i = 0; i < ranges.length; i++) {
      const val = ranges[i].values[0][0];
      if (val === null || val === undefined || val === "" || val === 0) {
        return candidates[i];
      }
    }
    return candidates[0];
  });
}

export async function setupScenarioColumn(
  sourceCol: string,
  targetCol: string,
  scenarioName: string
): Promise<string> {
  return Excel.run(async (context) => {
    const ws = context.workbook.worksheets.getItem("Stable Monthly");

    const sourceRange = ws.getRange(`${sourceCol}9:${sourceCol}130`);
    sourceRange.load("values");

    const sourceColRange = ws.getRange(`${sourceCol}1:${sourceCol}1`);
    sourceColRange.format.load("columnWidth");

    // Read the source header's font color so we can match it
    const sourceHeader = ws.getRange(`${sourceCol}9`);
    sourceHeader.format.font.load("color");

    await context.sync();

    // Insert a fresh column at the target position, shifting existing data right
    const insertRange = ws.getRange(`${targetCol}:${targetCol}`);
    insertRange.insert(Excel.InsertShiftDirection.right);
    await context.sync();

    // The inserted column now lives at targetCol
    const values = sourceRange.values.map((row) => [...row]);
    values[0] = [scenarioName];

    const targetRange = ws.getRange(`${targetCol}9:${targetCol}130`);
    targetRange.values = values;

    // Copy all formatting (number formats, fonts, fills, borders, alignment)
    targetRange.copyFrom(sourceRange, Excel.RangeCopyType.formats);

    // Match column width
    const targetColRange = ws.getRange(`${targetCol}1:${targetCol}1`);
    targetColRange.format.columnWidth = sourceColRange.format.columnWidth;

    // Style the header — inherit color from source, bold it
    const header = ws.getRange(`${targetCol}9`);
    header.format.font.bold = true;
    const srcColor = sourceHeader.format.font.color;
    if (srcColor) {
      header.format.font.color = srcColor;
    }

    // Magenta bounding box around the entire scenario
    const MAGENTA = "#FF00FF";
    const boxRange = ws.getRange(`${targetCol}9:${targetCol}130`);
    const edges: Excel.BorderIndex[] = [
      Excel.BorderIndex.edgeTop,
      Excel.BorderIndex.edgeBottom,
      Excel.BorderIndex.edgeLeft,
      Excel.BorderIndex.edgeRight,
    ];
    for (const edge of edges) {
      const border = boxRange.format.borders.getItem(edge);
      border.style = Excel.BorderLineStyle.continuous;
      border.color = MAGENTA;
      border.weight = Excel.BorderWeight.thick;
    }

    await context.sync();

    scenarioColumnUsed = targetCol;
    return targetCol;
  });
}

export async function readCellValues(
  refs: { sheet: string; cell: string }[]
): Promise<Map<string, string | number | null>> {
  const result = new Map<string, string | number | null>();
  if (refs.length === 0) return result;

  return Excel.run(async (context) => {
    const ranges: { key: string; range: Excel.Range }[] = [];

    for (const ref of refs) {
      const ws = context.workbook.worksheets.getItem(ref.sheet);
      const cellRef = ref.cell.includes("!") ? ref.cell.split("!")[1] : ref.cell;
      const range = ws.getRange(cellRef);
      range.load("values");
      ranges.push({ key: `${ref.sheet}!${ref.cell}`, range });
    }
    await context.sync();

    for (const { key, range } of ranges) {
      result.set(key, range.values[0][0] as string | number | null);
    }
    return result;
  });
}

export async function readProjectContext(): Promise<ProFormaContext> {
  return Excel.run(async (context) => {
    const stable = context.workbook.worksheets.getItem("Stable Monthly");
    const unitMix = context.workbook.worksheets.getItem("Unit Mix");

    const addressCell = stable.getRange("V15");
    const unitsCell = unitMix.getRange("B5");
    const purchaseCell = stable.getRange("F14");
    const renoCell = stable.getRange("F16");
    const ltvCell = stable.getRange("F20");
    const rateCell = stable.getRange("F77");
    const amortCell = stable.getRange("F78");
    const ioCell = stable.getRange("F79");
    const exitYearCell = stable.getRange("F117");
    const exitCapCell = stable.getRange("F120");
    const taxCell = stable.getRange("F55");
    const insCell = stable.getRange("F56");
    const utilCell = stable.getRange("F57");
    const payrollCell = stable.getRange("F61");
    const pmCell = stable.getRange("F62");

    const rentRange = unitMix.getRange("L14:L18");
    const unitRange = unitMix.getRange("D14:D18");
    const sizeRange = unitMix.getRange("E14:E18");
    const typeRange = unitMix.getRange("B14:B18");

    const allCells = [
      addressCell, unitsCell, purchaseCell, renoCell, ltvCell,
      rateCell, amortCell, ioCell, exitYearCell, exitCapCell,
      taxCell, insCell, utilCell, payrollCell, pmCell,
    ];
    for (const c of allCells) c.load("values");
    rentRange.load("values");
    unitRange.load("values");
    sizeRange.load("values");
    typeRange.load("values");

    await context.sync();

    const rents: ProFormaContext["rents"] = [];
    for (let i = 0; i < 5; i++) {
      const unitType = typeRange.values[i][0];
      const rent = rentRange.values[i][0];
      const units = unitRange.values[i][0];
      const sizeSf = sizeRange.values[i][0];
      if (units > 0) {
        rents.push({
          unitType: String(unitType),
          rent: Number(rent),
          units: Number(units),
          sizeSf: Number(sizeSf),
        });
      }
    }

    const purchasePrice = Number(purchaseCell.values[0][0]);
    const loanLtv = Number(ltvCell.values[0][0]);

    return {
      address: String(addressCell.values[0][0]),
      totalUnits: Number(unitsCell.values[0][0]),
      purchasePrice,
      renovationBudget: Number(renoCell.values[0][0]),
      rents,
      expenses: {
        taxes: Number(taxCell.values[0][0]),
        insurance: Number(insCell.values[0][0]),
        utilities: Number(utilCell.values[0][0]),
        payroll: Number(payrollCell.values[0][0]),
        propertyManagement: Number(pmCell.values[0][0]),
      },
      financing: {
        loanAmount: purchasePrice * loanLtv,
        interestRate: Number(rateCell.values[0][0]),
        ltv: loanLtv,
        amortYears: Number(amortCell.values[0][0]),
        ioMonths: Number(ioCell.values[0][0]),
      },
      exitYear: Number(exitYearCell.values[0][0]),
      exitCapRate: Number(exitCapCell.values[0][0]),
      scenarioColumn: "F",
    };
  });
}

export async function writeCellChanges(changes: CellChange[]): Promise<void> {
  const deduped = new Map<string, CellChange>();
  for (const change of changes) {
    const key = `${change.sheet}!${change.cell}`;
    deduped.set(key, change);
  }
  const uniqueChanges = Array.from(deduped.values());

  return Excel.run(async (context) => {
    const ranges: Excel.Range[] = [];
    const sourceRanges: Excel.Range[] = [];

    for (const change of uniqueChanges) {
      const ws = context.workbook.worksheets.getItem(change.sheet);
      const cellRef = change.cell.includes("!") ? change.cell.split("!")[1] : change.cell;
      const range = ws.getRange(cellRef);
      range.load("values");
      ranges.push(range);

      // Load the corresponding source cell (column F) to copy its number format
      const rowMatch = cellRef.match(/\d+/);
      if (rowMatch) {
        const sourceRef = `F${rowMatch[0]}`;
        const sourceRange = ws.getRange(sourceRef);
        sourceRange.load("numberFormat");
        sourceRanges.push(sourceRange);
      } else {
        sourceRanges.push(range);
      }
    }
    await context.sync();

    const snapshot: CellChange[] = uniqueChanges.map((change, i) => ({
      ...change,
      oldValue: ranges[i].values[0][0] as string | number | null,
    }));

    for (let i = 0; i < uniqueChanges.length; i++) {
      ranges[i].values = [[uniqueChanges[i].newValue]];
      // Apply the number format from the source cell so values display correctly
      const fmt = sourceRanges[i].numberFormat;
      if (fmt && fmt[0][0] && fmt[0][0] !== "General") {
        ranges[i].numberFormat = fmt;
      }
    }
    await context.sync();

    changeSnapshot = snapshot;
    isApplied = true;
  });
}

export async function undoLastChanges(): Promise<void> {
  if (!isApplied) return;

  return Excel.run(async (context) => {
    if (scenarioColumnUsed) {
      // Delete the entire inserted column, shifting data back left
      const ws = context.workbook.worksheets.getItem("Stable Monthly");
      const colRange = ws.getRange(`${scenarioColumnUsed}:${scenarioColumnUsed}`);
      colRange.delete(Excel.DeleteShiftDirection.left);
      await context.sync();
      scenarioColumnUsed = null;
    } else {
      for (const change of changeSnapshot) {
        const ws = context.workbook.worksheets.getItem(change.sheet);
        const cellRef = change.cell.includes("!") ? change.cell.split("!")[1] : change.cell;
        const cell = ws.getRange(cellRef);
        cell.values = [[change.oldValue ?? ""]];
      }
      await context.sync();
    }

    changeSnapshot = [];
    isApplied = false;
  });
}

export function getChangeLog(): CellChange[] {
  return [...changeSnapshot];
}

export function getIsApplied(): boolean {
  return isApplied;
}

export function clearChangeLog(): void {
  changeSnapshot = [];
  isApplied = false;
}
