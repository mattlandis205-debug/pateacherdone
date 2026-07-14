import { PSERSClass, UserProfile, CalculationResult } from "../types";

export const PSERS_CLASSES: PSERSClass[] = [
  {
    id: "T-D",
    name: "Class T-D (Hired 2001–2011, or pre-2001 upgraded - 2.50% DB)",
    type: "defined-benefit",
    multiplier: 0.025, // 2.5%
    vestingYears: 5,
    superannuationDescription: "Age 62, OR Age 60 with 30 years of service, OR 35 years of service regardless of age.",
    employeeRate: "7.50%",
    analogy: "The 'Golden Recipe': A high-yield legacy formula where you get a full 2.5% of your salary for every single year you taught. Vesting is fast, and full retirement age is lower.",
  },
  {
    id: "T-C",
    name: "Class T-C (Hired before July 1, 2001 did not upgrade - 2.00% DB)",
    type: "defined-benefit",
    multiplier: 0.020, // 2.0%
    vestingYears: 5,
    superannuationDescription: "Age 62, OR Age 60 with 30 years of service, OR 35 years of service regardless of age.",
    employeeRate: "6.25%",
    analogy: "The 'Classic Blend': Slightly lower multiplier than T-D in exchange for lower employee contributions out of every paycheck.",
  },
  {
    id: "T-E",
    name: "Class T-E (Hired 2011 - 2019 - 2.00% DB)",
    type: "defined-benefit",
    multiplier: 0.020, // 2.0%
    vestingYears: 10,
    superannuationDescription: "Age 65 with 3+ years of service, OR Rule of 92 (Age + Service >= 92 with 35+ years).",
    employeeRate: "7.50%",
    analogy: "The 'Rule of 92 Blend': A solid 2.0% multiplier. Superannuation is tied to a combined score of 92 (like having 35 years of service and being 57 years old).",
  },
  {
    id: "T-F",
    name: "Class T-F (Hired 2011 - 2019 - 2.50% DB)",
    type: "defined-benefit",
    multiplier: 0.025, // 2.5%
    vestingYears: 10,
    superannuationDescription: "Age 65 with 3+ years of service, OR Rule of 92 (Age + Service >= 92 with 35+ years).",
    employeeRate: "10.30%",
    analogy: "The 'Premium DB': Offers the premium 2.5% multiplier for newer entrants, but requires a significant 10.3% contribution from your paycheck.",
  },
  {
    id: "T-G",
    name: "Class T-G (Hired on/after July 1, 2019 - Hybrid 1.25%)",
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
    name: "Class T-H (Hired on/after July 1, 2019 - Hybrid 1.00%)",
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
    name: "Class DC (Hired on/after July 1, 2019 - 401k Only)",
    type: "defined-contribution",
    multiplier: 0,
    vestingYears: 3,
    superannuationDescription: "Age 67 (strictly retirement age for penalty-free withdrawals).",
    dcContributionRate: "7.50%",
    employeeRate: "7.50% (All into 401k)",
    analogy: "The 'Pure Nest Egg': No monthly pension check. You and the school district build a 100% customized 401(k)-style retirement nest egg. It's fully portable if you leave PA public school coaching.",
  }
];

export function calculatePSERSRetirement(rawProfile: UserProfile): CalculationResult {
  // Sanitize numeric inputs (convert empty strings to 0 or appropriate defaults)
  const profile = {
    ...rawProfile,
    currentAge: rawProfile.currentAge === "" ? 0 : Number(rawProfile.currentAge),
    targetAge: rawProfile.targetAge === "" ? 0 : Number(rawProfile.targetAge),
    serviceYears: rawProfile.serviceYears === "" ? 0 : Number(rawProfile.serviceYears),
    fas: rawProfile.fas === "" ? 0 : Number(rawProfile.fas),
    beneficiaryAge: rawProfile.beneficiaryAge === "" ? 0 : Number(rawProfile.beneficiaryAge),
    lumpSumWithdrawal: rawProfile.lumpSumWithdrawal === "" ? 0 : Number(rawProfile.lumpSumWithdrawal),
    cbsdPremiumAmount: rawProfile.cbsdPremiumAmount === undefined || rawProfile.cbsdPremiumAmount === "" ? 150 : Number(rawProfile.cbsdPremiumAmount),
  };

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
  let applySpecialEarly = false;

  if (!isSuperannuated && isVested) {
    const yearsUnder = targetSuperAge - profile.targetAge;
    const monthsUnder = yearsUnder * 12;

    // Check for Special Early Retirement eligibility
    if (profile.classId === "T-G") {
      if (profile.targetAge >= 57 && profile.serviceYears >= 25) {
        applySpecialEarly = true;
      }
    } else if (profile.classId !== "DC") {
      // T-C, T-D, T-E, T-F, T-H
      if (profile.targetAge >= 55 && profile.serviceYears >= 25) {
        applySpecialEarly = true;
      }
    }

    if (applySpecialEarly) {
      // Special Early Retirement: 0.25% per month (3.0% per year)
      earlyRetirementPenalty = monthsUnder * 0.0025;
      if (earlyRetirementPenalty > 0.50) earlyRetirementPenalty = 0.50; // Cap at 50% max reduction
      explanationSteps.push(
        `📉 Special Early Retirement (25-Year Rule): Since you are at least age ${profile.classId === "T-G" ? "57" : "55"} with 25+ years of service, your pension is reduced by a lower penalty of only 0.25% per month (3.0% per year) for being ${yearsUnder.toFixed(1)} years under superannuation. This results in a ${(earlyRetirementPenalty * 100).toFixed(1)}% permanent reduction.`
      );
    } else {
      // Standard Actuarial Reduction: estimated at 0.5% per month (6.0% per year)
      earlyRetirementPenalty = monthsUnder * 0.005;
      if (earlyRetirementPenalty > 0.65) earlyRetirementPenalty = 0.65; // Cap at 65% max reduction
      explanationSteps.push(
        `📉 Standard Actuarial Early Retirement: Since you do not meet the 25-year service rules (55/25 or 57/25), your benefit is reduced by a standard actuarial factor (estimated at 0.5% per month or 6.0% per year) for being ${yearsUnder.toFixed(1)} years under superannuation. This results in a ${(earlyRetirementPenalty * 100).toFixed(1)}% permanent reduction.`
      );
    }
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
  const hasCbsdIncentive = !!profile.cbsdIncentive;
  const qualifiesForCbsd = hasCbsdIncentive && profile.serviceYears >= 35;
  const customPremium = profile.cbsdPremiumAmount !== undefined ? profile.cbsdPremiumAmount : 150;

  // If using the CBSD active employee rate incentive, you do not receive the standard $100/mo retiree Premium Assistance
  const qualifiesForPremiumAssistance = ((profile.serviceYears >= 24.5) || (profile.serviceYears >= 15 && isSuperannuated)) && !qualifiesForCbsd;
  const premiumAssistanceAmount = qualifiesForPremiumAssistance ? 100 : 0;

  if (qualifiesForCbsd) {
    explanationSteps.push(
      `ℹ️ Premium Assistance: Since you are keeping your district group health plan under the CBSD active employee incentive, you do not receive the standard $100/mo retiree PSERS Premium Assistance.`
    );
  } else if (qualifiesForPremiumAssistance) {
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
  const needsPre65 = (profile.pre65Healthcare || hasCbsdIncentive) && profile.targetAge < 65;
  const needsPost65 = profile.post65Healthcare && profile.targetAge >= 65;

  if (needsPre65) {
    if (qualifiesForCbsd) {
      healthcarePremiumEst = customPremium;
      explanationSteps.push(
        `🎁 CBSD Health Incentive: Since you have 35+ years of service and retire as soon as eligible, you keep your active employee rate of $${customPremium.toLocaleString()}/month instead of the standard pre-65 individual rate.`
      );
    } else {
      healthcarePremiumEst = 750;
      if (hasCbsdIncentive) {
        explanationSteps.push(
          `⚠️ CBSD Health Incentive: You selected the CBSD incentive, but you do not meet the 35-year service requirement (you have ${profile.serviceYears} years). Standard pre-65 individual coverage is estimated at $750.00/month.`
        );
      } else {
        explanationSteps.push(
          `🩺 Pre-65 Healthcare Gap: Retiring at age ${profile.targetAge} means you are below the age-65 Medicare line. Individual coverage or COBRA can be extremely costly—estimated at $750.00/month.`
        );
      }
    }
  } else if (needsPost65) {
    // Post 65 Medicare + HOP Supplement
    healthcarePremiumEst = 220;
    explanationSteps.push(
      `🩺 Post-65 Medicare Supplement: Since you are age 65+, you qualify for Medicare. The PSERS Health Options Program (HOP) supplement is estimated at $220.00/month.`
    );
  } else if (profile.pre65Healthcare || profile.post65Healthcare || hasCbsdIncentive) {
    // Mixed timeline or target age transitioning
    if (profile.targetAge >= 65) {
      healthcarePremiumEst = 220;
    } else {
      healthcarePremiumEst = qualifiesForCbsd ? customPremium : 750;
    }
  }

  // 8. Payout Option Reductions
  const rAge = profile.targetAge;
  const bAge = profile.beneficiaryAge;

  // Option 1 factor: declines slightly with age
  const op1Factor = Math.max(0.90, Math.min(0.98, 0.965 - (rAge - 58) * 0.003));

  // Option 2 factor (100% Joint Survivor): depends on member age and age difference
  const baseOp2 = 0.905 - (rAge - 58) * 0.004;
  const op2Factor = Math.max(0.60, Math.min(0.98, baseOp2 + (bAge - rAge) * 0.004));

  // Option 3 factor (50% Joint Survivor): depends on member age and age difference
  const baseOp3 = 0.950 - (rAge - 58) * 0.002;
  const op3Factor = Math.max(0.75, Math.min(0.99, baseOp3 + (bAge - rAge) * 0.002));

  // Option 4 Divisor (Dollar Annuity Value / Actuarial Factor): depends on member age at retirement
  const op4Divisor = Math.max(120, Math.min(240, 201 - (rAge - 58) * 5.0));

  const optionReductions = {
    max: grossMonthlyPension,
    option1: grossMonthlyPension * op1Factor,
    option2: grossMonthlyPension * op2Factor,
    option3: grossMonthlyPension * op3Factor,
    option4: Math.max(0, grossMonthlyPension - (profile.lumpSumWithdrawal / op4Divisor))
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
    let optionText = `${profile.payoutOption.toUpperCase()}`;
    let survivorText = "";
    if (profile.payoutOption === "option2") {
      optionText = "Option 2 (100% Survivor)";
      survivorText = ` (upon your death, your beneficiary will continue to receive the identical monthly check of $${selectedOptionGross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mo for life)`;
    } else if (profile.payoutOption === "option3") {
      optionText = "Option 3 (50% Survivor)";
      survivorText = ` (upon your death, your beneficiary will receive a half-size monthly check of $${(selectedOptionGross / 2).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mo for life)`;
    } else if (profile.payoutOption === "max") {
      optionText = "Maximum Single Life";
    } else if (profile.payoutOption === "option1") {
      optionText = "Option 1 (Declining Balance)";
    } else if (profile.payoutOption === "option4") {
      optionText = "Option 4 (Lump-Sum Combo)";
    }

    explanationSteps.push(
      `💰 Net Take-Home Check: Under the ${optionText} payout plan, your gross check is $${selectedOptionGross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/month${survivorText}. Subtracting your healthcare premium ($${healthcarePremiumEst}/mo) and adding Premium Assistance (+$${premiumAssistanceAmount}/mo) leaves an estimated net monthly take-home check of $${netMonthlyPension.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`
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
