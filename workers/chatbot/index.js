// DGC Chat API — Cloudflare Worker
// Lead-capturing chatbot with support ticket detection + escalation

const ALLOWED_ORIGINS = new Set([
  "https://dahangroup.io",
  "https://www.dahangroup.io",
]);

function assertRequiredEnv(env, keys) {
  const missing = keys.filter((key) => !env?.[key]);
  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }
}

const DGC_SYSTEM_PROMPT = `You are ECHO, an AI specialist embedded as a chat widget on the Dahan Group Consulting (DGC) website. Never use any personal names or refer to specific team members.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR IDENTITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Your name is ECHO — DGC's AI assistant. You're confident, direct, and genuinely helpful — never robotic, never salesy. You ask smart questions, listen carefully, and connect what you hear to specific solutions DGC can deliver. You represent DGC's standard: practical, no-fluff AI that actually works.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ABOUT DGC
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Dahan Group Consulting is a hands-on AI consulting firm. We don't just advise — we build and implement practical AI solutions that help businesses save time, capture more leads, and grow. We specialize in working with small and mid-size businesses, coaches, and agencies who want real results without the overhead of a large consulting firm.

Our edge: We focus on practical implementation over theory. When you work with DGC, we build it for you — from automations to custom chatbots to full AI pipelines — and we make sure it actually works in your business.

DGC Proprietary Products (mention when relevant):
- ECHO — AI chat assistant for websites (you are ECHO; DGC builds and deploys this for clients)
- TRACE — AI-powered SDR tool for lead intake, enrichment, scoring, and CRM push

Website: dahangroup.io

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHO WE HELP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Our clients typically come to us with one or more of these problems:
- Wasting hours on manual, repetitive tasks that could be automated
- Missing leads or following up too slowly (leads going cold)
- No clear AI strategy — overwhelmed by options, unsure where to start
- An outdated website or weak online presence that isn't converting visitors

We work with: small and local businesses, coaches, agencies, and service-based companies looking to implement AI without the complexity.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HOW IT WORKS — OUR APPROACH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Every engagement starts with an AI Audit — a free discovery session where we assess the business, identify the highest-impact opportunities, and map out a clear action plan. No fluff, no 50-page reports. Just a focused roadmap you can actually execute.

From there, engagements follow three phases depending on where the client is:

PHASE 1 — GETTING STARTED
For businesses new to AI or looking to clean up their current tool stack.
- AI Workflow Automations: We map and automate repetitive manual processes — things like lead follow-up, data entry, scheduling, notifications, and internal reporting. Clients typically save 5–15 hours per week.
- AI Tool Optimization: We audit your existing tools (CRMs, email platforms, project management) and integrate AI features to get more out of what you already pay for.
- AI Website Creation: We design and build fast, modern websites with AI-powered features baked in — including chat widgets, lead capture, and automated follow-up. Built to convert.
- Team Training & Workshops: We run practical workshops that get your team using AI tools confidently in their day-to-day work — tailored to your industry and tools.

PHASE 2 — GOING DEEPER
For businesses ready to build more custom AI infrastructure.
- Custom AI Agents: We build AI chatbots and assistants tailored to your business — trained on your services, FAQs, and brand voice. Used for customer support, sales qualification, or internal knowledge. This is one of our most popular services.
- AI Lead Qualification & Email Automation: We build systems that automatically score incoming leads, segment them, and trigger personalized follow-up emails — so no lead goes cold and your team focuses on the hottest prospects.
- AI Knowledge Base: We create an internal AI-powered knowledge base your team can query in plain English — reducing time spent searching for answers, onboarding docs, or SOPs.
- AI Governance & Readiness: We help businesses build the policies, frameworks, and guardrails needed to use AI responsibly and at scale.

PHASE 3 — ADVANCED CAPABILITIES
For businesses ready to go deep on AI-driven growth.
- Advanced AI Solutions: Custom fine-tuned models, retrieval-augmented generation (RAG) systems, and AI-powered analytics tailored to specific business needs.
- AI Marketing & Personalization: AI-driven content pipelines, personalized outreach, and dynamic audience segmentation.
- Full AI Sales Pipeline: End-to-end AI automation from lead capture through qualification, nurture, and close — fully integrated with your CRM and communication tools.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMMON QUESTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Q: Where do we start?
A: Every engagement starts with a free AI Audit. We assess your business, identify the biggest opportunities, and give you a clear roadmap. No commitment required.

Q: How much does it cost?
A: Pricing depends on the scope of the project. We offer both project-based engagements and monthly retainers. A DGC specialist will provide a custom proposal after the audit. We're significantly more affordable than large consulting firms while delivering hands-on work.

Q: How long does it take to see results?
A: Many clients see time savings and efficiency gains within the first 2–4 weeks. More complex builds like custom AI agents or full pipelines typically take 4–8 weeks from kickoff.

Q: Do we need a technical team to work with you?
A: No. We handle the technical side end-to-end. You don't need developers or an IT team — just a willingness to implement and adopt the tools we build.

Q: What industries do you work with?
A: We work across industries — local businesses, healthcare, real estate, e-commerce, coaching, agencies, and professional services. If you have repetitive processes or lead management challenges, AI can help.

Q: What if we already use tools like HubSpot, Salesforce, or Zapier?
A: Great — we integrate with your existing stack. We're not here to replace tools you already use; we're here to make them smarter.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESPONSE RULES — FOLLOW STRICTLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Keep responses to 2–3 sentences. Never exceed 4 sentences. Be direct and conversational — no walls of text.
2. Never mention team member names. Say "our team" or "a DGC specialist" instead.
3. Warm but brief. No filler, no jargon, no long explanations.
4. Your goal is to have a real conversation, understand what the visitor needs, and naturally guide them toward connecting with DGC.
5. After 3–4 exchanges, naturally guide toward booking a free AI Audit or sharing their email — don't rush it.
6. Never make up pricing — say it depends on scope and our team will provide a custom proposal after an audit.
7. If asked something unrelated to DGC's services, briefly redirect to how DGC can help their business.
8. When someone describes a pain point (manual tasks, slow follow-up, no AI strategy, weak website), acknowledge it directly and connect it to a specific DGC service.
9. If a visitor asks about chatbots, AI assistants, or tools like ECHO — let them know DGC builds and deploys these for clients, and it's one of our most requested services.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LEAD CAPTURE — CRITICAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
When a user shares their name and email, ALWAYS append this at the very end of your response (hidden from user, parsed by backend):

[LEAD_DATA]{"name":"Their Name","email":"their@email.com","phone":"optional or empty string"}[/LEAD_DATA]

Examples:
- "I'm Sarah, sarah@acme.com" → [LEAD_DATA]{"name":"Sarah","email":"sarah@acme.com","phone":""}[/LEAD_DATA]
- "Mike, mike@co.com, 555-1234" → [LEAD_DATA]{"name":"Mike","email":"mike@co.com","phone":"555-1234"}[/LEAD_DATA]

ALWAYS include tags when you detect an email address. This is your most important function.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUPPORT TICKET DETECTION — CRITICAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Monitor every message for support issues or escalation signals. These include:
- Complaints, frustration, or dissatisfaction with DGC or a project
- Requests to speak with a human / real person / someone on the team
- Billing, invoice, or payment issues
- Urgent problems or blockers with an ongoing engagement
- Anything you cannot confidently answer or resolve

When you detect any of the above:
1. Respond warmly and empathetically — acknowledge the issue, let them know a specialist will follow up shortly.
2. ALWAYS append a support ticket tag at the very end of your response:

[SUPPORT_TICKET]{"issue_summary":"One sentence summary of the issue","category":"complaint|escalation|billing|urgent|question","urgency":"high|medium|low","needs_human":true,"name":"Their name if known or empty string","email":"Their email if known or empty string"}[/SUPPORT_TICKET]

Examples:
- User complains project is delayed → [SUPPORT_TICKET]{"issue_summary":"Client unhappy with project timeline","category":"complaint","urgency":"high","needs_human":true,"name":"","email":""}[/SUPPORT_TICKET]
- User asks for someone to call them → [SUPPORT_TICKET]{"issue_summary":"Client requesting human callback","category":"escalation","urgency":"medium","needs_human":true,"name":"","email":""}[/SUPPORT_TICKET]
- User reports billing error → [SUPPORT_TICKET]{"issue_summary":"Client reporting billing discrepancy","category":"billing","urgency":"high","needs_human":true,"name":"","email":""}[/SUPPORT_TICKET]

ONLY append the support ticket tag when a genuine issue or escalation is detected — not for general questions you can answer yourself.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ROUTING — HOW TO DIRECT VISITORS (CRITICAL)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
There are TWO paths for connecting visitors with our team. Use the correct one:

PATH 1 — ESCALATION (support issues only):
Use ONLY when the visitor has a genuine problem: complaint, billing issue, project blocker, or explicitly asks to speak to a human about an issue.
→ Append [SUPPORT_TICKET] tag (described above). The system will show an escalation form.

PATH 2 — CONTACT (general interest, wants to get in touch):
Use when the visitor is interested in our services, wants to learn more, wants pricing info, or is ready to take the next step — but does NOT have a support issue.
→ Append this tag at the end of your response:
[SHOW_CONTACT]
→ This tells the system to show the contact form or booking link.

EXAMPLES:
- "I'd love to learn more about your AI agents" → guide the conversation, then after 2-3 exchanges append [SHOW_CONTACT]
- "Can someone walk me through pricing?" → answer what you can, then append [SHOW_CONTACT]
- "How do I get started?" → mention the free AI Audit, then append [SHOW_CONTACT]
- "I want to book a consultation" → respond warmly, append [SHOW_CONTACT]
- "My project is delayed and I'm frustrated" → empathize, append [SUPPORT_TICKET]
- "I need to talk to someone about a billing issue" → empathize, append [SUPPORT_TICKET]

IMPORTANT: Do NOT append [SHOW_CONTACT] on every response. Only append it when the visitor is ready to take action or has asked to connect. Have a real conversation first.`;

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

function corsHeaders(request) {
  const origin = request.headers.get("Origin");
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "null";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
    "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
    Vary: "Origin",
    ...SECURITY_HEADERS,
  };
}

// ── Tag extractors ────────────────────────────────────────────────────────────

function extractLeadFromTags(text) {
  const match = text.match(/\[LEAD_DATA\](.*?)\[\/LEAD_DATA\]/s);
  if (match) {
    try {
      const leadData = JSON.parse(match[1]);
      const cleanText = text
        .replace(/\[LEAD_DATA\].*?\[\/LEAD_DATA\]/s, "")
        .trim();
      return { leadData, cleanText };
    } catch (e) {
      return { leadData: null, cleanText: text };
    }
  }
  return { leadData: null, cleanText: text };
}

function extractSupportTicket(text) {
  const match = text.match(/\[SUPPORT_TICKET\](.*?)\[\/SUPPORT_TICKET\]/s);
  if (match) {
    try {
      const ticketData = JSON.parse(match[1]);
      const cleanText = text
        .replace(/\[SUPPORT_TICKET\].*?\[\/SUPPORT_TICKET\]/s, "")
        .trim();
      return { ticketData, cleanText };
    } catch (e) {
      return { ticketData: null, cleanText: text };
    }
  }
  return { ticketData: null, cleanText: text };
}

// ── [FIX] Extract [SHOW_CONTACT] tag ──────────────────────────────────────────
function extractShowContact(text) {
  const hasTag = /\[SHOW_CONTACT\]/.test(text);
  const cleanText = text.replace(/\[SHOW_CONTACT\]/g, "").trim();
  return { showContact: hasTag, cleanText };
}

// ── Conversation helpers ──────────────────────────────────────────────────────

function extractLeadFromConversation(messages) {
  const emailRegex = /[\w.+-]+@[\w-]+\.[\w.]+/;
  const phoneRegex = /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/;

  let email = null;
  let name = null;
  let phone = null;

  const userMessages = messages.filter((m) => m.role === "user").reverse();

  for (const msg of userMessages) {
    const text = msg.content;

    if (!email) {
      const emailMatch = text.match(emailRegex);
      if (emailMatch) email = emailMatch[0];
    }

    if (!phone) {
      const phoneMatch = text.match(phoneRegex);
      if (phoneMatch) phone = phoneMatch[0];
    }

    if (!name && email) {
      const namePatterns = [
        /(?:I'm|I am|my name is|this is|it's|hey,?\s*I'm)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
        /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*[,\-–—]\s*/,
        /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+here/i,
      ];
      for (const pattern of namePatterns) {
        const nameMatch = text.match(pattern);
        if (nameMatch) {
          name = nameMatch[1].trim();
          break;
        }
      }

      if (!name) {
        const beforeEmail = text.split(email)[0].trim();
        const words = beforeEmail
          .replace(/[,.\-–—:]/g, " ")
          .trim()
          .split(/\s+/);
        const possibleName = words.filter(
          (w) => /^[A-Z]/.test(w) && w.length > 1 && w.length < 20,
        );
        if (possibleName.length > 0 && possibleName.length <= 3) {
          name = possibleName.join(" ");
        }
      }
    }

    if (email) break;
  }

  if (email) {
    return { name: name || "Chat visitor", email, phone: phone || "" };
  }
  return null;
}

function buildChatContext(messages) {
  return messages
    .slice(-10)
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");
}

// ── Formspree (lead notify) ───────────────────────────────────────────────────

async function submitToFormspree(leadData, chatContext, env) {
  try {
    const res = await fetch(env.FORMSPREE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        _replyto: env.ADMIN_EMAIL,
        _subject: "New Chatbot Lead - DGC Website",
        "Lead Name": leadData.name || "Not provided",
        "Lead Email": leadData.email || "Not provided",
        "Lead Phone": leadData.phone || "Not provided",
        Source: "AI Chatbot",
        Conversation: chatContext || "Lead captured via chat widget",
      }),
    });
    console.log("Formspree status:", res.status);
  } catch (e) {
    console.error("Formspree submission failed:", e.message);
  }
}

// ── Lead worker (qualification + email) ──────────────────────────────────────

async function sendToLeadWorker(leadData, chatContext, env) {
  try {
    const res = await fetch(env.LEAD_WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: leadData.name || "Chat visitor",
        email: leadData.email,
        phone: leadData.phone || "",
        source: "AI Chatbot",
        conversation: chatContext || "",
      }),
    });
    console.log("Lead worker status:", res.status);
  } catch (e) {
    console.error("Lead worker call failed:", e.message);
  }
}

// ── [FIX] Helper to POST to Apps Script with manual redirect follow ──────────
// Google Apps Script returns a 302 redirect after POST. Cloudflare Workers'
// redirect:"follow" converts the redirected request to GET which can lose the
// response body. We manually follow the redirect to get the actual response.
async function postToAppsScript(payload, env) {
  const res = await fetch(env.GOOGLE_APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    redirect: "manual",
    body: JSON.stringify({ ...payload, _secret: env.APPS_SCRIPT_SECRET }),
  });

  // If Apps Script returns a redirect (302/303), follow it with GET
  if (res.status === 302 || res.status === 303 || res.status === 301) {
    const redirectUrl = res.headers.get("Location");
    if (redirectUrl) {
      const followRes = await fetch(redirectUrl, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      return followRes;
    }
  }

  return res;
}

// ── Client confirmation email ─────────────────────────────────────────────────

function buildConfirmationEmail(clientName, ticketId) {
  const firstName = clientName ? clientName.split(" ")[0] : "there";
  const htmlBody = `Hi ${firstName},<br><br>We've received your request and our team is already working on it. We'll be in touch within 2–3 business days.<br><br>The DGC Team`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:32px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
  <tr>
    <td style="background:linear-gradient(135deg,#0d1117 0%,#142d5a 100%);padding:28px 32px;text-align:center;">
      <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
        <tr>
          <td style="vertical-align:middle;padding-right:12px;">
            <div style="width:36px;height:36px;border-radius:50%;border:2px solid #2d5a8f;display:inline-block;text-align:center;line-height:32px;">
              <span style="color:#4a8ac7;font-size:14px;font-weight:bold;">&#9678;</span>
            </div>
          </td>
          <td style="vertical-align:middle;">
            <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.5px;">DAHAN GROUP</span>
            <span style="color:rgba(255,255,255,0.5);font-size:18px;font-weight:300;letter-spacing:0.5px;"> CONSULTING</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:32px 32px 8px;font-size:15px;line-height:1.7;color:#333333;">
      ${htmlBody}
    </td>
  </tr>
  <tr>
    <td style="padding:16px 32px 32px;">
      <table cellpadding="0" cellspacing="0" style="background:#f8f9fc;border-left:3px solid #2d5a8f;border-radius:4px;padding:12px 16px;width:100%;">
        <tr><td style="font-size:12px;color:#888888;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;padding-bottom:4px;">Ticket Reference</td></tr>
        <tr><td style="font-size:14px;color:#1a1a1a;font-weight:700;">${ticketId}</td></tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:0 32px;"><div style="border-top:1px solid #e8e8ee;"></div></td>
  </tr>
  <tr>
    <td style="padding:24px 32px 28px;">
      <div style="font-size:13px;font-weight:700;color:#1a1a1a;">Dahan Group Consulting</div>
      <div style="font-size:12px;color:#2d5a8f;margin-top:2px;">AI for Real Business Growth</div>
      <div style="margin-top:10px;font-size:12px;color:#888888;">
        <a href="https://dahangroup.io" style="color:#2d5a8f;text-decoration:none;">dahangroup.io</a> &middot;
        <a href="mailto:admin@dahangroup.io" style="color:#2d5a8f;text-decoration:none;">admin@dahangroup.io</a>
      </div>
    </td>
  </tr>
</table>
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
  <tr>
    <td style="padding:16px 32px;text-align:center;font-size:11px;color:#aaaaaa;">
      You're receiving this because you submitted a support request via dahangroup.io
    </td>
  </tr>
</table>
</td></tr></table>
</body>
</html>`;
}

// ── Main handler ──────────────────────────────────────────────────────────────

export default {
  async fetch(request, env, ctx) {
    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(request) });
    }

    // Health check
    if (request.method === "GET") {
      return new Response("OK: DGC Chat API is running. Use POST for chat.", {
        headers: { "Content-Type": "text/plain", ...corsHeaders(request) },
      });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", {
        status: 405,
        headers: corsHeaders(request),
      });
    }

    // ── API key auth ──────────────────────────────────────────────────────────
    const apiKey = request.headers.get("X-API-Key");
    if (!apiKey || apiKey !== env.SITE_API_KEY) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders(request) },
      });
    }

    // ── /escalation endpoint: proxy escalation form direct to Apps Script ──
    const url = new URL(request.url);
    if (url.pathname === "/escalation") {
      // [FIX] Use manual redirect follow for Apps Script
      try {
        assertRequiredEnv(env, [
          "GOOGLE_APPS_SCRIPT_URL",
          "FORMSPREE_URL",
          "ADMIN_EMAIL",
          "LEAD_WORKER_URL",
          "ANTHROPIC_API_KEY",
        ]);
        const payload = await request.json();
        const res = await postToAppsScript(payload, env);
        const text = await res.text();
        console.log("Escalation proxy response:", res.status, text);

        // Send confirmation email to client
        if (payload.clientEmail) {
          const html = buildConfirmationEmail(
            payload.clientName,
            payload.ticketId,
          );
          ctx.waitUntil(
            postToAppsScript(
              {
                to: payload.clientEmail,
                subject: `We've received your request — Ticket ${payload.ticketId}`,
                body: `Hi ${payload.clientName || "there"},\n\nWe've received your support request and will be in touch within 2–3 business days.\n\nTicket ID: ${payload.ticketId}\n\nThe DGC Team`,
                html,
              },
              env,
            ),
          );
        }

        return new Response(text, {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders(request),
          },
        });
      } catch (e) {
        console.error("Escalation proxy error:", e.message);
        return new Response(
          JSON.stringify({ success: false, error: e.message }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders(request),
            },
          },
        );
      }
    }

    try {
      assertRequiredEnv(env, [
        "GOOGLE_APPS_SCRIPT_URL",
        "FORMSPREE_URL",
        "ADMIN_EMAIL",
        "LEAD_WORKER_URL",
        "ANTHROPIC_API_KEY",
      ]);
      const body = await request.json();
      const messages = body.messages || [];

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 400,
          system: DGC_SYSTEM_PROMPT,
          messages,
        }),
      });

      const data = await response.json();
      const chatContext = buildChatContext(messages);
      let rawText = data?.content?.[0]?.text || "";

      // ── Step 1: Extract support ticket tag ───────────────────────────────
      const { ticketData, cleanText: afterTicket } =
        extractSupportTicket(rawText);
      rawText = afterTicket;

      // ── Step 2: Extract lead data tag ─────────────────────────────────────
      const { leadData: tagLead, cleanText: afterLead } =
        extractLeadFromTags(rawText);
      rawText = afterLead;

      // ── Step 3: [FIX] Extract [SHOW_CONTACT] tag ─────────────────────────
      const { showContact, cleanText: afterContact } =
        extractShowContact(rawText);
      rawText = afterContact;

      // Update response text — no tags leak to the user
      if (data?.content?.[0]) {
        data.content[0].text = rawText;
      }

      // ── [FIX] Add routing hints to response so frontend knows what to show
      // We add a _routing field that the frontend reads to decide which form to show
      const routing = {};
      if (ticketData) routing.action = "escalation";
      else if (showContact) routing.action = "contact";
      else routing.action = "none";

      // ── Step 4: Handle support ticket ─────────────────────────────────────
      if (ticketData) {
        console.log("Support ticket detected:", JSON.stringify(ticketData));

        // Enrich ticket with lead info if we have it
        if (tagLead?.email && !ticketData.email)
          ticketData.email = tagLead.email;
        if (tagLead?.name && !ticketData.name) ticketData.name = tagLead.name;

        // Also try fallback scan for name/email if still missing
        if (!ticketData.email) {
          const fallback = extractLeadFromConversation(messages);
          if (fallback?.email) {
            ticketData.email = fallback.email;
            ticketData.name = ticketData.name || fallback.name;
            ticketData.phone = ticketData.phone || fallback.phone;
          }
        }

        // Pass ticket data to frontend for the escalation form
        routing.ticketData = {
          issue_summary: ticketData.issue_summary || "",
          category: ticketData.category || "escalation",
          urgency: ticketData.urgency || "medium",
        };

      }

      // ── Step 5: Handle lead capture (skip if support ticket was raised) ─────
      let leadSubmitted = false;

      if (ticketData) {
        // User is an existing customer escalating an issue — not a new lead
        leadSubmitted = true;
      }

      if (!leadSubmitted && tagLead?.email) {
        console.log("Lead found via tags:", JSON.stringify(tagLead));
        ctx.waitUntil(sendToLeadWorker(tagLead, chatContext, env));
        leadSubmitted = true;
      }

      // Fallback: scan last user message for email
      if (!leadSubmitted) {
        const lastUserMsg = messages.filter((m) => m.role === "user").pop();
        if (
          lastUserMsg &&
          /[\w.+-]+@[\w-]+\.[\w.]+/.test(lastUserMsg.content)
        ) {
          const fallbackLead = extractLeadFromConversation(messages);
          if (fallbackLead) {
            console.log(
              "Lead found via fallback:",
              JSON.stringify(fallbackLead),
            );
            ctx.waitUntil(sendToLeadWorker(fallbackLead, chatContext, env));
          }
        }
      }

      // ── [FIX] Return response with routing info ───────────────────────────
      const responseBody = { ...data, _routing: routing };

      return new Response(JSON.stringify(responseBody), {
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders(request),
        },
      });
    } catch (err) {
      console.error("Worker error:", err.message);
      return new Response(
        JSON.stringify({ error: "API call failed. Please try again." }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders(request),
          },
        },
      );
    }
  },
};
