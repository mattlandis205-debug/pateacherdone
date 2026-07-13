import { PSERSClass, UserProfile, CalculationResult } from "../types";

export const PSERS_CLASSES: PSERSClass[] = [
  {
    id: "T-D",
    name: "Class T-D (Standard Older Class)",
    type: "defined-benefit",
    multiplier: 0.025, // 2.5%
    vestingYears: 5,
    superannuationDescription: "Age 62, OR Age 60 with 30 years of service, OR 35 years of service regardless of age.",
    employeeRate: "7.50%",
    analogy: "The 'Golden Recipe': A high-yield legacy formula where you get a full 2.5% of your salary for every single year you taught. Vesting is fast, and full retirement age is lower.",
  },
  {
    id: "T-C",
    name: "Class T-C (Alternative Older Class)",
    type: "defined-benefit",
    multiplier: 0.020, // 2.0%
    vestingYears: 5,
    superannuationDescription: "Age 62, OR Age 60 with 30 years of service, OR 35 years of service regardless of age.",
    employeeRate: "6.25%",
    analogy: "The 'Classic Blend': Slightly lower multiplier than T-D in exchange for lower employee contributions out of every paycheck.",
  },
  {
    id: "T-E",
    name: "Class T-E (Vested Mid-Tier Class)",
    type: "defined-benefit",
    multiplier: 0.020, // 2.0%
    vestingYears: 10,
    superannuationDescription: "Age 65 with 3+ years of service, OR Rule of 92 (Age + Service >= 92 with 35+ years).",
    employeeRate: "7.50%",
    analogy: "The 'Rule of 92 Blend': A solid 2.0% multiplier. Superannuation is tied to a combined score of 92 (like having 35 years of service and being 57 years old).",
  },
  {
    id: "T-F",
    name: "Class T-F (High-Contribution Mid-Tier)",
    type: "defined-benefit",
    multiplier: 0.025, // 2.5%
    vestingYears: 10,
    superannuationDescription: "Age 65 with 3+ years of service, OR Rule of 92 (Age + Service >= 92 with 35+ years).",
    employeeRate: "10.30%",
    analogy: "The 'Premium DB': Offers the premium 2.5% multiplier for newer entrants, but requires a significant 10.3% contribution from your paycheck.",
  },
  {
    id: "T-G",
    name: "Class T-G (Modern Hybrid - 1.25% DB)",
    type: "hybrid",
    multiplier: 0.0125, // 1.25% DB
    vestingYears: 10, // 10 for DB, 3 for DC
    superannuationDescription: "Age 67 with 3+ years of service, OR Rule of 97 (Age + Service >= 97 with 35+ years).",
    dcContributionRate: "2.50% (voluntary higher)",
    employeeRate: "5.50% (3.0% Pension + 2.5% DC)",
    analogy: "The 'Modern Dual-Engine': Half pension and half investment account. You get a guaranteed 1.25% pension check plus a 401(k)-style cash balance where the school district contributes 2.25% of your pay.",
  },
  {
    id: "T-H",
    name: "Class T-H (Modern Hybrid - 1.00% DB)",
    type: "hybrid",
    multiplier: 0.010, // 1.0% DB
    vestingYears: 10, // 10 for DB, 3 for DC
    superannuationDescription: "Age 67 with 3+ years of service, OR Rule of 97 (Age + Service >= 97 with 35+ years).",
    dcContributionRate: "3.00% (voluntary higher)",
    employeeRate: "4.50% (1.5% Pension + 3.0% DC)",
    analogy: "The 'Investment-Leaning Hybrid': Lower guaranteed pension (1.0%) but puts more money (3.0% from you, 2.0% from the school) into your 401(k)-style investment stack.",
  },
  {
    id: "DC",
    name: "Class DC (Defined Contribution Only)",
    type: "defined-contribution",
    multiplier: 0,
    vestingYears: 3,
    superannuationDescription: "Age 67 (strictly retirement age for penalty-free withdrawals).",
    dcContributionRate: "7.50%",
    employeeRate: "7.50% (All into 401k)",
    analogy: "The 'Pure Nest Egg': No monthly pension check. You and the school district build a 100% customized 401(k)-style retirement nest egg. It's fully portable if you leave PA public school coaching.",
  }
];

export function calculatePSERSRetirement(profile: UserProfile): CalculationResult {
  const currentClass = PSERS_CLASSES.find((c) => c.id === profile.classId) || PSERS_CLASSES[0];
  const explanationSteps: string[] = [];

  // 1. Vesting check
  const isVested = profile.serviceYears >= currentClass.vestingYears;
  explanationSteps.push(
    isVested
      ? `✅ Vested: You have ${profile.serviceYears} years of service. Since Class ${profile.classId} requires ${currentClass.vestingYears} years, you are fully vested and guaranteed a benefit!`
      : `⚠️ Not Fully Vested: You have ${profile.serviceYears} years, but Class ${profile.classId} requires ${currentClass.vestingYears} years to lock in your retirement benefit.`
  );

  // 2. Superannuation check
  let isSuperannuated = false;
  let targetSuperAge = 65;
  let normalRetirementAgeStr = "";

  if (profile.classId === "T-C" || profile.classId === "T-D") {
    targetSuperAge = 62;
    const has30YearsAnd60 = profile.serviceYears >= 30 && profile.targetAge >= 60;
    const has35Years = profile.serviceYears >= 35;
    
    if (profile.targetAge >= 62 || has30YearsAnd60 || has35Years) {
      isSuperannuated = true;
    }
    
    if (has35Years) {
      normalRetirementAgeStr = "Superannuation met via 35+ Years of Service!";
    } else if (has30YearsAnd60) {
      normalRetirementAgeStr = "Superannuation met via Age 60 with 30+ Years of Service!";
    } else {
      normalRetirementAgeStr = "Superannuation age is 62.";
    }
  } else if (profile.classId === "T-E" || profile.classId === "T-F") {
    targetSuperAge = 65;
    const ruleOf92Met = (profile.targetAge + profile.serviceYears >= 92) && (profile.serviceYears >= 35);
    
    if (profile.targetAge >= 65 || ruleOf92Met) {
      isSuperannuated = true;
    }
    
    if (ruleOf92Met) {
      normalRetirementAgeStr = `Superannuation met via 'Rule of 92' (Age ${profile.targetAge} + Service ${profile.serviceYears} = ${profile.targetAge + profile.serviceYears})`;
    } else {
      normalRetirementAgeStr = "Superannuation age is 65.";
    }
  } else if (profile.classId === "T-G" || profile.classId === "T-H" || profile.classId === "DC") {
    targetSuperAge = 67;
    const ruleOf97Met = (profile.targetAge + profile.serviceYears >= 97) && (profile.serviceYears >= 35);
    
    if (profile.targetAge >= 67 || ruleOf97Met) {
      isSuperannuated = true;
    }
    
    if (ruleOf97Met) {
      normalRetirementAgeStr = `Superannuation met via 'Rule of 97' (Age ${profile.targetAge} + Service ${profile.serviceYears} = ${profile.targetAge + profile.serviceYears})`;
    } else {
      normalRetirementAgeStr = "Superannuation age is 67.";
    }
  }

  explanationSteps.push(
    isSuperannuated
      ? `🎉 Superannuation Achieved! You will reach full retirement status at Age ${profile.targetAge}. You receive 100% of your pension check without early penalties. (${normalRetirementAgeStr})`
      : `⚠️ Early Retirement: Your target age ${profile.targetAge} is below the standard full retirement threshold (${targetSuperAge}). An early retirement reduction penalty will apply to your monthly checks.`
  );

  // 3. Early Retirement Penalty Calculation
  let earlyRetirementPenalty = 0;
  if (!isSuperannuated && isVested) {
    const yearsUnder = targetSuperAge - profile.targetAge;
    // Older classes have 3% per year penalty, newer have 5% per year penalty
    const penaltyRate = (profile.classId === "T-C" || profile.classId === "T-D") ? 0.03 : 0.05;
    earlyRetirementPenalty = yearsUnder * penaltyRate;
    if (earlyRetirementPenalty > 0.50) earlyRetirementPenalty = 0.50; // Cap at 50% max reduction

    explanationSteps.push(
      `📉 Early Retirement Penalty: You are retiring ${yearsUnder.toFixed(1)} years prior to age ${targetSuperAge}. This results in a ${(earlyRetirementPenalty * 100).toFixed(1)}% permanent reduction in your monthly pension.`
    );
  }

  // 4. Gross DB Pension core formula: FAS * Service * Multiplier
  const pensionMultiplier = profile.serviceYears * currentClass.multiplier;
  let grossAnnualPension = profile.fas * pensionMultiplier;

  // Apply early penalty if applicable
  if (earlyRetirementPenalty > 0 && !isSuperannuated) {
    grossAnnualPension = grossAnnualPension * (1 - earlyRetirementPenalty);
  }

  // Pure DC class has no DB pension
  if (profile.classId === "DC") {
    grossAnnualPension = 0;
  }

  const grossMonthlyPension = grossAnnualPension / 12;

  explanationSteps.push(
    profile.classId !== "DC"
      ? `📐 Core Formula Applied: FAS ($${profile.fas.toLocaleString()}) × Service (${profile.serviceYears} yrs) × Class Multiplier (${(currentClass.multiplier * 100).toFixed(2)}%) = $${(profile.fas * pensionMultiplier).toLocaleString()}/yr standard. After early retirement adjustments (if any), your gross monthly pension is $${grossMonthlyPension.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`
      : "📐 Pure Defined Contribution Plan: Your retirement is funded entirely by your custom investment portfolio. There is no formulaic defined benefit monthly pension."
  );

  // 5. Estimate DC balance
  // A realistic simple projection for Defined Contribution component
  let estimatedDcBalance = 0;
  if (currentClass.type === "hybrid" || currentClass.type === "defined-contribution") {
    const dcRate = profile.classId === "DC" ? 0.075 : (profile.classId === "T-G" ? 0.0225 : 0.020);
    // Projecting assuming average salary over career and 5% interest
    // Let's project with a standard compounding formula based on service years
    const annualContribution = profile.fas * dcRate;
    const r = 0.055; // 5.5% annual return
    // Compounding annuity formula: PMT * (((1 + r)^n - 1) / r)
    if (profile.serviceYears > 0) {
      estimatedDcBalance = annualContribution * ((Math.pow(1 + r, profile.serviceYears) - 1) / r);
    }
    explanationSteps.push(
      `📈 Defined Contribution Stack: Based on your ${profile.serviceYears} years of service and class rules, your 401(k)-style DC retirement account is estimated to grow to roughly $${Math.round(estimatedDcBalance).toLocaleString()} (assuming an average 5.5% historical return).`
    );
  }

  // 6. Premium Assistance
  // Eligibility: 24.5+ years of service OR (15+ years of service AND superannuated)
  const qualifiesForPremiumAssistance = (profile.serviceYears >= 24.5) || (profile.serviceYears >= 15 && isSuperannuated);
  const premiumAssistanceAmount = qualifiesForPremiumAssistance ? 100 : 0;

  if (qualifiesForPremiumAssistance) {
    explanationSteps.push(
      `💖 Premium Assistance Eligible! You qualify for the PSERS Health Options Program (HOP) premium assistance. The state will credit up to $100.00/month directly toward your monthly health insurance premium!`
    );
  } else {
    explanationSteps.push(
      `ℹ️ Premium Assistance: You currently do not meet the 24.5-year service threshold, or the 15-year service + superannuation threshold, to receive the $100/mo health insurance subsidy.`
    );
  }

  // 7. Healthcare Costs Estimates
  let healthcarePremiumEst = 0;
  if (profile.pre65Healthcare && profile.targetAge < 65) {
    // Under 65 is expensive
    healthcarePremiumEst = 750;
    explanationSteps.push(
      `🩺 Pre-65 Healthcare Gap: Retiring at age ${profile.targetAge} means you are below the age-65 Medicare line. Individual coverage or COBRA can be extremely costly—estimated at $750.00/month.`
    );
  } else if (profile.post65Healthcare && profile.targetAge >= 65) {
    // Post 65 Medicare + HOP Supplement
    healthcarePremiumEst = 220;
    explanationSteps.push(
      `🩺 Post-65 Medicare Supplement: Since you are age 65+, you qualify for Medicare. The PSERS Health Options Program (HOP) supplement is estimated at $220.00/month.`
    );
  } else if (profile.pre65Healthcare || profile.post65Healthcare) {
    // Mixed timeline or target age transitioning
    healthcarePremiumEst = profile.targetAge >= 65 ? 220 : 750;
  }

  // 8. Payout Option Reductions
  const ageDiff = profile.beneficiaryAge - profile.targetAge;
  const op2Factor = Math.max(0.65, Math.min(0.95, 0.82 + ageDiff * 0.005));
  const op3Factor = Math.max(0.80, Math.min(0.97, 0.90 + ageDiff * 0.0025));

  const optionReductions = {
    max: grossMonthlyPension,
    option1: grossMonthlyPension * 0.94,
    option2: grossMonthlyPension * op2Factor,
    option3: grossMonthlyPension * op3Factor,
    option4: Math.max(0, grossMonthlyPension - (profile.lumpSumWithdrawal / 130))
  };

  // 9. Net Monthly Pension calculation based on selected option
  let selectedOptionGross = optionReductions.max;
  if (profile.payoutOption === "option1") selectedOptionGross = optionReductions.option1;
  else if (profile.payoutOption === "option2") selectedOptionGross = optionReductions.option2;
  else if (profile.payoutOption === "option3") selectedOptionGross = optionReductions.option3;
  else if (profile.payoutOption === "option4") selectedOptionGross = optionReductions.option4;

  // Net = Gross - Healthcare + Assistance
  const netMonthlyPension = isVested
    ? Math.max(0, selectedOptionGross - Math.max(0, healthcarePremiumEst - premiumAssistanceAmount))
    : 0;

  if (isVested && profile.classId !== "DC") {
    explanationSteps.push(
      `💰 Net Take-Home Check: Under the ${profile.payoutOption.toUpperCase()} payout plan, your gross check is $${selectedOptionGross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/month. Subtracting your healthcare premium ($${healthcarePremiumEst}/mo) and adding Premium Assistance (+$${premiumAssistanceAmount}/mo) leaves an estimated net monthly take-home check of $${netMonthlyPension.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`
    );
  }

  return {
    isVested,
    isSuperannuated,
    qualifiesForPremiumAssistance,
    normalRetirementAge: targetSuperAge.toString(),
    earlyRetirementPenalty,
    pensionMultiplier,
    grossAnnualPension,
    grossMonthlyPension,
    estimatedDcBalance,
    optionReductions,
    healthcarePremiumEst,
    premiumAssistanceAmount,
    netMonthlyPension,
    explanationSteps,
  };
}
