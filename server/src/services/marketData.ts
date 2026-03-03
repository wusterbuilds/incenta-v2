import { getMarketData } from "./incentiveDb";

export interface AmiRentLimits {
  [householdSize: string]: {
    amiIncome: number;
    maxRent30pct: number;
    maxRent50pct: number;
    maxRent60pct: number;
    maxRent80pct: number;
  };
}

export interface HvacCosts {
  standard: number;
  energyStar: number;
  highEfficiency: number;
}

export interface ConstructionCosts {
  lowPerSf: number;
  midPerSf: number;
  highPerSf: number;
  historicPremium: number;
}

export interface TaxRates {
  millLevy: number;
  assessmentRateResidential: number;
  assessmentRateCommercial: number;
}

export interface RentComps {
  studio: { low: number; median: number; high: number };
  oneBed: { low: number; median: number; high: number };
  twoBed: { low: number; median: number; high: number };
  threeBed: { low: number; median: number; high: number };
}

export async function getAmiRentLimits(city: string): Promise<AmiRentLimits | null> {
  const data = await getMarketData(city, "ami_levels");
  return data as AmiRentLimits | null;
}

export async function getHvacCosts(city: string): Promise<HvacCosts | null> {
  const data = await getMarketData(city, "hvac_costs");
  return data as HvacCosts | null;
}

export async function getConstructionCosts(city: string): Promise<ConstructionCosts | null> {
  const data = await getMarketData(city, "construction_costs");
  return data as ConstructionCosts | null;
}

export async function getTaxRates(city: string): Promise<TaxRates | null> {
  const data = await getMarketData(city, "tax_rates");
  return data as TaxRates | null;
}

export async function getRentComps(city: string): Promise<RentComps | null> {
  const data = await getMarketData(city, "rent_comps");
  return data as RentComps | null;
}
