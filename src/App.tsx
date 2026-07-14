import React, { useState, useEffect, useRef } from "react";
import {
  Calculator,
  User,
  GraduationCap,
  Calendar,
  DollarSign,
  Heart,
  HelpCircle,
  MessageSquare,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Info,
  ShieldCheck,
  AlertTriangle,
  Send,
  RefreshCw,
  PieChart as PieIcon,
  CheckCircle,
  Clock,
  Briefcase,
  Download,
  FileText
} from "lucide-react";
import { PSERS_CLASSES, calculatePSERSRetirement } from "./data/psersData";
import { PSERSClassId, UserProfile, CalculationResult } from "./types";
import EducationalHub from "./components/EducationalHub";

export default function App() {
  // 1. Initial State for User Profile
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem("pa_teacher_profile");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      currentAge: 45,
      targetAge: 62,
      classId: "T-D",
      serviceYears: 25,
      fas: 75000,
      hasBeneficiary: true,
      beneficiaryAge: 60,
      payoutOption: "max",
      lumpSumWithdrawal: 112500, // Pre-calculated standard estimate (approx. 1.5 * serviceYears * FAS * 0.08)
      pre65Healthcare: true,
      post65Healthcare: true,
      cbsdIncentive: false,
      cbsdPremiumAmount: 150,
    };
  });

  // Automatically estimate lump sum when key inputs change
  useEffect(() => {
    const selectedClass = PSERS_CLASSES.find((c) => c.id === profile.classId);
    if (!selectedClass) return;

    // Estimate employee contribution rate as a number
    const ratePercentStr = selectedClass.employeeRate.replace("%", "");
    const rate = parseFloat(ratePercentStr) / 100 || 0.075;

    // Approximate total contributions over career compounding with 4% interest
    // Contribution per year = FAS * rate
    // Compounded over serviceYears at ~4% interest
    const annualContribution = profile.fas * rate;
    const r = 0.04; // 4% PSERS statutory interest
    let estimatedLumpSum = 0;
    if (profile.serviceYears > 0) {
      estimatedLumpSum = annualContribution * ((Math.pow(1 + r, profile.serviceYears) - 1) / r);
    }

    // Keep it realistic and bounded
    setProfile((prev) => ({
      ...prev,
      lumpSumWithdrawal: Math.round(estimatedLumpSum),
    }));
  }, [profile.classId, profile.fas, profile.serviceYears]);

  // Handle individual profile field changes
  const updateProfileField = (field: keyof UserProfile, value: any) => {
    setProfile((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Persist profile changes to localStorage
  useEffect(() => {
    localStorage.setItem("pa_teacher_profile", JSON.stringify(profile));
  }, [profile]);

  // 2. Perform pension calculation
  const results: CalculationResult = calculatePSERSRetirement(profile);

  // Selected Class info
  const activeClass = PSERS_CLASSES.find((c) => c.id === profile.classId) || PSERS_CLASSES[0];

  // 3. AI Chat Box State
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>([
    {
      role: "assistant",
      text: "Hello! I am your PA Teacher Retirement Navigator. 🍏 Pennsylvania teachers are some of the hardest working educators in the nation, and you deserve a clear, empathetic guide to planning your retirement.\n\nI see you are in Class T-D with 25 years of credited service. I can help you demystify your PSERS multiplier, understand the 'healthcare gap' before age 65, or explain the 'Shrinking Pie' when withdrawing your contributions. What can I help you explore today?",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // 4. Report Print/PDF Stripe Payment State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<'print' | 'email'>('print');
  const [emailAddress, setEmailAddress] = useState('');
  const [paymentStep, setPaymentStep] = useState<'form' | 'success'>('form');
  const [emailSendingStatus, setEmailSendingStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [isChatOpen, setIsChatOpen] = useState(false);

  const handleDownloadReportClick = () => {
    setPaymentStep('form');
    setShowPaymentModal(true);
  };

  const handleGenerateFreeReport = async () => {
    if (deliveryMethod === 'print') {
      setShowPaymentModal(false);
      setTimeout(() => {
        window.print();
      }, 500);
    } else {
      setPaymentStep('success');
      setEmailSendingStatus('sending');
      try {
        const response = await fetch("/api/send-report-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            emailAddress,
            profile,
            results,
          }),
        });
        if (!response.ok) throw new Error("Failed to dispatch email");
        setEmailSendingStatus("sent");
      } catch (err) {
        console.error("Email Dispatch Error:", err);
        setEmailSendingStatus("error");
      }
    }
  };

  // Check for Stripe Checkout success redirect on page load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    const method = params.get("method") as 'print' | 'email' | null;
    const email = params.get("email");

    if (status === "success") {
      setIsPaid(true);
      const decodedEmail = email ? decodeURIComponent(email) : "";
      if (method) setDeliveryMethod(method);
      if (decodedEmail) setEmailAddress(decodedEmail);

      setPaymentStep("success");
      setShowPaymentModal(true);

      // Clean the query parameters from browser URL bar without reloading
      window.history.replaceState({}, document.title, window.location.pathname);

      if (method === "print") {
        setTimeout(() => {
          window.print();
        }, 1000);
      } else if (method === "email" && decodedEmail) {
        const sendEmail = async () => {
          setEmailSendingStatus("sending");
          try {
            const response = await fetch("/api/send-report-email", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                emailAddress: decodedEmail,
                profile,
                results,
              }),
            });
            if (!response.ok) throw new Error("Failed to dispatch email");
            setEmailSendingStatus("sent");
          } catch (err) {
            console.error("Email Dispatch Error:", err);
            setEmailSendingStatus("error");
          }
        };
        sendEmail();
      }
    }
  }, []);

  // Auto scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isGenerating]);

  // Call API for chat
  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputValue;
    if (!text.trim()) return;

    if (!textToSend) {
      setInputValue("");
    }

    // Append user message
    const updatedMessages = [...chatMessages, { role: "user" as const, text }];
    setChatMessages(updatedMessages);
    setIsGenerating(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          userData: profile,
        }),
      });

      if (!response.ok) {
        let errMsg = "Failed to contact the advisor server.";
        try {
          const errData = await response.json();
          if (errData && errData.error) {
            errMsg = errData.error;
          }
        } catch (e) {}
        throw new Error(errMsg);
      }

      const data = await response.json();
      setChatMessages((prev) => [...prev, { role: "assistant", text: data.reply }]);
    } catch (err: any) {
      console.error(err);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `⚠️ I ran into a connection error. Please make sure your GEMINI_API_KEY is configured in the Secrets panel.\n\nDetails: ${err.message}`,
        },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Suggested questions click handler
  const askSuggestedQuestion = (question: string) => {
    handleSendMessage(question);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased" id="main-container">
      {/* Top Banner */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-xs" id="app-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shrink-0">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">PA Teacher Retirement Navigator</h1>
                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-100">PSERS Expert</span>
                </div>
                <p className="text-xs text-slate-500">Empathetic retirement & healthcare simulation for Pennsylvania educators</p>
              </div>
            </div>
            
            {/* Live Status Pill */}
            <div className="flex items-center gap-1.5 bg-emerald-50/60 text-emerald-800 px-3 py-1.5 rounded-xl border border-emerald-100 self-start sm:self-auto text-xs font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Calculator Active
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" id="workspace">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: The Interactive Variable Collector (lg:col-span-5) */}
          <section className="lg:col-span-5 space-y-6" id="variable-collector-section">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-6">
              
              {/* Profile Variables Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-emerald-600" />
                  <h2 className="text-lg font-bold text-slate-900">Your Retirement Variables</h2>
                </div>
                <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-1 rounded-lg">Step-by-Step</span>
              </div>

              {/* 1. Age & Timeline */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-400" />
                  1. Age & Career Timeline
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1" htmlFor="current-age-input">Current Age</label>
                    <div className="relative">
                      <input
                        id="current-age-input"
                        type="number"
                        min="18"
                        max="90"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-emerald-500 font-semibold text-slate-800"
                        value={profile.currentAge}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateProfileField("currentAge", val === "" ? "" : parseInt(val));
                        }}
                      />
                      <span className="absolute right-3 top-2 text-xs text-slate-400">yrs</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1" htmlFor="target-age-input">Target Retirement Age</label>
                    <div className="relative">
                      <input
                        id="target-age-input"
                        type="number"
                        min={profile.currentAge || 18}
                        max="100"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-emerald-500 font-semibold text-slate-800"
                        value={profile.targetAge}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateProfileField("targetAge", val === "" ? "" : parseInt(val));
                        }}
                      />
                      <span className="absolute right-3 top-2 text-xs text-emerald-600 font-bold">Target</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1" htmlFor="credited-service-input">Years of Credited Service</label>
                    <div className="relative">
                      <input
                        id="credited-service-input"
                        type="number"
                        min="0"
                        max="55"
                        step="0.1"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-emerald-500 font-semibold text-slate-800"
                        value={profile.serviceYears}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateProfileField("serviceYears", val === "" ? "" : parseFloat(val));
                        }}
                      />
                      <span className="absolute right-3 top-2 text-xs text-slate-400">yrs</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1" htmlFor="fas-input">Final Average Salary (FAS)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs text-slate-400 font-semibold">$</span>
                      <input
                        id="fas-input"
                        type="number"
                        min="1000"
                        max="350000"
                        step="500"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-6 pr-3 text-sm focus:outline-none focus:border-emerald-500 font-semibold text-slate-800"
                        value={profile.fas}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateProfileField("fas", val === "" ? "" : parseInt(val));
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Membership Class Selection */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-slate-400" />
                    2. PSERS Membership Class
                  </h3>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">Affects Multiplier</span>
                </div>

                <div className="grid grid-cols-1 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                  {PSERS_CLASSES.map((cls) => (
                    <button
                      key={cls.id}
                      onClick={() => updateProfileField("classId", cls.id)}
                      className={`text-left p-3 rounded-xl border transition-all ${
                        profile.classId === cls.id
                          ? "border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/15"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-slate-900">{cls.name}</span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase font-bold ${
                          cls.type === "defined-benefit" ? "bg-amber-50 text-amber-700 border border-amber-100" :
                          cls.type === "hybrid" ? "bg-blue-50 text-blue-700 border border-blue-100" :
                          "bg-purple-50 text-purple-700 border border-purple-100"
                        }`}>
                          {cls.type === "defined-benefit" ? "DB Pension" : cls.type === "hybrid" ? "Hybrid DB+DC" : "DC Account"}
                        </span>
                      </div>
                      
                      {cls.type !== "defined-contribution" && (
                        <div className="text-[11px] text-slate-600 mt-1">
                          Multiplier: <strong className="text-emerald-700">{(cls.multiplier * 100).toFixed(2)}%</strong> | Employee Paycheck Contribution: <strong>{cls.employeeRate}</strong>
                        </div>
                      )}
                      {cls.type === "defined-contribution" && (
                        <div className="text-[11px] text-slate-600 mt-1">
                          District Matches: <strong>5.25%</strong> of pay | Contribution: <strong>{cls.employeeRate}</strong>
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Date of Hire Helper Card */}
                <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 text-xs leading-relaxed text-slate-600 space-y-1.5 mt-2">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span>📅</span> Which class am I? (By Date of Hire)
                  </span>
                  <ul className="space-y-1 text-[11px] list-disc pl-4 text-slate-600">
                    <li><strong>Before July 1, 2001:</strong> You are in Class <span className="font-semibold text-slate-800">T-D</span> (if you upgraded) or <span className="font-semibold text-slate-800">T-C</span> (if you didn't).</li>
                    <li><strong>July 1, 2001 – June 30, 2011:</strong> You are automatically in Class <span className="font-semibold text-slate-800">T-D</span>.</li>
                    <li><strong>July 1, 2011 – June 30, 2019:</strong> You are in Class <span className="font-semibold text-slate-800">T-E</span> or <span className="font-semibold text-slate-800">T-F</span>.</li>
                    <li><strong>On/After July 1, 2019:</strong> You are in Class <span className="font-semibold text-slate-800">T-G</span>, <span className="font-semibold text-slate-800">T-H</span>, or <span className="font-semibold text-slate-800">DC</span>.</li>
                  </ul>
                  <span className="text-[10px] text-slate-400 block pt-0.5">Note: You can verify your exact membership class on page 1 of your official annual PSERS Statement of Account.</span>
                </div>

                {/* Class Analogy Bubble */}
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-800">Your Class Analogy:</h4>
                    <p className="text-[11px] text-slate-600 leading-relaxed italic">{activeClass.analogy}</p>
                  </div>
                </div>
              </div>

              {/* 3. Advanced Option 4 & Survivor Combos */}
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <PieIcon className="h-4 w-4 text-slate-400" />
                    3. Lump-Sum & Survivor Options (Combo)
                  </h3>
                  <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-md font-bold">Advanced Option 4</span>
                </div>

                {/* The Shrinking Pie Visualizer */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl p-4 shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                    <span className="text-xs text-slate-300 font-semibold uppercase tracking-wider">The "Shrinking Pie" Analogy</span>
                    <HelpCircle className="h-4 w-4 text-slate-400" />
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    {/* SVG Pie Chart */}
                    <div className="relative h-24 w-24 shrink-0 flex items-center justify-center">
                      <svg className="h-full w-full transform -rotate-90" viewBox="0 0 32 32">
                        {/* Entire Pie Base */}
                        <circle cx="16" cy="16" r="14" fill="transparent" stroke="#10b981" strokeWidth="4" />
                        {/* Lump Sum Slice (Option 4) if withdrawn */}
                        {profile.payoutOption === "option4" && (
                          <circle
                            cx="16"
                            cy="16"
                            r="14"
                            fill="transparent"
                            stroke="#f43f5e"
                            strokeWidth="4"
                            strokeDasharray="25 100" // Takes up ~25% of the visual pie
                          />
                        )}
                      </svg>
                      {/* Inside center labels */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-[10px] text-slate-400 font-medium">Your</span>
                        <span className="text-xs font-bold leading-none text-white">Pension</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[11px] text-slate-200 leading-relaxed">
                        {profile.payoutOption === "option4" ? (
                          <>
                            🍎 <strong className="text-rose-300">Shrunk Pie Active:</strong> You chose Option 4. Slicing out your personal contributions of <strong className="text-rose-400">${profile.lumpSumWithdrawal.toLocaleString()}</strong> upfront leaves a smaller pie for monthlychecks.
                          </>
                        ) : (
                          <>
                            🥧 <strong className="text-emerald-300">Whole Pie Active:</strong> You are protecting your full monthly check amount. Taking a lump-sum later (Option 4) will shrink this pie.
                          </>
                        )}
                      </p>
                      <p className="text-[10px] text-slate-400 italic">
                        "The state takes the remaining smaller pie and turns it into monthly checks. You must still decide how to protect it."
                      </p>
                    </div>
                  </div>
                </div>

                {/* Option 4 Selector / Toggle */}
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                      checked={profile.payoutOption === "option4"}
                      onChange={(e) => {
                        updateProfileField("payoutOption", e.target.checked ? "option4" : "max");
                      }}
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">I want to withdraw my accumulated contributions (Option 4)</span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">Will reduce monthly pension but provides major upfront cash.</span>
                    </div>
                  </label>

                  {profile.payoutOption === "option4" && (
                    <div className="pt-3 border-t border-slate-200 space-y-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold text-slate-600">Estimated Lump Sum (Option 4)</span>
                          <span className="font-bold text-rose-600">${profile.lumpSumWithdrawal.toLocaleString()}</span>
                        </div>
                        <input
                          type="range"
                          min="10000"
                          max={Math.max(500000, profile.fas * 6)}
                          step="5000"
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-500"
                          value={profile.lumpSumWithdrawal}
                          onChange={(e) => updateProfileField("lumpSumWithdrawal", parseInt(e.target.value))}
                        />
                        <div className="mt-2 bg-amber-50/80 border border-amber-200/60 rounded-lg p-2.5 text-[10.5px] text-slate-700 leading-normal flex gap-1.5 items-start">
                          <Info className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <strong className="text-amber-800">Check Your PSERS Statement:</strong> This is a formula estimate. For 100% accuracy, look up your actual <strong>"Accumulated Contributions & Interest"</strong> on your official PSERS Member Self-Service statement and use this slider to adjust it.
                          </div>
                        </div>
                      </div>

                      {/* Sub-choice for the remaining pie */}
                      <div>
                        <span className="text-xs font-bold text-slate-700 block mb-1.5">How to distribute the remaining monthly checks:</span>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={() => updateProfileField("payoutOption", "option4")}
                            className={`p-2 text-center rounded-lg text-[10px] border leading-tight ${
                              profile.payoutOption === "option4" ? "border-emerald-500 bg-emerald-50 text-emerald-800 font-bold" : "border-slate-200 bg-white"
                            }`}
                          >
                            Single Life (Max Leftover)
                          </button>
                          <button
                            onClick={() => {
                              updateProfileField("payoutOption", "option2");
                              updateProfileField("hasBeneficiary", true);
                            }}
                            className={`p-2 text-center rounded-lg text-[10px] border leading-tight ${
                              profile.payoutOption === "option2" ? "border-emerald-500 bg-emerald-50 text-emerald-800 font-bold" : "border-slate-200 bg-white"
                            }`}
                          >
                            Protect Survivor 100%
                          </button>
                          <button
                            onClick={() => {
                              updateProfileField("payoutOption", "option3");
                              updateProfileField("hasBeneficiary", true);
                            }}
                            className={`p-2 text-center rounded-lg text-[10px] border leading-tight ${
                              profile.payoutOption === "option3" ? "border-emerald-500 bg-emerald-50 text-emerald-800 font-bold" : "border-slate-200 bg-white"
                            }`}
                          >
                            Protect Survivor 50%
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 italic">
                          Combining Option 4 with Option 2 or 3 protects your surviving beneficiary, but results in multiple adjustments.
                        </p>
                      </div>
                    </div>
                  )}

                  {profile.payoutOption !== "option4" && (
                    <div>
                      <span className="text-xs font-semibold text-slate-600 block mb-1.5">Select standard pension distribution:</span>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => updateProfileField("payoutOption", "max")}
                          className={`p-2 text-center rounded-lg text-[11px] border font-medium leading-tight ${
                            profile.payoutOption === "max" ? "border-emerald-500 bg-emerald-50 text-emerald-800 font-bold" : "border-slate-200 bg-white"
                          }`}
                        >
                          Max Single Life (Highest)
                        </button>
                        <button
                          onClick={() => {
                            updateProfileField("payoutOption", "option2");
                            updateProfileField("hasBeneficiary", true);
                          }}
                          className={`p-2 text-center rounded-lg text-[11px] border font-medium leading-tight ${
                            profile.payoutOption === "option2" ? "border-emerald-500 bg-emerald-50 text-emerald-800 font-bold" : "border-slate-200 bg-white"
                          }`}
                        >
                          Joint Survivor 100% (Option 2)
                        </button>
                        <button
                          onClick={() => {
                            updateProfileField("payoutOption", "option3");
                            updateProfileField("hasBeneficiary", true);
                          }}
                          className={`p-2 text-center rounded-lg text-[11px] border font-medium leading-tight ${
                            profile.payoutOption === "option3" ? "border-emerald-500 bg-emerald-50 text-emerald-800 font-bold" : "border-slate-200 bg-white"
                          }`}
                        >
                          Joint Survivor 50% (Option 3)
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Beneficiary Age Input if beneficiary protects */}
                {(profile.payoutOption === "option2" || profile.payoutOption === "option3" || profile.hasBeneficiary) && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-2 gap-4">
                    <label className="flex items-center gap-2 cursor-pointer col-span-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                        checked={profile.hasBeneficiary}
                        onChange={(e) => updateProfileField("hasBeneficiary", e.target.checked)}
                      />
                      <span className="text-xs font-bold text-slate-800">I have a spouse or beneficiary to protect</span>
                    </label>

                    {profile.hasBeneficiary && (
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-slate-500 mb-1" htmlFor="beneficiary-age-input">Beneficiary's Age</label>
                        <input
                          id="beneficiary-age-input"
                          type="number"
                          min="18"
                          max="100"
                          className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-3 text-sm focus:outline-none focus:border-emerald-500 font-semibold"
                          value={profile.beneficiaryAge}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateProfileField("beneficiaryAge", val === "" ? "" : parseInt(val));
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 4. Healthcare & HOP Timeline */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <Heart className="h-4 w-4 text-slate-400" />
                  4. Healthcare Options (HOP Timeline)
                </h3>
                <div className="space-y-2">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                      checked={profile.pre65Healthcare}
                      onChange={(e) => updateProfileField("pre65Healthcare", e.target.checked)}
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-700 block">I will need health insurance before age 65 (Pre-65 Gap)</span>
                      <span className="text-[10px] text-slate-500 block">Highly expensive! Est. $750/mo. Necessary if you retire before age 65.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                      checked={profile.post65Healthcare}
                      onChange={(e) => updateProfileField("post65Healthcare", e.target.checked)}
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-700 block">I plan to enroll in PSERS Health Options Program (HOP) at 65</span>
                      <span className="text-[10px] text-slate-500 block">Medicare supplement plans. Est. $220/mo. eligible for subsidies.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer border-t border-slate-100 pt-2.5 mt-1">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                      checked={profile.cbsdIncentive || false}
                      onChange={(e) => updateProfileField("cbsdIncentive", e.target.checked)}
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-700 block">I am a CBSD staff member retiring the first eligible year and qualify for my current healthcare premium</span>
                      <span className="text-[10px] text-slate-500 block">Keeps active district rate pre-65 if retiring at 35 years of service.</span>
                    </div>
                  </label>

                  {profile.cbsdIncentive && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mt-1.5 space-y-1.5">
                      <label className="block text-[11px] font-semibold text-slate-600" htmlFor="cbsd-premium-input">
                        Current monthly premium you pay through the district ($):
                      </label>
                      <input
                        id="cbsd-premium-input"
                        type="number"
                        min="0"
                        max="1500"
                        className="w-full bg-white border border-slate-200 rounded-lg py-1 px-2.5 text-xs focus:outline-none focus:border-emerald-500 font-semibold text-slate-800"
                        value={profile.cbsdPremiumAmount !== undefined ? profile.cbsdPremiumAmount : ""}
                        placeholder="e.g. 150"
                        onChange={(e) => {
                          const val = e.target.value;
                          updateProfileField("cbsdPremiumAmount", val === "" ? "" : parseInt(val));
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

            </div>
          </section>

          {/* RIGHT COLUMN: Calculations & Live Projection Dashboard + Advisor (lg:col-span-7) */}
          <section className="lg:col-span-7 space-y-6" id="dashboard-advisor-section">
            
            {/* Live Financial Projection Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                  <h2 className="text-lg font-bold text-slate-900">Your Retirement Projection Dashboard</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadReportClick}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <Download className="h-4 w-4 shrink-0" />
                    <span className="flex flex-col items-start leading-tight text-left">
                      <span>Download/Email Report</span>
                      <span className="text-[9px] opacity-85 font-normal">(Free Report)</span>
                    </span>
                  </button>
                  <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg text-xs font-semibold">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Live Sync
                  </div>
                </div>
              </div>

              {/* Top Summary Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className={`p-3 rounded-xl border text-center ${results.isVested ? "bg-emerald-50/50 border-emerald-100" : "bg-rose-50/50 border-rose-100"}`}>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Vested Status</span>
                  <span className={`text-xs font-extrabold mt-1 inline-block ${results.isVested ? "text-emerald-700" : "text-rose-700"}`}>
                    {results.isVested ? "Fully Vested" : "Not Vested Yet"}
                  </span>
                </div>

                <div className={`p-3 rounded-xl border text-center ${results.isSuperannuated ? "bg-emerald-50/50 border-emerald-100" : "bg-amber-50/50 border-amber-100"}`}>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Retirement Type</span>
                  <span className={`text-xs font-extrabold mt-1 inline-block ${results.isSuperannuated ? "text-emerald-700" : "text-amber-700"}`}>
                    {results.isSuperannuated ? "Superannuation (Full)" : "Early (Reduced)"}
                  </span>
                </div>

                <div className={`p-3 rounded-xl border text-center ${results.qualifiesForPremiumAssistance ? "bg-emerald-50/50 border-emerald-100" : "bg-slate-50 border-slate-200"}`}>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Premium Assistance</span>
                  <span className={`text-xs font-extrabold mt-1 inline-block ${results.qualifiesForPremiumAssistance ? "text-emerald-700" : "text-slate-500"}`}>
                    {results.qualifiesForPremiumAssistance ? "$100/mo Credit" : "Not Eligible"}
                  </span>
                </div>
              </div>

              {/* Major Calculated Totals */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Gross Pension */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                  <div>
                    <span className="text-xs text-slate-500 font-semibold block uppercase">Gross Pension Check</span>
                    <h3 className="text-3xl font-extrabold text-slate-900 mt-1">
                      ${results.grossMonthlyPension.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      <span className="text-xs text-slate-500 font-normal"> /mo</span>
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-2 leading-relaxed font-mono">
                    Annual Gross: ${(results.grossMonthlyPension * 12).toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr
                  </p>
                </div>

                {/* Net Take-Home */}
                <div className="p-5 rounded-2xl bg-emerald-600 text-white flex flex-col justify-between relative overflow-hidden shadow-xs">
                  <div className="absolute right-[-15px] bottom-[-15px] text-emerald-500 opacity-20 transform rotate-12">
                    <DollarSign className="h-28 w-28" />
                  </div>
                  <div>
                    <span className="text-xs text-emerald-100 font-semibold block uppercase">Net Monthly Take-Home</span>
                    <h3 className="text-3xl font-extrabold mt-1">
                      ${results.netMonthlyPension.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      <span className="text-xs text-emerald-100 font-normal"> /mo</span>
                    </h3>
                  </div>
                  <p className="text-[11px] text-emerald-100 mt-2 leading-relaxed z-10">
                    Gross, minus healthcare costs + premium assistance credit.
                  </p>
                </div>

              </div>

              {/* Advanced Combo / Option Matrix breakdown */}
              <div className="border-t border-slate-100 pt-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Your Custom Payout Plan Comparison</h4>
                  <span className="text-[11px] text-slate-500">Based on your FAS & Class</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50 text-slate-600 font-bold">
                        <th className="py-2.5 px-3 text-left rounded-l-lg">Payout Option Plan</th>
                        <th className="py-2.5 px-3 text-right">Lump Sum Upfront</th>
                        <th className="py-2.5 px-3 text-right">Estimated Gross Check</th>
                        <th className="py-2.5 px-3 text-right rounded-r-lg">Estimated Net Check</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      
                      {/* Row 1: Max */}
                      <tr className={`hover:bg-slate-50 ${profile.payoutOption === "max" ? "bg-emerald-50/30 font-semibold" : ""}`}>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-800">Maximum Single Life</div>
                          <div className="text-[10px] text-slate-500">No beneficiary survivor checks.</div>
                        </td>
                        <td className="py-3 px-3 text-right text-slate-400 font-mono">-</td>
                        <td className="py-3 px-3 text-right font-semibold text-slate-950">${results.optionReductions.max.toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo</td>
                        <td className="py-3 px-3 text-right text-emerald-700 font-bold">
                          ${Math.max(0, results.optionReductions.max - Math.max(0, results.healthcarePremiumEst - results.premiumAssistanceAmount)).toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo
                        </td>
                      </tr>

                      {/* Row 2: Option 1 */}
                      <tr className={`hover:bg-slate-50 ${profile.payoutOption === "option1" ? "bg-emerald-50/30 font-semibold" : ""}`}>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-800">Option 1 (Declining Balance)</div>
                          <div className="text-[10px] text-slate-500">Beneficiary gets leftover Present Value.</div>
                        </td>
                        <td className="py-3 px-3 text-right text-slate-400 font-mono">-</td>
                        <td className="py-3 px-3 text-right text-slate-950">${results.optionReductions.option1.toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo</td>
                        <td className="py-3 px-3 text-right text-emerald-700 font-bold">
                          ${Math.max(0, results.optionReductions.option1 - Math.max(0, results.healthcarePremiumEst - results.premiumAssistanceAmount)).toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo
                        </td>
                      </tr>

                      {/* Row 3: Option 2 */}
                      <tr className={`hover:bg-slate-50 ${profile.payoutOption === "option2" ? "bg-emerald-50/30 font-semibold" : ""}`}>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-800">Option 2 (100% Survivor)</div>
                          <div className="text-[10px] text-slate-500">Protects spouse with identical check.</div>
                        </td>
                        <td className="py-3 px-3 text-right text-slate-400 font-mono">-</td>
                        <td className="py-3 px-3 text-right text-slate-950">${results.optionReductions.option2.toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo</td>
                        <td className="py-3 px-3 text-right text-emerald-700 font-bold">
                          ${Math.max(0, results.optionReductions.option2 - Math.max(0, results.healthcarePremiumEst - results.premiumAssistanceAmount)).toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo
                        </td>
                      </tr>

                      {/* Row 4: Option 3 */}
                      <tr className={`hover:bg-slate-50 ${profile.payoutOption === "option3" ? "bg-emerald-50/30 font-semibold" : ""}`}>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-800">Option 3 (50% Survivor)</div>
                          <div className="text-[10px] text-slate-500">Protects spouse with half-size check.</div>
                        </td>
                        <td className="py-3 px-3 text-right text-slate-400 font-mono">-</td>
                        <td className="py-3 px-3 text-right text-slate-950">${results.optionReductions.option3.toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo</td>
                        <td className="py-3 px-3 text-right text-emerald-700 font-bold">
                          ${Math.max(0, results.optionReductions.option3 - Math.max(0, results.healthcarePremiumEst - results.premiumAssistanceAmount)).toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo
                        </td>
                      </tr>

                      {/* Row 4: Option 4 Combo */}
                      <tr className={`hover:bg-rose-50/20 ${profile.payoutOption === "option4" ? "bg-rose-50/40 font-bold border-l-4 border-rose-500" : ""}`}>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-800">Option 4 (Lump-Sum Combo)</div>
                          <div className="text-[10px] text-slate-500">You withdraw accumulated deductions.</div>
                        </td>
                        <td className="py-3 px-3 text-right text-rose-600 font-bold">${profile.lumpSumWithdrawal.toLocaleString()}</td>
                        <td className="py-3 px-3 text-right text-slate-950">${results.optionReductions.option4.toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo</td>
                        <td className="py-3 px-3 text-right text-emerald-700 font-bold">
                          ${results.netMonthlyPension.toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo
                        </td>
                      </tr>

                    </tbody>
                  </table>
                </div>
              </div>

              {/* Simulator Explanation Steps */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Detailed Scenario Notes</span>
                <ul className="space-y-2">
                  {results.explanationSteps.map((step, idx) => (
                    <li key={idx} className="text-xs text-slate-600 leading-relaxed flex gap-2">
                      <span className="text-emerald-500 shrink-0">•</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>

            {/* Floating Advisor Button */}
            {!isChatOpen && (
              <button
                onClick={() => setIsChatOpen(true)}
                className="fixed bottom-6 right-6 z-40 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-3 rounded-full shadow-2xl flex items-center gap-2 transition-all hover:scale-105 cursor-pointer border border-emerald-500/20 print:hidden"
              >
                <MessageSquare className="h-4.5 w-4.5" />
                <span className="text-xs">Ask PSERS Advisor</span>
                <span className="h-2 w-2 rounded-full bg-red-500 animate-ping absolute top-0 right-0 -mt-0.5 -mr-0.5"></span>
                <span className="h-2 w-2 rounded-full bg-red-500 absolute top-0 right-0 -mt-0.5 -mr-0.5"></span>
              </button>
            )}

            {/* Slide-out Advisor Drawer */}
            {isChatOpen && (
              <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs print:hidden">
                {/* Backdrop close area */}
                <div className="flex-1" onClick={() => setIsChatOpen(false)} />
                
                {/* Drawer container */}
                <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col text-slate-800">
                  {/* Drawer Header */}
                  <div className="bg-slate-950 p-4 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                        <MessageSquare className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">Ask Your Navigator Advisor</h3>
                        <p className="text-[10px] text-slate-400">Empathy-driven PSERS & Healthcare guidance</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsChatOpen(false)}
                      className="text-slate-400 hover:text-white text-lg transition-colors p-1 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Chat Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                    {chatMessages.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed whitespace-pre-wrap ${
                            msg.role === "user"
                              ? "bg-emerald-600 text-white rounded-tr-none"
                              : "bg-white text-slate-800 border border-slate-100 rounded-tl-none shadow-xs"
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))}

                    {isGenerating && (
                      <div className="flex justify-start">
                        <div className="bg-white text-slate-500 border border-slate-100 rounded-2xl p-4 text-xs flex items-center gap-2">
                          <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-500" />
                          <span>Navigator is analyzing your retirement options...</span>
                        </div>
                      </div>
                    )}
                    <div ref={chatBottomRef} />
                  </div>

                  {/* Suggestion Prompts */}
                  <div className="p-3 border-t border-slate-100 bg-white flex gap-2 overflow-x-auto scrollbar-none shrink-0">
                    <button
                      onClick={() => askSuggestedQuestion("What is my early retirement penalty and how can I avoid it?")}
                      className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[10px] font-medium rounded-full border border-slate-200 shrink-0 transition-colors cursor-pointer"
                    >
                      📉 Explaining penalties
                    </button>
                    <button
                      onClick={() => askSuggestedQuestion("How does the 'Shrinking Pie' work for Option 4 lump sum and survivor options?")}
                      className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[10px] font-medium rounded-full border border-slate-200 shrink-0 transition-colors cursor-pointer"
                    >
                      🥧 'Shrinking Pie' Analogy
                    </button>
                    <button
                      onClick={() => askSuggestedQuestion("Am I eligible for Health HOP Premium Assistance?")}
                      className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[10px] font-medium rounded-full border border-slate-200 shrink-0 transition-colors cursor-pointer"
                    >
                      🩺 Health HOP Assistance
                    </button>
                  </div>

                  {/* Chat Input */}
                  <div className="p-3 border-t border-slate-100 bg-white shrink-0">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSendMessage();
                      }}
                      className="flex gap-2"
                    >
                      <input
                        type="text"
                        placeholder="Ask about FAS formulas, Option 1-4..."
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors text-slate-800"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        disabled={isGenerating}
                      />
                      <button
                        type="submit"
                        disabled={isGenerating || !inputValue.trim()}
                        className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-55 disabled:hover:bg-emerald-600 text-white rounded-xl px-4 py-2 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* Educational Hub Knowledge Base */}
            <EducationalHub />

          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 px-4 border-t border-slate-800 text-center text-xs mt-12" id="app-footer">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="bg-slate-800/30 border border-slate-800/60 rounded-xl p-4 max-w-2xl mx-auto text-slate-300 leading-relaxed">
            <span className="font-bold text-emerald-400 block mb-1">🍏 A Note From the Creator</span>
            This app was created by Matt Landis, a current PA teacher who spent hours trying to understand this confusing topic. He hopes this makes it easier on you!
          </div>
          <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-3.5 max-w-2xl mx-auto text-slate-400 leading-relaxed">
            <span className="font-bold text-amber-500 uppercase tracking-wider block mb-1">⚠️ Legal Disclaimer</span>
            This tool is for educational and simulation purposes only. Pension estimates are approximations and do not constitute official PSERS calculations, legal, tax, or financial advice. Please consult with PSERS directly or a certified financial planner before making any retirement decisions.
          </div>
          <p className="text-slate-500 text-[10px]">Estimates are based on standard statutory rates, rules of 92/97, and basic actuarial reductions.</p>
        </div>
      </footer>

      {/* Stripe-like Mock Checkout Modal */}
      {showPaymentModal && (
        <div id="payment-checkout-modal" className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center z-[1000] p-4 print:hidden">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-100 shadow-2xl overflow-hidden text-left text-slate-800">
            {/* Modal Header */}
            <div className="bg-slate-950 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-400" />
                <span className="font-bold text-sm tracking-wide">Generate Retirement Report</span>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-white transition-colors text-lg cursor-pointer animate-none"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            {paymentStep === 'form' ? (
              <div className="p-6 space-y-5">
                {/* Product Info */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-800 text-xs block">Premium Retirement Report</span>
                    <span className="text-[10px] text-slate-500 block">Personalized PSERS scenario projections</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full uppercase">Free Beta</span>
                </div>

                {/* Choose Delivery Method */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Select Delivery Method</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDeliveryMethod('print')}
                      className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                        deliveryMethod === 'print'
                          ? 'border-emerald-500 bg-emerald-50/50 text-emerald-800'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <span>🖨️ Print / Save as PDF</span>
                      <span className="text-[9px] text-slate-400 font-normal">Save directly to device</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryMethod('email')}
                      className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                        deliveryMethod === 'email'
                          ? 'border-emerald-500 bg-emerald-50/50 text-emerald-800'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <span>📧 Email PDF Report</span>
                      <span className="text-[9px] text-slate-400 font-normal">Send to your inbox</span>
                    </button>
                  </div>
                </div>

                {/* Conditional Email Field */}
                {deliveryMethod === 'email' && (
                  <div className="animate-fadeIn">
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1" htmlFor="delivery-email-input">
                      Email Address
                    </label>
                    <input
                      id="delivery-email-input"
                      type="email"
                      required
                      value={emailAddress}
                      onChange={(e) => setEmailAddress(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-emerald-500 font-semibold text-slate-800"
                      placeholder="teacher@district.edu"
                    />
                  </div>
                )}

                {/* Free Access Information */}
                <div className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-3.5 flex gap-2.5 text-xs text-slate-600 leading-normal">
                  <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-emerald-800 block mb-0.5">Free Beta Access</strong>
                    Your complete retirement projection will be instantly compiled and either printed or emailed directly to your inbox for free.
                  </div>
                </div>

                {/* Generate Button */}
                <button
                  type="button"
                  onClick={handleGenerateFreeReport}
                  disabled={deliveryMethod === 'email' && !emailAddress.trim()}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-55 disabled:hover:bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <FileText className="h-4 w-4" />
                  {deliveryMethod === 'print' ? "Compile & Print Report" : "Compile & Email Report"}
                </button>
              </div>
            ) : (
              /* Success Screen */
              <div className="p-6 text-center space-y-4 animate-scaleIn">
                {deliveryMethod === 'print' ? (
                  <>
                    <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                      <CheckCircle className="h-10 w-10 animate-bounce" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-base font-bold text-slate-900">Report Compiled!</h4>
                      <p className="text-xs text-slate-500">Your custom retirement simulation is ready.</p>
                    </div>
                    
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2 text-left">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block font-bold">Report Ready</span>
                      <p className="text-xs text-slate-700 leading-normal">
                        Your premium report has been unlocked. Your browser's print dialog should have opened automatically.
                      </p>
                      <p className="text-[10px] text-slate-400 italic">
                        Select "Save as PDF" in your print destination to download it to your device.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs transition-colors cursor-pointer"
                      >
                        🖨️ Re-open Print Dialog
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowPaymentModal(false)}
                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-2 rounded-xl text-xs transition-colors cursor-pointer"
                      >
                        Done
                      </button>
                    </div>
                  </>
                ) : (
                  /* Email Delivery States */
                  <>
                    {emailSendingStatus === 'sending' && (
                      <div className="space-y-4 py-4">
                        <div className="h-16 w-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
                          <RefreshCw className="h-8 w-8 animate-spin" />
                        </div>
                        <div className="space-y-1.5">
                          <h4 className="text-base font-bold text-slate-900">Generating & Emailing Report...</h4>
                          <p className="text-xs text-slate-500 max-w-xs mx-auto">
                            Stripe payment succeeded! We are compiling your custom calculations and dispatching them to your inbox.
                          </p>
                        </div>
                      </div>
                    )}

                    {emailSendingStatus === 'sent' && (
                      <>
                        <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                          <CheckCircle className="h-10 w-10 animate-bounce" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-base font-bold text-slate-900">Email Dispatched!</h4>
                          <p className="text-xs text-slate-500">Transaction processed securely via Stripe.</p>
                        </div>
                        
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2 text-left">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block font-bold">Delivery Confirmation</span>
                          <p className="text-xs text-slate-700 leading-normal font-medium">
                            🍏 Your premium retirement report has been successfully generated and emailed to:
                          </p>
                          <p className="text-xs font-bold text-slate-900 font-mono break-all text-center p-2 bg-emerald-50/50 border border-emerald-100 rounded-lg text-emerald-800">
                            {emailAddress}
                          </p>
                          <p className="text-[10px] text-slate-400 italic text-center">
                            Please check your inbox (and spam folder) in a few minutes!
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => window.print()}
                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-2 rounded-xl text-xs transition-colors cursor-pointer"
                          >
                            🖨️ Also Print/Save PDF
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowPaymentModal(false)}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs transition-colors cursor-pointer"
                          >
                            Done
                          </button>
                        </div>
                      </>
                    )}

                    {emailSendingStatus === 'error' && (
                      <>
                        <div className="h-16 w-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto border border-amber-200">
                          <AlertTriangle className="h-10 w-10 animate-pulse" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-base font-bold text-slate-900">Email Delivery Failed</h4>
                          <p className="text-xs text-slate-500">Stripe payment succeeded, but the email dispatcher failed.</p>
                        </div>
                        
                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 space-y-2 text-left">
                          <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider block font-bold">What to do</span>
                          <p className="text-xs text-slate-700 leading-normal">
                            Don't worry! Your account has been unlocked. You can immediately save or print your report directly by clicking the print button below.
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => window.print()}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs transition-colors cursor-pointer"
                          >
                            🖨️ Print / Save as PDF
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowPaymentModal(false)}
                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-2 rounded-xl text-xs transition-colors cursor-pointer"
                          >
                            Close
                          </button>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
