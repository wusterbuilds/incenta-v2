import { Router, Request, Response } from "express";
import multer from "multer";
import { CellChange, TranslationResult } from "../types";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

function buildMockTranslation(filename: string): TranslationResult {
  const changes: CellChange[] = [
    // Address
    { sheet: "Stable Monthly", cell: "V15", oldValue: null, newValue: "1234 Quebec St, Denver, CO", reason: "Project address", category: "new_item" },

    // Acquisition
    { sheet: "Stable Monthly", cell: "F14", oldValue: null, newValue: 7_000_000, reason: "Purchase price", category: "new_item" },
    { sheet: "Stable Monthly", cell: "F16", oldValue: null, newValue: 600_000, reason: "Renovation budget", category: "new_item" },
    { sheet: "Stable Monthly", cell: "F20", oldValue: null, newValue: 0.75, reason: "LTV", category: "new_item" },

    // Unit Mix
    { sheet: "Unit Mix", cell: "B5", oldValue: null, newValue: 200, reason: "Total units", category: "new_item" },
    { sheet: "Unit Mix", cell: "D14", oldValue: null, newValue: 140, reason: "Studio units", category: "new_item" },
    { sheet: "Unit Mix", cell: "D15", oldValue: null, newValue: 60, reason: "1BR units", category: "new_item" },
    { sheet: "Unit Mix", cell: "E14", oldValue: null, newValue: 350, reason: "Studio SF", category: "new_item" },
    { sheet: "Unit Mix", cell: "E15", oldValue: null, newValue: 550, reason: "1BR SF", category: "new_item" },
    { sheet: "Unit Mix", cell: "L14", oldValue: null, newValue: 1400, reason: "Studio rent", category: "new_item" },
    { sheet: "Unit Mix", cell: "L15", oldValue: null, newValue: 1800, reason: "1BR rent", category: "new_item" },

    // Expenses
    { sheet: "Stable Monthly", cell: "F55", oldValue: null, newValue: 125_000, reason: "Taxes", category: "new_item" },
    { sheet: "Stable Monthly", cell: "F57", oldValue: null, newValue: 500_000, reason: "Utilities", category: "new_item" },
    { sheet: "Stable Monthly", cell: "F58", oldValue: null, newValue: 30_000, reason: "Admin", category: "new_item" },
    { sheet: "Stable Monthly", cell: "F59", oldValue: null, newValue: 45_000, reason: "Marketing", category: "new_item" },
    { sheet: "Stable Monthly", cell: "F60", oldValue: null, newValue: 60_000, reason: "Turnover", category: "new_item" },
    { sheet: "Stable Monthly", cell: "F61", oldValue: null, newValue: 200_000, reason: "Payroll", category: "new_item" },
    { sheet: "Stable Monthly", cell: "F62", oldValue: null, newValue: 90_000, reason: "Property management", category: "new_item" },
    { sheet: "Stable Monthly", cell: "F63", oldValue: null, newValue: 75_000, reason: "Contract services", category: "new_item" },
    { sheet: "Stable Monthly", cell: "F64", oldValue: null, newValue: 35_000, reason: "Maintenance/repairs", category: "new_item" },
    { sheet: "Stable Monthly", cell: "F65", oldValue: null, newValue: 120_000, reason: "Reserves", category: "new_item" },

    // Financing
    { sheet: "Stable Monthly", cell: "F77", oldValue: null, newValue: 0.06, reason: "Interest rate", category: "new_item" },
    { sheet: "Stable Monthly", cell: "F78", oldValue: null, newValue: 200, reason: "Amortization", category: "new_item" },
    { sheet: "Stable Monthly", cell: "F79", oldValue: null, newValue: 24, reason: "IO period (months)", category: "new_item" },
    { sheet: "Stable Monthly", cell: "F84", oldValue: null, newValue: 0, reason: "2nd mortgage", category: "new_item" },

    // Refinance
    { sheet: "Stable Monthly", cell: "F92", oldValue: null, newValue: 30, reason: "Refi month", category: "new_item" },
    { sheet: "Stable Monthly", cell: "F94", oldValue: null, newValue: 0.065, reason: "Refi rate", category: "new_item" },
    { sheet: "Stable Monthly", cell: "F96", oldValue: null, newValue: 0.06, reason: "Refi exit rate", category: "new_item" },
    { sheet: "Stable Monthly", cell: "F97", oldValue: null, newValue: 30, reason: "Refi amort", category: "new_item" },
    { sheet: "Stable Monthly", cell: "F99", oldValue: null, newValue: 0.8, reason: "Refi LTV", category: "new_item" },
  ];

  const summary = [
    {
      section: "Acquisition",
      fields: [
        { label: "Address", value: "1234 Quebec St, Denver, CO", cell: "Stable Monthly!V15" },
        { label: "Purchase Price", value: "$7,000,000", cell: "Stable Monthly!F14" },
        { label: "Renovation Budget", value: "$600,000", cell: "Stable Monthly!F16" },
        { label: "LTV", value: "75%", cell: "Stable Monthly!F20" },
      ],
    },
    {
      section: "Unit Mix",
      fields: [
        { label: "Total Units", value: "200", cell: "Unit Mix!B5" },
        { label: "Studio", value: "140 units, 350 SF, $1,400/mo", cell: "Unit Mix!D14" },
        { label: "1BR", value: "60 units, 550 SF, $1,800/mo", cell: "Unit Mix!D15" },
      ],
    },
    {
      section: "Expenses",
      fields: [
        { label: "Taxes", value: "$125,000", cell: "Stable Monthly!F55" },
        { label: "Utilities", value: "$500,000", cell: "Stable Monthly!F57" },
        { label: "Payroll", value: "$200,000", cell: "Stable Monthly!F61" },
        { label: "Property Mgmt", value: "$90,000", cell: "Stable Monthly!F62" },
        { label: "Reserves", value: "$120,000", cell: "Stable Monthly!F65" },
        { label: "Other (5 items)", value: "$245,000", cell: "Stable Monthly!F58" },
      ],
    },
    {
      section: "Financing",
      fields: [
        { label: "Interest Rate", value: "6.0%", cell: "Stable Monthly!F77" },
        { label: "Amortization", value: "200 (IO)", cell: "Stable Monthly!F78" },
        { label: "IO Period", value: "24 months", cell: "Stable Monthly!F79" },
      ],
    },
    {
      section: "Refinance",
      fields: [
        { label: "Refi Month", value: "30", cell: "Stable Monthly!F92" },
        { label: "Refi Rate", value: "6.5%", cell: "Stable Monthly!F94" },
        { label: "Refi LTV", value: "80%", cell: "Stable Monthly!F99" },
      ],
    },
  ];

  return {
    filename,
    fieldsMapped: changes.length,
    changes,
    summary,
  };
}

router.post("/translate", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const result = buildMockTranslation(file.originalname);
    res.json(result);
  } catch (error) {
    console.error("Translate error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
