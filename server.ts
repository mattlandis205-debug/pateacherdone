import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import Stripe from "stripe";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";
// Initialize stripe (Stripe SDK v14+ handles CJS/ESM cleanly)
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

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
