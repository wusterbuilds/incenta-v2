import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Incenta database...");

  // Clear existing data (order matters for foreign keys)
  await prisma.marketData.deleteMany();
  await prisma.stackingRule.deleteMany();
  await prisma.proFormaImpact.deleteMany();
  await prisma.tradeoffDefinition.deleteMany();
  await prisma.eligibilityRule.deleteMany();
  await prisma.incentiveProgram.deleteMany();
  await prisma.jurisdiction.deleteMany();
  console.log("Cleared existing data.");

  // --- Jurisdictions ---
  const federal = await prisma.jurisdiction.create({
    data: {
      name: "United States (Federal)",
      level: "federal",
      stateCode: null,
      fipsCode: null,
    },
  });

  const colorado = await prisma.jurisdiction.create({
    data: {
      name: "State of Colorado",
      level: "state",
      stateCode: "CO",
      fipsCode: "08",
    },
  });

  const denver = await prisma.jurisdiction.create({
    data: {
      name: "City & County of Denver",
      level: "city",
      stateCode: "CO",
      fipsCode: "08031",
    },
  });

  // --- Incentive Programs ---
  const htcFederal = await prisma.incentiveProgram.create({
    data: {
      jurisdictionId: federal.id,
      name: "Federal Historic Tax Credit",
      programCode: "HTC_FED",
      category: "tax_credit",
      creditRate: 0.20,
      calculationBasis: "qualified_rehabilitation_expenditures",
      description:
        "20% tax credit on qualified rehabilitation expenditures for certified historic structures. Credit is claimed over 5 years.",
      isActive: true,
    },
  });

  const htcState = await prisma.incentiveProgram.create({
    data: {
      jurisdictionId: colorado.id,
      name: "Colorado State Historic Tax Credit",
      programCode: "HTC_CO",
      category: "tax_credit",
      creditRate: 0.25,
      calculationBasis: "qualified_rehabilitation_expenditures",
      description:
        "25% state income tax credit on qualified rehabilitation expenditures for designated historic properties in Colorado.",
      isActive: true,
    },
  });

  const oz = await prisma.incentiveProgram.create({
    data: {
      jurisdictionId: federal.id,
      name: "Opportunity Zone Investment",
      programCode: "OZ",
      category: "deferral",
      creditRate: null,
      calculationBasis: "capital_gains_invested",
      description:
        "Defer and reduce capital gains taxes by investing in designated Opportunity Zones. 10-year hold eliminates tax on new appreciation.",
      isActive: true,
    },
  });

  const sec45l = await prisma.incentiveProgram.create({
    data: {
      jurisdictionId: federal.id,
      name: "Section 45L Energy Efficient Home Credit",
      programCode: "45L",
      category: "tax_credit",
      creditRate: null,
      calculationBasis: "per_qualifying_unit",
      description:
        "Tax credit of $2,500 to $5,000 per qualifying energy-efficient dwelling unit in new construction or substantial rehabilitation.",
      isActive: true,
    },
  });

  const sec179d = await prisma.incentiveProgram.create({
    data: {
      jurisdictionId: federal.id,
      name: "Section 179D Energy Efficient Building Deduction",
      programCode: "179D",
      category: "deduction",
      creditRate: null,
      calculationBasis: "per_square_foot",
      description:
        "Tax deduction of up to $5.00/SF for energy-efficient commercial building property. Applies to lighting, HVAC, and building envelope improvements.",
      isActive: true,
    },
  });

  const denverAbatement = await prisma.incentiveProgram.create({
    data: {
      jurisdictionId: denver.id,
      name: "Denver Property Tax Abatement for Conversions",
      programCode: "DEN_PTA",
      category: "abatement",
      creditRate: null,
      calculationBasis: "property_tax_reduction",
      description:
        "Partial property tax abatement for qualifying commercial-to-residential conversions in Denver. Up to 70% reduction for 7 years.",
      isActive: true,
    },
  });

  const ezCredit = await prisma.incentiveProgram.create({
    data: {
      jurisdictionId: colorado.id,
      name: "Colorado Enterprise Zone Tax Credit",
      programCode: "EZ_CO",
      category: "tax_credit",
      creditRate: 0.03,
      calculationBasis: "new_employee_investment",
      description:
        "3% investment tax credit plus $1,100 per new employee for businesses located in designated Enterprise Zones.",
      isActive: true,
    },
  });

  const lihtc = await prisma.incentiveProgram.create({
    data: {
      jurisdictionId: federal.id,
      name: "Low-Income Housing Tax Credit (4%)",
      programCode: "LIHTC_4",
      category: "tax_credit",
      creditRate: 0.04,
      calculationBasis: "qualified_basis",
      description:
        "4% annual tax credit for 10 years on bond-financed affordable housing. Requires income and rent restrictions on qualifying units.",
      isActive: true,
    },
  });

  // --- Eligibility Rules ---
  const rules = [
    // HTC Federal
    {
      programId: htcFederal.id,
      ruleType: "building_age",
      fieldReference: "building_year_built",
      operator: "lte",
      thresholdValue: { max_year: 1976 },
      description: "Building must be 50+ years old or listed on the National Register of Historic Places",
      isHardRequirement: true,
    },
    {
      programId: htcFederal.id,
      ruleType: "cost_threshold",
      fieldReference: "Stable Monthly!F16",
      operator: "gte",
      thresholdValue: { min_ratio: 1.0, basis: "adjusted_basis" },
      description: "Qualified rehabilitation expenditures must exceed the adjusted basis of the building",
      isHardRequirement: true,
    },
    {
      programId: htcFederal.id,
      ruleType: "property_type",
      fieldReference: "property_type",
      operator: "in",
      thresholdValue: ["commercial", "hotel", "mixed_use", "residential_conversion"],
      description: "Must be a certified historic structure used for income-producing purposes",
      isHardRequirement: true,
    },
    // HTC State
    {
      programId: htcState.id,
      ruleType: "building_age",
      fieldReference: "building_year_built",
      operator: "lte",
      thresholdValue: { max_year: 1976 },
      description: "Building must be designated historic under state or federal criteria",
      isHardRequirement: true,
    },
    {
      programId: htcState.id,
      ruleType: "location",
      fieldReference: "state",
      operator: "eq",
      thresholdValue: "CO",
      description: "Property must be located in Colorado",
      isHardRequirement: true,
    },
    // Opportunity Zone
    {
      programId: oz.id,
      ruleType: "location",
      fieldReference: "census_tract",
      operator: "in",
      thresholdValue: { type: "opportunity_zone_tracts" },
      description: "Property must be located in a designated Opportunity Zone census tract",
      isHardRequirement: true,
    },
    {
      programId: oz.id,
      ruleType: "cost_threshold",
      fieldReference: "Stable Monthly!F16",
      operator: "gte",
      thresholdValue: { min_ratio: 1.0, basis: "original_purchase_price" },
      description: "Must substantially improve the property (renovation >= original basis within 30 months)",
      isHardRequirement: false,
    },
    // 45L
    {
      programId: sec45l.id,
      ruleType: "energy",
      fieldReference: "hvac_type",
      operator: "eq",
      thresholdValue: "energy_star_certified",
      description: "Dwelling units must meet Energy Star certification requirements",
      isHardRequirement: true,
    },
    {
      programId: sec45l.id,
      ruleType: "property_type",
      fieldReference: "property_type",
      operator: "in",
      thresholdValue: ["residential", "residential_conversion", "multifamily"],
      description: "Must be residential dwelling units (apartments qualify)",
      isHardRequirement: true,
    },
    // 179D
    {
      programId: sec179d.id,
      ruleType: "energy",
      fieldReference: "energy_reduction_pct",
      operator: "gte",
      thresholdValue: { min_reduction: 0.25 },
      description: "Building must achieve 25%+ energy reduction vs. ASHRAE reference standard",
      isHardRequirement: true,
    },
    // Denver Property Tax Abatement
    {
      programId: denverAbatement.id,
      ruleType: "property_type",
      fieldReference: "conversion_type",
      operator: "in",
      thresholdValue: ["hotel_to_residential", "office_to_residential", "commercial_to_residential"],
      description: "Must be a qualifying commercial-to-residential conversion",
      isHardRequirement: true,
    },
    {
      programId: denverAbatement.id,
      ruleType: "location",
      fieldReference: "city",
      operator: "eq",
      thresholdValue: "Denver",
      description: "Property must be located within City & County of Denver",
      isHardRequirement: true,
    },
    // Enterprise Zone
    {
      programId: ezCredit.id,
      ruleType: "location",
      fieldReference: "enterprise_zone",
      operator: "eq",
      thresholdValue: true,
      description: "Property must be in a designated Colorado Enterprise Zone",
      isHardRequirement: true,
    },
    {
      programId: ezCredit.id,
      ruleType: "property_type",
      fieldReference: "property_type",
      operator: "in",
      thresholdValue: ["commercial", "mixed_use", "residential_conversion", "hotel"],
      description: "Business must be operating in the Enterprise Zone",
      isHardRequirement: true,
    },
    // LIHTC
    {
      programId: lihtc.id,
      ruleType: "unit_mix",
      fieldReference: "Unit Mix!D14:D18",
      operator: "gte",
      thresholdValue: { pct_units_at_ami: 0.20, ami_level: 0.80 },
      description: "At least 20% of units must be rent-restricted at 80% AMI, or 40% at 60% AMI",
      isHardRequirement: true,
    },
    {
      programId: lihtc.id,
      ruleType: "property_type",
      fieldReference: "property_type",
      operator: "in",
      thresholdValue: ["residential", "residential_conversion", "multifamily"],
      description: "Must be residential rental housing",
      isHardRequirement: true,
    },
  ];

  for (const rule of rules) {
    await prisma.eligibilityRule.create({ data: rule });
  }

  // --- Tradeoff Definitions ---
  const tradeoffs = [
    {
      programId: htcFederal.id,
      tradeoffType: "cost_increase",
      affectedCategory: "renovation",
      affectedProFormaCells: "Stable Monthly!F16,Stable Monthly!H16",
      costMultiplier: 1.15,
      fixedCost: null,
      marketDataKey: "historic_materials_premium",
      description: "Must use historically appropriate materials and construction methods (15-25% cost premium)",
    },
    {
      programId: htcFederal.id,
      tradeoffType: "compliance_cost",
      affectedCategory: "operating_expense",
      affectedProFormaCells: null,
      costMultiplier: null,
      fixedCost: 35000,
      marketDataKey: null,
      description: "NPS Part 1/2/3 application and architectural review fees (~$35K)",
    },
    {
      programId: htcState.id,
      tradeoffType: "cost_increase",
      affectedCategory: "renovation",
      affectedProFormaCells: "Stable Monthly!F16,Stable Monthly!H16",
      costMultiplier: 1.10,
      fixedCost: null,
      marketDataKey: "historic_materials_premium",
      description: "State historic standards may require additional preservation measures (10% premium on top of federal)",
    },
    {
      programId: oz.id,
      tradeoffType: "timeline_extension",
      affectedCategory: "hold_period",
      affectedProFormaCells: "Stable Monthly!F117",
      costMultiplier: null,
      fixedCost: null,
      marketDataKey: null,
      description: "Must hold investment for 10+ years to eliminate capital gains tax on appreciation",
    },
    {
      programId: sec45l.id,
      tradeoffType: "cost_increase",
      affectedCategory: "renovation",
      affectedProFormaCells: "Stable Monthly!F16,Stable Monthly!H16",
      costMultiplier: null,
      fixedCost: null,
      marketDataKey: "hvac_energy_star_premium",
      description: "Energy Star HVAC and insulation upgrades (premium of $4K-$7K per unit vs. standard)",
    },
    {
      programId: sec179d.id,
      tradeoffType: "cost_increase",
      affectedCategory: "renovation",
      affectedProFormaCells: "Stable Monthly!F16",
      costMultiplier: 1.08,
      fixedCost: null,
      marketDataKey: "energy_efficient_premium",
      description: "High-efficiency building envelope and systems upgrades (8% premium)",
    },
    {
      programId: sec179d.id,
      tradeoffType: "compliance_cost",
      affectedCategory: "operating_expense",
      affectedProFormaCells: null,
      costMultiplier: null,
      fixedCost: 15000,
      marketDataKey: null,
      description: "Energy modeling and certification costs (~$15K)",
    },
    {
      programId: lihtc.id,
      tradeoffType: "revenue_decrease",
      affectedCategory: "rent",
      affectedProFormaCells: "Unit Mix!L14:L18",
      costMultiplier: null,
      fixedCost: null,
      marketDataKey: "ami_rent_limits",
      description: "Restricted units must charge rents at or below AMI-based limits (typically 20-40% below market)",
    },
    {
      programId: lihtc.id,
      tradeoffType: "compliance_cost",
      affectedCategory: "operating_expense",
      affectedProFormaCells: null,
      costMultiplier: null,
      fixedCost: 50000,
      marketDataKey: null,
      description: "Annual compliance monitoring, reporting, and audit costs (~$50K/yr)",
    },
  ];

  for (const t of tradeoffs) {
    await prisma.tradeoffDefinition.create({
      data: {
        ...t,
        costMultiplier: t.costMultiplier ?? undefined,
        fixedCost: t.fixedCost ?? undefined,
      },
    });
  }

  // --- Pro Forma Impacts ---
  const impacts = [
    {
      programId: htcFederal.id,
      impactType: "sources_offset",
      targetSection: "acquisition_closing",
      calculationFormula: "renovation_budget * 0.20 * 0.90",
      targetCells: "Stable Monthly!F25",
      timing: { year: 1, vesting: "5_year_ratable" },
    },
    {
      programId: htcState.id,
      impactType: "sources_offset",
      targetSection: "acquisition_closing",
      calculationFormula: "renovation_budget * 0.25",
      targetCells: "Stable Monthly!F25",
      timing: { year: 1 },
    },
    {
      programId: oz.id,
      impactType: "exit_benefit",
      targetSection: "exit",
      calculationFormula: "appreciation * capital_gains_rate",
      targetCells: "Stable Monthly!F125",
      timing: { year: 10, condition: "hold_10_years" },
    },
    {
      programId: sec45l.id,
      impactType: "cash_flow_addition",
      targetSection: "cash_flow",
      calculationFormula: "qualifying_units * 5000",
      targetCells: "Stable Monthly!W119",
      timing: { year: 1, one_time: true },
    },
    {
      programId: sec179d.id,
      impactType: "cash_flow_addition",
      targetSection: "cash_flow",
      calculationFormula: "total_sf * 5.00 * tax_rate",
      targetCells: "Stable Monthly!W119",
      timing: { year: 1, one_time: true },
    },
    {
      programId: denverAbatement.id,
      impactType: "expense_reduction",
      targetSection: "operating_expenses",
      calculationFormula: "property_tax * 0.70",
      targetCells: "Stable Monthly!F55",
      timing: { years: [1, 2, 3, 4, 5, 6, 7] },
    },
    {
      programId: ezCredit.id,
      impactType: "cash_flow_addition",
      targetSection: "cash_flow",
      calculationFormula: "renovation_budget * 0.03",
      targetCells: "Stable Monthly!W119",
      timing: { year: 1, one_time: true },
    },
    {
      programId: lihtc.id,
      impactType: "sources_offset",
      targetSection: "acquisition_closing",
      calculationFormula: "qualified_basis * 0.04 * 10 * equity_pricing",
      targetCells: "Stable Monthly!F25",
      timing: { year: 0, vesting: "10_year_credit" },
    },
  ];

  for (const impact of impacts) {
    await prisma.proFormaImpact.create({ data: impact });
  }

  // --- Stacking Rules ---
  const stackingRules = [
    { aId: htcFederal.id, bId: oz.id, rel: "compatible", desc: "HTC and OZ can be combined. OZ investment in QRE is eligible for HTC." },
    { aId: htcFederal.id, bId: denverAbatement.id, rel: "compatible", desc: "HTC and property tax abatement are independent programs with no interaction." },
    { aId: htcFederal.id, bId: lihtc.id, rel: "basis_reduction", desc: "If using both, HTC reduces the LIHTC qualified basis by the amount of the federal HTC.", adjustmentFormula: "lihtc_basis = lihtc_basis - (htc_credit_amount)" },
    { aId: htcFederal.id, bId: sec45l.id, rel: "compatible", desc: "HTC and 45L address different aspects (historic preservation vs. energy efficiency)." },
    { aId: sec45l.id, bId: sec179d.id, rel: "incompatible", desc: "Cannot claim both 45L credit and 179D deduction on the same dwelling unit." },
    { aId: oz.id, bId: lihtc.id, rel: "compatible", desc: "OZ and LIHTC can be layered. OZ fund can invest in LIHTC project." },
    { aId: denverAbatement.id, bId: lihtc.id, rel: "compatible", desc: "Property tax abatement and LIHTC are independent." },
    { aId: denverAbatement.id, bId: ezCredit.id, rel: "compatible", desc: "Denver abatement and state Enterprise Zone credits are independent." },
    { aId: htcState.id, bId: htcFederal.id, rel: "compatible", desc: "Colorado state HTC stacks on top of federal HTC for combined 45% credit." },
    { aId: ezCredit.id, bId: lihtc.id, rel: "compatible", desc: "Enterprise Zone credits and LIHTC are independent programs." },
  ];

  for (const rule of stackingRules) {
    await prisma.stackingRule.create({
      data: {
        programAId: rule.aId,
        programBId: rule.bId,
        relationship: rule.rel,
        constraintDescription: rule.desc,
        adjustmentFormula: (rule as any).adjustmentFormula ?? null,
      },
    });
  }

  // --- Market Data (Denver) ---
  const marketDataEntries = [
    {
      jurisdictionId: denver.id,
      dataType: "ami_levels",
      year: 2025,
      dataPayload: {
        area: "Denver-Aurora-Lakewood MSA",
        ami_100: { "1person": 72900, "2person": 83300, "3person": 93700, "4person": 104100 },
        ami_80: { "1person": 58320, "2person": 66640, "3person": 74960, "4person": 83280 },
        ami_60: { "1person": 43740, "2person": 49980, "3person": 56220, "4person": 62460 },
        rent_limits_80_ami: { studio: 1120, one_bed: 1200, two_bed: 1440, three_bed: 1664 },
        rent_limits_60_ami: { studio: 840, one_bed: 900, two_bed: 1080, three_bed: 1248 },
      },
    },
    {
      jurisdictionId: denver.id,
      dataType: "rent_comps",
      year: 2025,
      dataPayload: {
        market_rents: { studio: 1450, one_bed: 1800, two_bed: 2200, three_bed: 2800 },
        vacancy_rate: 0.06,
        rent_growth: 0.03,
        submarket: "Central Denver",
      },
    },
    {
      jurisdictionId: denver.id,
      dataType: "hvac_costs",
      year: 2025,
      dataPayload: {
        standard_per_unit: 8000,
        energy_star_per_unit: 12000,
        high_efficiency_per_unit: 15000,
        hvac_energy_star_premium: 4000,
        insulation_upgrade_per_unit: 2500,
        window_upgrade_per_unit: 3000,
        notes: "Prices reflect Denver metro area contractor averages Q1 2025",
      },
    },
    {
      jurisdictionId: denver.id,
      dataType: "construction_costs",
      year: 2025,
      dataPayload: {
        renovation_per_sf: { budget: 150, mid_range: 200, high_end: 275 },
        historic_materials_premium: 0.18,
        energy_efficient_premium: 0.08,
        general_contractor_markup: 0.15,
        soft_costs_pct: 0.20,
      },
    },
    {
      jurisdictionId: denver.id,
      dataType: "tax_rates",
      year: 2025,
      dataPayload: {
        property_tax_mill_levy: 79.631,
        assessment_rate_residential: 0.0655,
        assessment_rate_commercial: 0.29,
        abatement_reduction_pct: 0.70,
        abatement_duration_years: 7,
        state_income_tax_rate: 0.044,
        federal_capital_gains_rate: 0.20,
      },
    },
  ];

  for (const md of marketDataEntries) {
    await prisma.marketData.create({ data: md });
  }

  console.log("Seed complete!");
  console.log(`  Jurisdictions: 3`);
  console.log(`  Incentive Programs: 8`);
  console.log(`  Eligibility Rules: ${rules.length}`);
  console.log(`  Tradeoff Definitions: ${tradeoffs.length}`);
  console.log(`  Pro Forma Impacts: ${impacts.length}`);
  console.log(`  Stacking Rules: ${stackingRules.length}`);
  console.log(`  Market Data Entries: ${marketDataEntries.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
