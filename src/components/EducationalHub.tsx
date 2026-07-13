import React, { useState } from "react";
import { BookOpen, ShieldCheck, Heart, Coffee, ChevronRight, HelpCircle, AlertCircle } from "lucide-react";

export default function EducationalHub() {
  const [activeTab, setActiveTab] = useState<"basics" | "payouts" | "healthcare" | "analogies">("basics");

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden" id="educational-hub">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-emerald-400" />
          <h2 className="text-xl font-semibold tracking-tight font-sans">PSERS Knowledge Base & Jargon Buster</h2>
        </div>
        <p className="text-slate-300 text-sm mt-2">
          Retirement planning is full of complex regulations. We've broken down standard PSERS guides into plain, human-friendly terms.
        </p>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-100 overflow-x-auto scrollbar-none bg-slate-50">
        <button
          onClick={() => setActiveTab("basics")}
          className={`flex-1 min-w-[120px] px-5 py-4 text-sm font-medium border-b-2 transition-all flex items-center justify-center gap-2 ${
            activeTab === "basics"
              ? "border-emerald-500 text-emerald-600 bg-white font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          The Basics
        </button>
        <button
          onClick={() => setActiveTab("payouts")}
          className={`flex-1 min-w-[120px] px-5 py-4 text-sm font-medium border-b-2 transition-all flex items-center justify-center gap-2 ${
            activeTab === "payouts"
              ? "border-emerald-500 text-emerald-600 bg-white font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
          }`}
        >
          <HelpCircle className="h-4 w-4" />
          Payout Plans
        </button>
        <button
          onClick={() => setActiveTab("healthcare")}
          className={`flex-1 min-w-[120px] px-5 py-4 text-sm font-medium border-b-2 transition-all flex items-center justify-center gap-2 ${
            activeTab === "healthcare"
              ? "border-emerald-500 text-emerald-600 bg-white font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
          }`}
        >
          <Heart className="h-4 w-4" />
          HOP & Health
        </button>
        <button
          onClick={() => setActiveTab("analogies")}
          className={`flex-1 min-w-[120px] px-5 py-4 text-sm font-medium border-b-2 transition-all flex items-center justify-center gap-2 ${
            activeTab === "analogies"
              ? "border-emerald-500 text-emerald-600 bg-white font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
          }`}
        >
          <Coffee className="h-4 w-4" />
          Analogies
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === "basics" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-semibold text-slate-900 mb-2">How Your Pension is Calculated</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-3">
                Your monthly retirement check isn't a random percentage. PSERS calculates it using a standardized mathematical formula based on three strict criteria:
              </p>
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 mb-4 font-mono text-center text-emerald-950 font-medium">
                Pension Check = Final Average Salary (FAS) × Years of Service × Class Multiplier
              </div>
              <ul className="space-y-2.5">
                <li className="flex gap-2.5 items-start text-sm text-slate-600">
                  <span className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</span>
                  <span><strong>Final Average Salary (FAS):</strong> Generally the average of your highest 3 years (or 5 years depending on class) of school salary. Extra coaching, stipend or summer school pay can sometimes affect this.</span>
                </li>
                <li className="flex gap-2.5 items-start text-sm text-slate-600">
                  <span className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</span>
                  <span><strong>Years of Credited Service:</strong> Total years you've worked in PA public education. Part-time service is pro-rated (e.g. working 100 out of 180 school days is 0.55 years).</span>
                </li>
                <li className="flex gap-2.5 items-start text-sm text-slate-600">
                  <span className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</span>
                  <span><strong>Class Multiplier:</strong> Determined by your enrollment date (e.g., T-D has a legacy 2.5% multiplier, while newer hybrid classes like T-G offer a 1.25% DB pension + DC accumulation component).</span>
                </li>
              </ul>
            </div>

            <div className="border-t border-slate-100 pt-5">
              <h3 className="text-base font-semibold text-slate-900 mb-2">Vesting & Superannuation</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <h4 className="text-sm font-semibold text-slate-800 mb-1">Vesting (Locking it in)</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Vesting means you have worked enough years to legally guarantee yourself a retirement benefit. For older classes (T-C, T-D), vesting occurs after <strong>5 years</strong>. For newer classes (T-E, T-F, T-G, T-H), you must teach for <strong>10 years</strong> to vest.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <h4 className="text-sm font-semibold text-slate-800 mb-1">Superannuation (Normal Retirement)</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    This is the point where you qualify to receive your full, unreduced pension check. If you retire early, your check is permanently reduced by 3% to 5% for every year you are under superannuation age.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "payouts" && (
          <div className="space-y-6">
            <h3 className="text-base font-semibold text-slate-900 mb-2">The Four Payout Options</h3>
            <p className="text-slate-600 text-sm leading-relaxed mb-4">
              When you officially apply for retirement, you must select how you want your pension check distributed. Once chosen, this election is **irreversible**.
            </p>

            <div className="space-y-4">
              <div className="flex gap-4 p-4 rounded-xl border border-slate-100 hover:border-emerald-200 transition-colors bg-white">
                <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                  Max
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">Maximum Single Life Annuity</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Provides the highest possible monthly payment for your lifetime. However, all payments stop permanently upon your death. No funds, lump-sums, or monthly benefits carry over to your children or spouse.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-4 rounded-xl border border-slate-100 hover:border-emerald-200 transition-colors bg-white">
                <div className="h-10 w-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold shrink-0">
                  Op 1
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">Option 1: Protect Present Value Balance</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Your pension is given a "Present Value" pile of money at retirement. Each month, your check chips away at this pile. If you pass away before the pile is empty, the entire leftover balance is paid as a tax-free lump sum to your beneficiary.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-4 rounded-xl border border-slate-100 hover:border-emerald-200 transition-colors bg-white">
                <div className="h-10 w-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold shrink-0">
                  Op 2
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">Option 2: 100% Joint & Survivor Annuity</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Protects a spouse or dependent. You receive a reduced monthly check. When you pass away, your designated beneficiary continues to receive the exact same 100% check amount for the rest of their lifetime.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-4 rounded-xl border border-slate-100 hover:border-emerald-200 transition-colors bg-white">
                <div className="h-10 w-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold shrink-0">
                  Op 3
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">Option 3: 50% Joint & Survivor Annuity</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Similar to Option 2, but your beneficiary receives a 50% reduced check after you pass away. Because the survivor benefit is smaller, your starting retirement check is reduced less than in Option 2.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-4 rounded-xl border border-slate-100 hover:border-emerald-200 transition-colors bg-white">
                <div className="h-10 w-10 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center font-bold shrink-0">
                  Op 4
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">Option 4: Lump-Sum Withdrawal & Reduced Annuity</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Allows you to withdraw all your accumulated salary deductions (your contributions over the years plus interest) as a major tax-free roll-over or cash lump-sum. Doing so **permanently reduces** your monthly pension check based on an actuarial calculation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "healthcare" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-semibold text-slate-900 mb-2">The Retirement Healthcare Timeline</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                For most teachers, healthcare is the largest hidden cost in retirement. Because Medicare doesn't start until age <strong>65</strong>, teachers who retire early face a "Pre-65 Healthcare Gap" which can consume more than half of their gross pension.
              </p>

              <div className="relative border-l-2 border-emerald-200 pl-6 ml-3 space-y-6 py-1">
                <div className="relative">
                  <div className="absolute -left-[31px] top-0 h-4 w-4 rounded-full border-2 border-emerald-500 bg-white"></div>
                  <h4 className="text-sm font-semibold text-slate-800">Early Retirement (Under 65)</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Coverage is typically provided via COBRA or active employer rate pools. It is highly expensive, typically costing <strong>$600 to $950/month</strong> per individual.
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute -left-[31px] top-0 h-4 w-4 rounded-full border-2 border-emerald-500 bg-emerald-500"></div>
                  <h4 className="text-sm font-semibold text-slate-800">Medicare Transition (Age 65)</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Federal Medicare Part A & B kicks in. You can supplement Medicare with the PSERS **Health Options Program (HOP)**, which offers competitive supplement plans typically costing <strong>$180 to $280/month</strong>.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 mt-4">
              <div className="flex gap-3">
                <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-emerald-950">PSERS Premium Assistance ($100/mo)</h4>
                  <p className="text-xs text-emerald-850 mt-1 leading-relaxed">
                    PSERS provides up to **$100.00 per month** to offset your out-of-pocket healthcare costs if you meet either requirement:
                  </p>
                  <ul className="list-disc list-inside text-xs text-emerald-800 mt-2 space-y-1">
                    <li>You have at least **24.5 years** of credited PSERS service.</li>
                    <li>You have at least **15.0 years** of service AND retire at or after superannuation (normal retirement) age.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "analogies" && (
          <div className="space-y-6">
            <h3 className="text-base font-semibold text-slate-900 mb-2">Complex Rules Made Simple</h3>
            <p className="text-slate-600 text-sm leading-relaxed mb-4">
              Our analogies help you visualize and internalize key retirement mechanics without getting lost in state statutes:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-xl border border-slate-100 bg-slate-50">
                <span className="text-emerald-600 text-xs font-mono font-semibold tracking-wider uppercase">FAS (Final Average Salary)</span>
                <h4 className="text-sm font-semibold text-slate-800 mt-1">The Pension Recipe Seasoning</h4>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Think of FAS as the base broth or seasoning of your pension recipe. The higher your salary is at the peak of your career (usually your highest 3 or 5 years), the richer the flavor (monthly check) of your entire soup, no matter how many years you cook it.
                </p>
              </div>

              <div className="p-5 rounded-xl border border-slate-100 bg-slate-50">
                <span className="text-emerald-600 text-xs font-mono font-semibold tracking-wider uppercase">Superannuation Age</span>
                <h4 className="text-sm font-semibold text-slate-800 mt-1">Baking the Cake Completely</h4>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Superannuation is the official timer on the oven. If you let the timer beep fully (e.g. teaching until Age 62/65/67 depending on class), your retirement cake is completely baked and delicious. If you pull it out of the oven early (early retirement), it collapses slightly—meaning a permanent reduction penalty is taken out of your monthly checks.
                </p>
              </div>

              <div className="p-5 rounded-xl border border-slate-100 bg-slate-50">
                <span className="text-emerald-600 text-xs font-mono font-semibold tracking-wider uppercase">Option 4 Lump-Sum</span>
                <h4 className="text-sm font-semibold text-slate-800 mt-1">Taking Your Dough in Advance</h4>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Withdrawing your contributions and interest under Option 4 is like taking a large chunk of dough out of the mixing bowl before baking. It gives you immediate cash in hand to reinvest or buy a camper, but because you took the raw material out, the remaining baked monthly cake (your check) is permanently smaller.
                </p>
              </div>

              <div className="p-5 rounded-xl border border-slate-100 bg-slate-50">
                <span className="text-emerald-600 text-xs font-mono font-semibold tracking-wider uppercase">Premium Assistance</span>
                <h4 className="text-sm font-semibold text-slate-800 mt-1">The Healthcare Loyalty Coupon</h4>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Think of the $100/mo Premium Assistance as a special loyalty coupon given to the most dedicated teachers. If you put in 24.5+ years of hard work, PSERS says, "Thank you for your service—here's a monthly discount coupon to shave $100 off your expensive health insurance bill."
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
