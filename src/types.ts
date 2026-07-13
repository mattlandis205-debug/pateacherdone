export type PSERSClassId = "T-C" | "T-D" | "T-E" | "T-F" | "T-G" | "T-H" | "DC";

export interface PSERSClass {
  id: PSERSClassId;
  name: string;
  type: "defined-benefit" | "hybrid" | "defined-contribution";
  multiplier: number; // e.g. 0.02 for 2%
  vestingYears: number;
  superannuationDescription: string;
  dcContributionRate?: string;
  employeeRate: string;
  analogy: string;
}

export interface UserProfile {
  currentAge: number;
  targetAge: number;
  classId: PSERSClassId;
  serviceYears: number;
  fas: number;
  hasBeneficiary: boolean;
  beneficiaryAge: number;
  payoutOption: "max" | "option1" | "option2" | "option3" | "option4";
  lumpSumWithdrawal: number; // accumulated deductions + interest for Option 4
  pre65Healthcare: boolean; // Needs coverage before age 65
  post65Healthcare: boolean; // Medicare + HOP supplement interest
  cbsdIncentive?: boolean;
  cbsdPremiumAmount?: number;
}

export interface CalculationResult {
  isVested: boolean;
  isSuperannuated: boolean;
  qualifiesForPremiumAssistance: boolean;
  normalRetirementAge: string;
  earlyRetirementPenalty: number; // e.g. 0.03 (3%) reduction per year under superannuation
  pensionMultiplier: number;
  grossAnnualPension: number;
  grossMonthlyPension: number;
  estimatedDcBalance: number; // For hybrid / DC classes
  optionReductions: {
    max: number;      // 100% of check
    option1: number;  // ~92% (guarantees present value paid out)
    option2: number;  // ~80% (100% survivor annuity)
    option3: number;  // ~90% (50% survivor annuity)
    option4: number;  // Reductions based on lump-sum withdrawal
  };
  healthcarePremiumEst: number; // Pre-65 cost, or post-65 HOP cost
  premiumAssistanceAmount: number; // $100 if qualified, 0 if not
  netMonthlyPension: number; // gross - healthcare + assistance
  explanationSteps: string[];
}
