-- CreateTable
CREATE TABLE "jurisdictions" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "state_code" TEXT,
    "fips_code" TEXT,
    "geo_boundary" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jurisdictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incentive_programs" (
    "id" UUID NOT NULL,
    "jurisdiction_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "program_code" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "credit_rate" DECIMAL(6,4),
    "calculation_basis" TEXT,
    "description" TEXT NOT NULL,
    "effective_date" TIMESTAMP(3),
    "sunset_date" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incentive_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eligibility_rules" (
    "id" UUID NOT NULL,
    "program_id" UUID NOT NULL,
    "rule_type" TEXT NOT NULL,
    "field_reference" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "threshold_value" JSONB NOT NULL,
    "description" TEXT NOT NULL,
    "is_hard_requirement" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "eligibility_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tradeoff_definitions" (
    "id" UUID NOT NULL,
    "program_id" UUID NOT NULL,
    "tradeoff_type" TEXT NOT NULL,
    "affected_category" TEXT NOT NULL,
    "affected_pro_forma_cells" TEXT,
    "cost_multiplier" DECIMAL(6,4),
    "fixed_cost" DECIMAL(14,2),
    "market_data_key" TEXT,
    "description" TEXT NOT NULL,

    CONSTRAINT "tradeoff_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pro_forma_impacts" (
    "id" UUID NOT NULL,
    "program_id" UUID NOT NULL,
    "impact_type" TEXT NOT NULL,
    "target_section" TEXT NOT NULL,
    "calculation_formula" TEXT NOT NULL,
    "target_cells" TEXT NOT NULL,
    "timing" JSONB,

    CONSTRAINT "pro_forma_impacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stacking_rules" (
    "id" UUID NOT NULL,
    "program_a_id" UUID NOT NULL,
    "program_b_id" UUID NOT NULL,
    "relationship" TEXT NOT NULL,
    "constraint_description" TEXT NOT NULL,
    "adjustment_formula" TEXT,

    CONSTRAINT "stacking_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_data" (
    "id" UUID NOT NULL,
    "jurisdiction_id" UUID NOT NULL,
    "data_type" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "data_payload" JSONB NOT NULL,

    CONSTRAINT "market_data_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "incentive_programs" ADD CONSTRAINT "incentive_programs_jurisdiction_id_fkey" FOREIGN KEY ("jurisdiction_id") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eligibility_rules" ADD CONSTRAINT "eligibility_rules_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "incentive_programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tradeoff_definitions" ADD CONSTRAINT "tradeoff_definitions_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "incentive_programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pro_forma_impacts" ADD CONSTRAINT "pro_forma_impacts_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "incentive_programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stacking_rules" ADD CONSTRAINT "stacking_rules_program_a_id_fkey" FOREIGN KEY ("program_a_id") REFERENCES "incentive_programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stacking_rules" ADD CONSTRAINT "stacking_rules_program_b_id_fkey" FOREIGN KEY ("program_b_id") REFERENCES "incentive_programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_data" ADD CONSTRAINT "market_data_jurisdiction_id_fkey" FOREIGN KEY ("jurisdiction_id") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
