import { PrismaClient } from "@prisma/client";
import { ProgramWithRelations } from "../types";

const prisma = new PrismaClient();

const programInclude = {
  jurisdiction: true,
  eligibilityRules: true,
  tradeoffs: true,
  proFormaImpacts: true,
  stackingRulesAsA: true,
  stackingRulesAsB: true,
} as const;

function normalizeProgramDecimals(program: any): ProgramWithRelations {
  return {
    ...program,
    creditRate: program.creditRate ? Number(program.creditRate) : null,
    tradeoffs: program.tradeoffs.map((t: any) => ({
      ...t,
      costMultiplier: t.costMultiplier ? Number(t.costMultiplier) : null,
      fixedCost: t.fixedCost ? Number(t.fixedCost) : null,
    })),
  };
}

export async function getAllProgramsForJurisdiction(
  state: string,
  city: string
): Promise<ProgramWithRelations[]> {
  const programs = await prisma.incentiveProgram.findMany({
    where: {
      isActive: true,
      jurisdiction: {
        OR: [
          { level: "federal" },
          { stateCode: state.toUpperCase() },
          { name: { contains: city, mode: "insensitive" } },
        ],
      },
    },
    include: programInclude,
  });

  return programs.map(normalizeProgramDecimals);
}

export async function getProgramWithDetails(
  programId: string
): Promise<ProgramWithRelations | null> {
  const program = await prisma.incentiveProgram.findUnique({
    where: { id: programId },
    include: programInclude,
  });

  return program ? normalizeProgramDecimals(program) : null;
}

export async function getStackingRules(programIds: string[]) {
  return prisma.stackingRule.findMany({
    where: {
      OR: [
        { programAId: { in: programIds }, programBId: { in: programIds } },
        { programBId: { in: programIds }, programAId: { in: programIds } },
      ],
    },
  });
}

export async function getMarketData(
  jurisdictionCity: string,
  dataType: string
): Promise<unknown | null> {
  const record = await prisma.marketData.findFirst({
    where: {
      dataType,
      jurisdiction: {
        name: { contains: jurisdictionCity, mode: "insensitive" },
      },
    },
    orderBy: { year: "desc" },
  });

  return record?.dataPayload ?? null;
}
