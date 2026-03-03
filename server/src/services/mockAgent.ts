import {
  AuditResult,
  IncentiveProgramResult,
  ProFormaContext,
  ScenarioResult,
} from "../types";

export function getMockResponse(
  message: string,
  proFormaContext: ProFormaContext
): { role: "assistant"; content: string; data?: unknown } {
  const lower = message.toLowerCase();

  if (lower.includes("incentive") || lower.includes("qualify") || lower.includes("credit")) {
    return {
      role: "assistant",
      content: `Based on your ${proFormaContext.totalUnits}-unit conversion at ${proFormaContext.address} with a $${(proFormaContext.purchasePrice / 1_000_000).toFixed(1)}M purchase price and $${(proFormaContext.renovationBudget / 1_000).toFixed(0)}K renovation budget, I've identified several potential incentives:\n\n**Currently Qualified:**\n- **Denver Property Tax Abatement**: ~$560K over 10 years (no changes needed)\n- **Colorado Enterprise Zone Credit**: ~$290K (project is in an eligible zone)\n\n**Near Miss (could qualify with modifications):**\n- **Federal Historic Tax Credit (20%)**: ~$120K value. Gap: Need to confirm National Register listing and use historically appropriate materials (+$90K renovation cost). Net benefit: +$30K.\n- **LIHTC 4%**: ~$2.1M equity. Gap: Need 40 units at 80% AMI ($1,120/mo vs current $1,400). Tradeoff: -$134K/yr revenue. 10-year NPV net benefit: +$1.6M.\n- **Section 45L**: ~$1M ($5,000/unit). Gap: Need Energy Star certified HVAC. Tradeoff: +$800K HVAC upgrade. Net benefit: +$200K.\n\nWould you like me to calculate the full tradeoff analysis for any of these, or generate a scenario combining specific incentives?`,
    };
  }

  if (lower.includes("tradeoff") || lower.includes("trade-off") || lower.includes("cost")) {
    return {
      role: "assistant",
      content: `Here's the tradeoff analysis for the top incentives:\n\n| Incentive | Value | Additional Cost | Net Benefit |\n|-----------|-------|----------------|-------------|\n| Denver Property Tax Abatement | $560K | $0 | +$560K |\n| CO Enterprise Zone | $290K | $0 | +$290K |\n| Federal HTC | $120K | $90K | +$30K |\n| LIHTC 4% | $2.1M equity | $1.34M (revenue) | +$760K NPV |\n| Section 45L | $1M | $800K | +$200K |\n\nThe **Property Tax Abatement + Enterprise Zone** combination gives you **$850K with zero additional cost**. This is the lowest-risk option.\n\nIf you're willing to take on more complexity, adding **LIHTC 4%** brings the total to ~$2.95M but requires restricting 40 units to AMI rents.\n\nWant me to generate a scenario with any of these combinations?`,
    };
  }

  if (lower.includes("scenario") || lower.includes("apply") || lower.includes("write")) {
    return {
      role: "assistant",
      content: `I've prepared a scenario applying **Denver Property Tax Abatement + Colorado Enterprise Zone Credit** to column ${proFormaContext.scenarioColumn || "H"}:\n\n**Changes (14 cells):**\n- Stable Monthly!${proFormaContext.scenarioColumn || "H"}55: Property Tax $140K → $28K/yr (abatement)\n- Stable Monthly!${proFormaContext.scenarioColumn || "H"}89: Tax Credit Equity $0 → $290K (Enterprise Zone)\n- Stable Monthly!${proFormaContext.scenarioColumn || "H"}14: Sources offset +$560K (PV of tax savings)\n\n**Impact on Returns:**\n- IRR: 12.8% → 16.4% (+3.6pp)\n- Equity Multiple: 1.72x → 2.05x\n- Cash on Cash: 8.2% → 11.8%\n- Total Equity Needed: $2.8M → $2.24M\n\nClick **"Apply This Scenario"** to write these changes to your spreadsheet, or ask me to modify the scenario.`,
    };
  }

  return {
    role: "assistant",
    content: `I'm Incenta, your incentive optimization assistant. I can help you:\n\n1. **Find incentives** your project qualifies for\n2. **Analyze tradeoffs** — what it costs to qualify vs. what you get\n3. **Generate scenarios** — write optimized pro forma columns with incentives applied\n4. **Compare options** — side-by-side analysis of different incentive stacks\n\nYour project: ${proFormaContext.totalUnits}-unit conversion at ${proFormaContext.address}.\n\nTry clicking the **Incentive Audit** button for a comprehensive analysis, or ask me something like "What incentives can I qualify for?"`,
  };
}

export function getMockAuditResult(proFormaContext: ProFormaContext): AuditResult {
  const units = proFormaContext.totalUnits || 200;
  const purchasePrice = proFormaContext.purchasePrice || 7_000_000;
  const renovationBudget = proFormaContext.renovationBudget || 600_000;
  const col = proFormaContext.scenarioColumn || "H";

  const qualified: IncentiveProgramResult[] = [
    {
      id: "mock-denver-pta",
      name: "Denver Property Tax Abatement",
      jurisdiction: "City & County of Denver",
      category: "abatement",
      creditRate: 0.8,
      description:
        "Denver offers a property tax abatement of up to 80% for qualifying residential conversion projects, applied over a 10-year period.",
      estimatedValue: 560_000,
      qualificationStatus: "qualified",
      eligibilityGaps: [],
      tradeoffs: [],
    },
    {
      id: "mock-co-ez",
      name: "Colorado Enterprise Zone Tax Credit",
      jurisdiction: "State of Colorado",
      category: "tax_credit",
      creditRate: 0.03,
      description:
        "3% investment tax credit on qualified equipment and personal property investments in designated Enterprise Zones.",
      estimatedValue: 290_000,
      qualificationStatus: "qualified",
      eligibilityGaps: [],
      tradeoffs: [],
    },
  ];

  const nearMiss: IncentiveProgramResult[] = [
    {
      id: "mock-fed-htc",
      name: "Federal Historic Tax Credit (20%)",
      jurisdiction: "Federal (US)",
      category: "tax_credit",
      creditRate: 0.2,
      description:
        "20% credit on qualified rehabilitation expenditures for certified historic structures listed on the National Register.",
      estimatedValue: 120_000,
      qualificationStatus: "near_miss",
      eligibilityGaps: [
        {
          ruleDescription: "Building must be listed on the National Register of Historic Places",
          currentValue: "Listing status unconfirmed",
          requiredValue: "Confirmed National Register listing or Part 1 certification",
          gapSeverity: "moderate",
        },
        {
          ruleDescription: "Renovation must use historically appropriate materials (Secretary of Interior Standards)",
          currentValue: "Standard renovation materials",
          requiredValue: "Historic-compliant materials per SOI Standards",
          gapSeverity: "minor",
        },
      ],
      tradeoffs: [
        {
          type: "cost_increase",
          description:
            "Historic-compliant renovation materials increase costs by ~15%",
          costDelta: 90_000,
          affectedCells: ["F16"],
        },
      ],
    },
    {
      id: "mock-lihtc-4",
      name: "LIHTC 4% (Bond-Financed)",
      jurisdiction: "Federal (US)",
      category: "tax_credit",
      creditRate: 0.04,
      description:
        "4% Low-Income Housing Tax Credit for bond-financed projects. Generates equity from tax credit syndication at ~$0.90 per credit dollar.",
      estimatedValue: 2_100_000,
      qualificationStatus: "near_miss",
      eligibilityGaps: [
        {
          ruleDescription:
            "At least 20% of units must be rent-restricted at 80% AMI or 40% at 60% AMI",
          currentValue: "0% of units at restricted rents (all at market: ~$1,400/mo)",
          requiredValue: "40 units (20%) at 80% AMI ($1,120/mo for 1BR in Denver)",
          gapSeverity: "moderate",
        },
      ],
      tradeoffs: [
        {
          type: "revenue_decrease",
          description:
            "Restricting 40 units from $1,400 to $1,120/mo = -$134K/yr revenue",
          costDelta: 134_400,
          affectedCells: ["L14", "L15", "L16"],
        },
      ],
    },
    {
      id: "mock-45l",
      name: "Section 45L Energy Efficient Home Credit",
      jurisdiction: "Federal (US)",
      category: "tax_credit",
      creditRate: 5000,
      description:
        "$2,500-$5,000 per unit credit for Energy Star or DOE Zero Energy Ready certified dwelling units.",
      estimatedValue: 1_000_000,
      qualificationStatus: "near_miss",
      eligibilityGaps: [
        {
          ruleDescription: "Units must meet Energy Star Multifamily certification",
          currentValue: "Standard HVAC and insulation",
          requiredValue: "Energy Star certified HVAC + envelope improvements",
          gapSeverity: "moderate",
        },
      ],
      tradeoffs: [
        {
          type: "cost_increase",
          description:
            "Energy Star HVAC upgrade: $12K/unit vs $8K standard = +$800K total",
          costDelta: 800_000,
          affectedCells: ["F16"],
        },
      ],
    },
  ];

  const notApplicable: IncentiveProgramResult[] = [
    {
      id: "mock-co-htc",
      name: "Colorado State Historic Tax Credit (25%)",
      jurisdiction: "State of Colorado",
      category: "tax_credit",
      creditRate: 0.25,
      description:
        "25% state credit on qualified rehabilitation expenditures. Requires same National Register listing as federal HTC.",
      estimatedValue: 150_000,
      qualificationStatus: "not_applicable",
      eligibilityGaps: [
        {
          ruleDescription: "Requires National Register listing (same as Federal HTC)",
          currentValue: "Listing unconfirmed",
          requiredValue: "Confirmed National Register listing",
          gapSeverity: "major",
        },
      ],
      tradeoffs: [],
    },
    {
      id: "mock-179d",
      name: "Section 179D Energy Efficient Commercial Building Deduction",
      jurisdiction: "Federal (US)",
      category: "deduction",
      creditRate: null,
      description:
        "Up to $5/SF deduction for energy-efficient commercial buildings. Less applicable for residential conversions.",
      estimatedValue: 0,
      qualificationStatus: "not_applicable",
      eligibilityGaps: [
        {
          ruleDescription: "Building must be primarily commercial use",
          currentValue: "Residential conversion (multifamily)",
          requiredValue: "Commercial/mixed-use with >50% commercial SF",
          gapSeverity: "major",
        },
      ],
      tradeoffs: [],
    },
    {
      id: "mock-oz",
      name: "Opportunity Zone (Capital Gains Deferral)",
      jurisdiction: "Federal (US)",
      category: "deferral",
      creditRate: null,
      description:
        "Capital gains deferral and potential exclusion for investments in designated Opportunity Zones. Requires 10-year hold.",
      estimatedValue: 0,
      qualificationStatus: "not_applicable",
      eligibilityGaps: [
        {
          ruleDescription: "Property must be located in a designated Opportunity Zone census tract",
          currentValue: "Zone status unverified for this address",
          requiredValue: "Confirmed Opportunity Zone location",
          gapSeverity: "major",
        },
      ],
      tradeoffs: [],
    },
  ];

  const qualifiedScenario: ScenarioResult = {
    name: "Current Qualifications",
    description:
      "Denver Property Tax Abatement + Colorado Enterprise Zone Credit applied with no changes to the existing pro forma.",
    incentives: ["Denver Property Tax Abatement", "Colorado Enterprise Zone Tax Credit"],
    changes: [
      {
        sheet: "Stable Monthly",
        cell: `${col}55`,
        oldValue: 140_000,
        newValue: 28_000,
        reason: "80% property tax abatement for residential conversion",
        category: "beneficial",
        incentiveName: "Denver Property Tax Abatement",
      },
      {
        sheet: "Stable Monthly",
        cell: `${col}56`,
        oldValue: 0,
        newValue: -112_000,
        reason: "Annual property tax savings from abatement",
        category: "beneficial",
        incentiveName: "Denver Property Tax Abatement",
      },
      {
        sheet: "Stable Monthly",
        cell: `${col}89`,
        oldValue: 0,
        newValue: 290_000,
        reason: "3% Enterprise Zone investment tax credit on qualifying expenditures",
        category: "beneficial",
        incentiveName: "Colorado Enterprise Zone Tax Credit",
      },
    ],
    returns: {
      irr: 0.164,
      equityMultiple: 2.05,
      cashOnCash: 0.118,
      dscr: 1.45,
      totalEquityNeeded: 2_240_000,
      noi: 980_000,
      totalIncentiveValue: 850_000,
    },
  };

  const nearMissScenarios: ScenarioResult[] = [
    {
      name: "Qualified + Federal HTC",
      description:
        "Adds Federal Historic Tax Credit assuming National Register confirmation and historic-compliant materials.",
      incentives: [
        "Denver Property Tax Abatement",
        "Colorado Enterprise Zone Tax Credit",
        "Federal Historic Tax Credit (20%)",
      ],
      changes: [
        ...qualifiedScenario.changes,
        {
          sheet: "Stable Monthly",
          cell: `${col}16`,
          oldValue: renovationBudget,
          newValue: renovationBudget + 90_000,
          reason: "+15% for historically appropriate materials per Secretary of Interior Standards",
          category: "tradeoff",
          incentiveName: "Federal Historic Tax Credit (20%)",
        },
        {
          sheet: "Stable Monthly",
          cell: `${col}90`,
          oldValue: 0,
          newValue: 120_000,
          reason: "20% HTC on qualified rehabilitation expenditures",
          category: "beneficial",
          incentiveName: "Federal Historic Tax Credit (20%)",
        },
      ],
      returns: {
        irr: 0.174,
        equityMultiple: 2.12,
        cashOnCash: 0.122,
        dscr: 1.45,
        totalEquityNeeded: 2_210_000,
        noi: 980_000,
        totalIncentiveValue: 970_000,
      },
    },
    {
      name: "Qualified + LIHTC 4%",
      description:
        "Adds LIHTC 4% with 40 units restricted to 80% AMI rents. Significant equity infusion but reduced revenue.",
      incentives: [
        "Denver Property Tax Abatement",
        "Colorado Enterprise Zone Tax Credit",
        "LIHTC 4% (Bond-Financed)",
      ],
      changes: [
        ...qualifiedScenario.changes,
        {
          sheet: "Unit Mix",
          cell: "L14",
          oldValue: 1_400,
          newValue: 1_120,
          reason: "Restrict 20 1BR units to 80% AMI ($1,120/mo) for LIHTC compliance",
          category: "tradeoff",
          incentiveName: "LIHTC 4% (Bond-Financed)",
        },
        {
          sheet: "Unit Mix",
          cell: "L15",
          oldValue: 1_650,
          newValue: 1_350,
          reason: "Restrict 15 2BR units to 80% AMI ($1,350/mo) for LIHTC compliance",
          category: "tradeoff",
          incentiveName: "LIHTC 4% (Bond-Financed)",
        },
        {
          sheet: "Unit Mix",
          cell: "L16",
          oldValue: 1_200,
          newValue: 1_000,
          reason: "Restrict 5 studio units to 80% AMI ($1,000/mo) for LIHTC compliance",
          category: "tradeoff",
          incentiveName: "LIHTC 4% (Bond-Financed)",
        },
        {
          sheet: "Stable Monthly",
          cell: `${col}91`,
          oldValue: 0,
          newValue: 2_100_000,
          reason: "LIHTC 4% equity from tax credit syndication (~$0.90/credit dollar)",
          category: "beneficial",
          incentiveName: "LIHTC 4% (Bond-Financed)",
        },
      ],
      returns: {
        irr: 0.192,
        equityMultiple: 2.35,
        cashOnCash: 0.098,
        dscr: 1.28,
        totalEquityNeeded: 1_140_000,
        noi: 845_600,
        totalIncentiveValue: 2_950_000,
      },
    },
    {
      name: "Qualified + Section 45L",
      description:
        "Adds Section 45L energy credits with Energy Star HVAC upgrade. Moderate net benefit.",
      incentives: [
        "Denver Property Tax Abatement",
        "Colorado Enterprise Zone Tax Credit",
        "Section 45L Energy Efficient Home Credit",
      ],
      changes: [
        ...qualifiedScenario.changes,
        {
          sheet: "Stable Monthly",
          cell: `${col}16`,
          oldValue: renovationBudget,
          newValue: renovationBudget + 800_000,
          reason: "Energy Star HVAC upgrade: $12K/unit vs $8K standard = +$800K",
          category: "tradeoff",
          incentiveName: "Section 45L Energy Efficient Home Credit",
        },
        {
          sheet: "Stable Monthly",
          cell: `${col}92`,
          oldValue: 0,
          newValue: 1_000_000,
          reason: "$5,000/unit x 200 units Section 45L energy credit",
          category: "beneficial",
          incentiveName: "Section 45L Energy Efficient Home Credit",
        },
        {
          sheet: "Stable Monthly",
          cell: `${col}60`,
          oldValue: proFormaContext.expenses["utilities"] || 180_000,
          newValue: (proFormaContext.expenses["utilities"] || 180_000) * 0.7,
          reason: "~30% reduction in utility costs from Energy Star HVAC",
          category: "beneficial",
          incentiveName: "Section 45L Energy Efficient Home Credit",
        },
      ],
      returns: {
        irr: 0.168,
        equityMultiple: 2.08,
        cashOnCash: 0.108,
        dscr: 1.42,
        totalEquityNeeded: 2_040_000,
        noi: 1_034_000,
        totalIncentiveValue: 1_850_000,
      },
    },
  ];

  return {
    projectSummary: `${units}-unit hotel-to-residential conversion at ${proFormaContext.address || "Denver, CO"}. Purchase: $${(purchasePrice / 1_000_000).toFixed(1)}M, Renovation: $${(renovationBudget / 1_000).toFixed(0)}K.`,
    qualified,
    nearMiss,
    notApplicable,
    qualifiedScenario,
    nearMissScenarios,
  };
}
