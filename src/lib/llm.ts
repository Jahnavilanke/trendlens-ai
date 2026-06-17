import type { Campaign, Insight } from "./types";
import { computeKPIs, channelStats } from "./kpis";
import { channelConversionSignificance } from "./stats";
import { getApiKey, getModel, getProvider, type Provider } from "./llm-config";

// Compact, numeric context so the model reasons over real figures rather than prose.
export function buildDataContext(rows: Campaign[]): string {
  const k = computeKPIs(rows);
  const stats = channelStats(rows).map((s) => ({
    channel: s.channel,
    spend: +s.cost.toFixed(0),
    revenue: +s.revenue.toFixed(0),
    conversions: s.conversions,
    convRate: +s.convRate.toFixed(2),
    ctr: +s.ctr.toFixed(2),
    cpa: +s.cpa.toFixed(2),
    roas: +s.roas.toFixed(2),
    roi: +s.roi.toFixed(1),
  }));
  const sig = channelConversionSignificance(rows).map((s) => ({
    channel: s.channel,
    convRate: +s.convRate.toFixed(2),
    vsPortfolio: s.test.direction,
    significant: s.test.significant,
    pValue: +s.test.pValue.toFixed(4),
  }));

  return JSON.stringify(
    {
      portfolio: {
        campaigns: k.campaignCount,
        spend: +k.cost.toFixed(0),
        revenue: +k.revenue.toFixed(0),
        roas: +k.roas.toFixed(2),
        roi: +k.roi.toFixed(1),
        ctr: +k.ctr.toFixed(2),
        convRate: +k.convRate.toFixed(2),
        cpa: +k.cpa.toFixed(2),
      },
      channels: stats,
      conversionSignificanceTests: sig,
    },
    null,
    0
  );
}

const SYSTEM_PROMPT = `You are a senior marketing analytics consultant advising a fashion ecommerce brand.
You are given aggregated campaign performance data and the results of two-proportion z-tests on each channel's conversion rate versus the rest of the portfolio.

Produce 5-7 specific, quantified, decision-ready recommendations. Rules:
- Cite the actual numbers from the data (ROAS, CPA, conversion rate, spend, p-values).
- Only call a conversion-rate difference "statistically significant" if the provided test says significant=true; otherwise call it directional.
- Each recommendation must state a concrete action and an expected effect.
- Be honest about uncertainty; do not invent data not present.
- Use fashion-marketing framing (collections, drops, seasonality, creative, audiences).

Respond with ONLY a JSON array, no markdown, no prose around it. Each element:
{"title": string, "body": string, "tone": "good"|"warn"|"info", "category": "channel"|"budget"|"conversion"|"revenue"|"risk"|"general"}`;

function extractJsonArray(text: string): Insight[] {
  let t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = t.indexOf("[");
  const end = t.lastIndexOf("]");
  if (start !== -1 && end !== -1) t = t.slice(start, end + 1);
  const parsed = JSON.parse(t);
  if (!Array.isArray(parsed)) throw new Error("Model did not return an array");
  return parsed
    .filter((i) => i && i.title && i.body)
    .map((i) => ({
      title: String(i.title),
      body: String(i.body),
      tone: ["good", "warn", "info"].includes(i.tone) ? i.tone : "info",
      category: ["channel", "budget", "conversion", "revenue", "risk", "general"].includes(i.category)
        ? i.category
        : "general",
    })) as Insight[];
}

async function callAnthropic(key: string, model: string, context: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Campaign data:\n${context}` }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return (data.content || [])
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("\n");
}

async function callOpenAICompatible(
  url: string,
  key: string,
  model: string,
  context: string,
  label: string
): Promise<string> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Campaign data:\n${context}` },
      ],
    }),
  });
  if (!res.ok) throw new Error(`${label} API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

export async function generateAiInsights(rows: Campaign[]): Promise<Insight[]> {
  const key = getApiKey();
  if (!key) throw new Error("NO_KEY");
  const provider: Provider = getProvider();
  const model = getModel();
  const context = buildDataContext(rows);

  let raw: string;
  if (provider === "anthropic") {
    raw = await callAnthropic(key, model, context);
  } else if (provider === "groq") {
    raw = await callOpenAICompatible(
      "https://api.groq.com/openai/v1/chat/completions",
      key,
      model,
      context,
      "Groq"
    );
  } else {
    raw = await callOpenAICompatible(
      "https://api.openai.com/v1/chat/completions",
      key,
      model,
      context,
      "OpenAI"
    );
  }
  return extractJsonArray(raw);
}
