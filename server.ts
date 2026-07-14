import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import Stripe from "stripe";
import { Resend } from "resend";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";
// Initialize stripe (Stripe SDK v14+ handles CJS/ESM cleanly)
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

const resendApiKey = process.env.RESEND_API_KEY || "";
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Initialize Google GenAI on the server
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  : null;

app.use(express.json());

// API health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", aiEnabled: !!ai });
});

// Chat endpoint proxying to Gemini
app.post("/api/chat", async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({
        error: "Gemini API key is not configured. Please add your GEMINI_API_KEY in the Secrets panel.",
      });
    }

    const { messages, userData } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid request: 'messages' array is required." });
    }

    // Construct profile context if user data exists
    let profileContext = "";
    if (userData) {
      const {
        currentAge,
        targetAge,
        classId,
        serviceYears,
        fas,
        hasBeneficiary,
        beneficiaryAge,
        healthcareTimeline,
        cbsdIncentive,
        cbsdPremiumAmount,
      } = userData;

      profileContext = `\n\nCURRENT TEACHER PROFILE FOR RETIREMENT CALCULATION:
- Current Age: ${currentAge || "Not provided"}
- Target Retirement Age: ${targetAge || "Not provided"}
- PSERS Membership Class: ${classId || "Not selected"}
- Years of Credited Service: ${serviceYears || "Not provided"}
- Final Average Salary (FAS): $${fas ? Number(fas).toLocaleString() : "Not provided"}
- Beneficiary: ${hasBeneficiary ? `Yes (Age ${beneficiaryAge || "unknown"})` : "No"}
- Healthcare Timeline Interest: ${healthcareTimeline || "Pre-65 & Post-65 Medicare HOP"}
- CBSD Staff Health Incentive: ${cbsdIncentive ? `Yes ($${cbsdPremiumAmount || 0}/mo)` : "No"}`;
    }

    const systemInstruction = `You are the "PA Teacher Retirement Navigator", an empathetic, highly knowledgeable, and patient educational AI retirement planner for Pennsylvania public school teachers.
Your primary focus is the Public School Employees' Retirement System (PSERS), the Health Options Program (HOP), and general retirement readiness.

Core Directives:
1. Educate & Empathize: Pennsylvania public school teachers work incredibly hard. Use a warm, encouraging, and supportive tone.
2. Demystify PSERS Jargon: Translate complex terms (like FAS, Superannuation, Premium Assistance, Options 1-4, Vesting, and Class Multipliers) into simple, accessible analogies. For example:
   - FAS (Final Average Salary) is like the "seasoning" of your pension recipe—it sets the base flavor.
   - Option 4 (Lump-Sum Withdrawal of contributions) is like taking your accumulated dough out of the oven early—it leaves a smaller cake (monthly check) for your future.
   - Superannuation is simply "normal full retirement age" when you get your pension without any early penalties.
3. Be Calculator-Aware: The user can fill out a profile in the interactive retirement calculator on the screen. Use the provided profile context (${profileContext || "No profile filled out yet"}) to make your answers deeply personalized, citing their specific variables (FAS, Class, age, years of service) and doing precise mental arithmetic where possible.
4. Correctly reference PSERS Class rules:
   - Class T-C & T-D: Multiplier 2.5% (T-D) or 2.0% (T-C). Superannuation is age 62, or 60 with 30 years, or 35 years of service.
   - Class T-E & T-F: Multiplier 2.0% (T-E, or 2.5% if T-F). Superannuation is age 65 with 3 years, or Rule of 92 (Age + Service >= 92 with 35+ years).
   - Class T-G & T-H: Hybrid plans. Defined benefit multiplier is 1.25% (T-G) or 1.00% (T-H) + Defined Contribution portion (3% or 7.5% of salary). Superannuation is age 67 with 3 years, or Rule of 97 (Age + Service >= 97 with 35+ years).
5. Explain Payout Options (Maximum Single Life, Option 1, Option 2, Option 3, Option 4 lump sum) clearly.
6. Emphasize Healthcare Costs & Premium Assistance:
   - Explain that Premium Assistance provides up to $100/month toward qualified health insurance if they have 24.5+ years of service OR 15+ years and retire at superannuation.
   - Warn them about the high cost of pre-65 health insurance (the "healthcare gap") before Medicare kicks in at age 65.

Keep your responses organized, clear, and readable using simple bullet points or formatting. Do not output raw code files or internal developer jargon.`;

    // Format chat messages for Gemini SDK (GoogleGenAI v2.4.0)
    // Structure of contents is { role: "user" | "model", parts: [{ text: string }] }
    // We transform the incoming message list
    const formattedContents = messages.map((m) => ({
      role: m.role === "assistant" || m.role === "model" ? "model" : "user",
      parts: [{ text: m.text }],
    }));

    // Call the generateContent API with robust fallback in case gemini-3.5-flash experiences high demand (503)
    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: formattedContents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });
    } catch (error: any) {
      console.warn("gemini-3.5-flash is currently experiencing high demand or error, falling back to gemini-3.1-flash-lite...", error.message);
      try {
        response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: formattedContents,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });
      } catch (fallbackError: any) {
        console.error("Fallback gemini-3.1-flash-lite also failed:", fallbackError);
        throw fallbackError; // throw up to main try-catch
      }
    }

    const replyText = response.text || "I was unable to generate a response. Please try again.";
    res.json({ reply: replyText });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: error.message || "An error occurred during generation." });
  }
});

// Stripe checkout session creation endpoint
app.post("/api/create-checkout-session", async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({
        error: "Stripe API is not configured on the server. Please add STRIPE_SECRET_KEY in your environment variables.",
      });
    }

    const { deliveryMethod, emailAddress } = req.body;
    const origin = req.headers.origin || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Premium Retirement Report",
              description: "Personalized PSERS retirement calculations and scenario comparison",
            },
            unit_amount: 100, // $1.00 USD in cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      metadata: {
        deliveryMethod: deliveryMethod || "print",
        emailAddress: emailAddress || "",
      },
      success_url: `${origin}/?status=success&method=${deliveryMethod || "print"}&email=${encodeURIComponent(emailAddress || "")}`,
      cancel_url: `${origin}/`,
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error("Stripe Checkout Error:", error);
    res.status(500).json({ error: error.message || "Failed to initiate checkout session." });
  }
});

// Express email delivery endpoint
app.post("/api/send-report-email", async (req, res) => {
  try {
    const { emailAddress, profile, results } = req.body;

    if (!emailAddress) {
      return res.status(400).json({ error: "Email address is required." });
    }
    if (!profile || !results) {
      return res.status(400).json({ error: "Retirement data is missing." });
    }

    const { currentAge, targetAge, serviceYears, fas, classId, payoutOption, lumpSumWithdrawal } = profile;
    const {
      isVested,
      isSuperannuated,
      grossMonthlyPension,
      netMonthlyPension,
      healthcarePremiumEst,
      premiumAssistanceAmount,
      optionReductions,
      explanationSteps,
    } = results;

    const formattedFas = fas.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
    const formattedGross = grossMonthlyPension.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
    const formattedNet = netMonthlyPension.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
    const formattedLumpSum = lumpSumWithdrawal.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your PSERS Retirement Navigator Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.5; margin: 0; padding: 20px; background-color: #f8fafc; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { background: #059669; color: #ffffff; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; }
    .header p { margin: 4px 0 0 0; opacity: 0.9; font-size: 13px; }
    .content { padding: 24px; }
    .section-title { font-size: 12px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 1px; margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; }
    .param-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    .param-table td { padding: 8px 0; font-size: 13px; border-bottom: 1px dashed #f1f5f9; }
    .param-table td.label { color: #64748b; font-weight: 500; }
    .param-table td.val { text-align: right; font-weight: 700; color: #0f172a; }
    .net-box { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 16px; margin-bottom: 24px; text-align: center; }
    .net-box .label { font-size: 11px; font-weight: 700; color: #047857; text-transform: uppercase; letter-spacing: 0.5px; }
    .net-box .amount { font-size: 28px; font-weight: 800; color: #065f46; margin: 4px 0; }
    .net-box .desc { font-size: 11px; color: #065f46; opacity: 0.85; }
    .option-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 12px; }
    .option-table th { background: #f8fafc; padding: 8px 10px; text-align: left; font-weight: 700; color: #475569; border-bottom: 2px solid #e2e8f0; }
    .option-table td { padding: 10px; border-bottom: 1px solid #f1f5f9; }
    .option-table tr.active { background: #f0fdf4; font-weight: 700; }
    .option-table tr.active td { color: #166534; }
    .notes-list { margin: 0; padding-left: 20px; font-size: 12px; color: #475569; margin-bottom: 24px; }
    .notes-list li { margin-bottom: 8px; line-height: 1.6; }
    .footer { background: #0f172a; color: #94a3b8; padding: 20px; text-align: center; font-size: 10px; line-height: 1.6; }
    .footer a { color: #34d399; text-decoration: none; }
    .disclaimer-box { background: #1e293b; border: 1px solid #334155; border-radius: 6px; padding: 10px; margin-top: 12px; color: #94a3b8; text-align: left; font-size: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>PA Teacher Retirement Navigator</h1>
      <p>Your Personalized Premium Scenario Report</p>
    </div>
    <div class="content">
      <div class="section-title">Retirement Setup</div>
      <table class="param-table">
        <tr>
          <td class="label">Membership Class</td>
          <td class="val">Class ${classId}</td>
        </tr>
        <tr>
          <td class="label">Current Age</td>
          <td class="val">${currentAge} Years</td>
        </tr>
        <tr>
          <td class="label">Target Retirement Age</td>
          <td class="val">${targetAge} Years</td>
        </tr>
        <tr>
          <td class="label">Credited Service Years</td>
          <td class="val">${serviceYears} Years</td>
        </tr>
        <tr>
          <td class="label">Final Average Salary (FAS)</td>
          <td class="val">${formattedFas}</td>
        </tr>
        <tr>
          <td class="label">Selected Payout Option</td>
          <td class="val">${payoutOption.toUpperCase()}</td>
        </tr>
      </table>

      <div class="net-box">
        <div class="label">Estimated Net Monthly Take-Home</div>
        <div class="amount">${formattedNet}/mo</div>
        <div class="desc">Gross check of ${formattedGross} minus healthcare premiums + assistance credits</div>
      </div>

      <div class="section-title">Payout Option Plans Comparison</div>
      <table class="option-table">
        <thead>
          <tr>
            <th>Payout Plan</th>
            <th style="text-align: right;">Lump Sum</th>
            <th style="text-align: right;">Gross Check</th>
            <th style="text-align: right;">Net Check</th>
          </tr>
        </thead>
        <tbody>
          <tr class="${payoutOption === 'max' ? 'active' : ''}">
            <td>Maximum Single Life</td>
            <td style="text-align: right; color: #94a3b8;">-</td>
            <td style="text-align: right;">$${optionReductions.max.toLocaleString("en-US", { maximumFractionDigits: 0 })}/mo</td>
            <td style="text-align: right; color: #047857;">$${Math.max(0, optionReductions.max - Math.max(0, healthcarePremiumEst - premiumAssistanceAmount)).toLocaleString("en-US", { maximumFractionDigits: 0 })}/mo</td>
          </tr>
          <tr class="${payoutOption === 'option1' ? 'active' : ''}">
            <td>Option 1 (Declining Balance)</td>
            <td style="text-align: right; color: #94a3b8;">-</td>
            <td style="text-align: right;">$${optionReductions.option1.toLocaleString("en-US", { maximumFractionDigits: 0 })}/mo</td>
            <td style="text-align: right; color: #047857;">$${Math.max(0, optionReductions.option1 - Math.max(0, healthcarePremiumEst - premiumAssistanceAmount)).toLocaleString("en-US", { maximumFractionDigits: 0 })}/mo</td>
          </tr>
          <tr class="${payoutOption === 'option2' ? 'active' : ''}">
            <td>Option 2 (100% Survivor)</td>
            <td style="text-align: right; color: #94a3b8;">-</td>
            <td style="text-align: right;">$${optionReductions.option2.toLocaleString("en-US", { maximumFractionDigits: 0 })}/mo</td>
            <td style="text-align: right; color: #047857;">$${Math.max(0, optionReductions.option2 - Math.max(0, healthcarePremiumEst - premiumAssistanceAmount)).toLocaleString("en-US", { maximumFractionDigits: 0 })}/mo</td>
          </tr>
          <tr class="${payoutOption === 'option3' ? 'active' : ''}">
            <td>Option 3 (50% Survivor)</td>
            <td style="text-align: right; color: #94a3b8;">-</td>
            <td style="text-align: right;">$${optionReductions.option3.toLocaleString("en-US", { maximumFractionDigits: 0 })}/mo</td>
            <td style="text-align: right; color: #047857;">$${Math.max(0, optionReductions.option3 - Math.max(0, healthcarePremiumEst - premiumAssistanceAmount)).toLocaleString("en-US", { maximumFractionDigits: 0 })}/mo</td>
          </tr>
          <tr class="${payoutOption === 'option4' ? 'active' : ''}">
            <td>Option 4 (Lump-Sum Combo)</td>
            <td style="text-align: right; color: #dc2626; font-weight: 700;">${formattedLumpSum}</td>
            <td style="text-align: right;">$${optionReductions.option4.toLocaleString("en-US", { maximumFractionDigits: 0 })}/mo</td>
            <td style="text-align: right; color: #047857;">$${netMonthlyPension.toLocaleString("en-US", { maximumFractionDigits: 0 })}/mo</td>
          </tr>
        </tbody>
      </table>

      <div class="section-title">Scenario Projections & Detailed Analysis</div>
      <ul class="notes-list">
        ${explanationSteps.map((step: string) => `<li>${step}</li>`).join("")}
      </ul>
    </div>
    <div class="footer">
      <p>This report was generated using the <a href="https://pateacherdone-437178307252.northamerica-northeast1.run.app">PA Teacher Retirement Navigator</a>.</p>
      <div class="disclaimer-box">
        <strong>⚠️ Legal Disclaimer:</strong>
        This report is for educational and simulation purposes only. Projections are estimates and do not constitute official PSERS calculations, legal, tax, or financial advice. Consult with PSERS directly before making official decisions.
      </div>
    </div>
  </div>
</body>
</html>
`;

    if (resend) {
      const emailResponse = await resend.emails.send({
        from: "PA Retirement Navigator <reports@pateacherdone.com>",
        to: emailAddress,
        subject: `Your Premium PSERS Retirement Report (${formattedNet}/mo)`,
        html: htmlContent,
      });

      console.log("Resend API Success:", emailResponse);
      res.json({ success: true, id: emailResponse.data?.id });
    } else {
      console.log("===== TEST EMAIL DISPATCH =====");
      console.log("To:", emailAddress);
      console.log("Subject: Your Premium PSERS Retirement Report");
      console.log("Content Length:", htmlContent.length, "bytes");
      console.log("===============================");
      res.json({ success: true, testMode: true });
    }
  } catch (error: any) {
    console.error("Email API Error:", error);
    res.status(500).json({ error: error.message || "Failed to dispatch email report." });
  }
});

// Express serving Vite/dist
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development middleware mounted.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving static production assets from /dist.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`PA Teacher Retirement Navigator server is running on http://localhost:${PORT}`);
  });
}

startServer();
