// DGC Lead Qualification & Email Automation Worker

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

function corsHeaders(request) {
  const origin = request.headers.get("Origin");
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "null";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

async function qualifyLead(leadData, apiKey) {
  const prompt = `You are a lead qualification AI for Dahan Group Consulting (DGC), an AI consulting firm.

Analyze this lead and provide:
1. A score from 0-100
2. A category: HOT (80-100), WARM (50-79), or COLD (0-49)
3. Key interests detected
4. A personalized email to send them

LEAD INFO:
Name: ${leadData.name || "Unknown"}
Email: ${leadData.email || "Unknown"}
Phone: ${leadData.phone || "Not provided"}
Source: ${leadData.source || "Website"}
Conversation/Message: ${leadData.conversation || leadData.message || "No conversation recorded"}

SCORING CRITERIA:
- Mentions specific pain point or project = +30
- Mentions budget, timeline, or team size = +25
- Asks about specific service = +20
- Provides phone number = +10
- Gives name and email = +10
- Vague or general inquiry = +5

EMAIL RULES:
- Write from "the DGC team" — never use specific names
- Keep it to 3-5 sentences max
- Reference what they specifically asked about
- For HOT leads: propose a call this week
- For WARM leads: share a relevant insight, soft CTA to book a call
- For COLD leads: short, friendly, leave the door open
- Professional but warm tone, no jargon
- Subject line should be personalized, not generic

Respond in this exact JSON format only, no other text:
{"score":85,"category":"HOT","interests":["workflow automation","sales team"],"subject":"Quick thought on automating your sales workflows","email":"Hi Sarah,\\n\\nThanks for reaching out..."}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await response.json();
  const text = data?.content?.[0]?.text || "";

  try {
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch (e) {
    console.error("Failed to parse AI response:", text);
    return null;
  }
}

async function notifyOwner(leadData, qualification, env) {
  try {
    await fetch(env.FORMSPREE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        _replyto: env.ADMIN_EMAIL,
        _subject: `[DGC Lead - ${qualification.category}] ${leadData.name || "New Lead"}`,
        "Lead Name": leadData.name || "Unknown",
        "Lead Email": leadData.email,
        "Lead Phone": leadData.phone || "N/A",
        "Lead Score": `${qualification.score}/100 (${qualification.category})`,
        "Interests": qualification.interests.join(", "),
        "Source": leadData.source || "Website",
        "Conversation": leadData.conversation || leadData.message || "N/A",
        "AI Email Draft": `Subject: ${qualification.subject}\n\n${qualification.email}`,
      }),
    });
  } catch (e) {
    console.error("Notification failed:", e.message);
  }
}

function buildHtmlEmail(body) {
  const htmlBody = body
    .replace(/\n/g, "<br>")
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#2d5a8f;text-decoration:none;">$1</a>');

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:32px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
  <tr>
    <td style="background: linear-gradient(135deg, #0d1117 0%, #142d5a 100%); padding: 28px 32px; text-align: center;">
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
    <td style="padding:32px 32px 24px;font-size:15px;line-height:1.7;color:#333333;">
      ${htmlBody}
    </td>
  </tr>
  <tr>
    <td style="padding:0 32px 32px;text-align:center;">
      <a href="https://calendar.app.google/Nr94UDUnvfWpMzk49" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#2d5a8f,#3a7bc8);color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;letter-spacing:0.3px;">Book a Consultation &rarr;</a>
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
      You're receiving this because you reached out via dahangroup.io
    </td>
  </tr>
</table>
</td></tr></table>
</body>
</html>`;
}

async function sendProspectEmail(leadData, qualification, env) {
  try {
    const emailBody = qualification.email || "Thanks for your interest! A member of our team will be in touch shortly.";
    const htmlEmail = buildHtmlEmail(emailBody);

    const payload = JSON.stringify({
      to: leadData.email,
      subject: qualification.subject || "Thanks for reaching out to Dahan Group Consulting",
      body: emailBody,
      html: htmlEmail,
    });

    const response = await fetch(env.GOOGLE_APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      redirect: "follow",
    });

    if (response.status === 302 || response.status === 301) {
      const redirectUrl = response.headers.get("Location");
      if (redirectUrl) {
        await fetch(redirectUrl);
      }
    }

    console.log("Google Apps Script response:", response.status);
  } catch (e) {
    console.error("Google Apps Script email failed:", e.message);
  }
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(request) });
    }

    if (request.method === "GET") {
      return new Response("OK: DGC Lead Qualification API is running.", {
        headers: { "Content-Type": "text/plain", ...corsHeaders(request) },
      });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", {
        status: 405, headers: corsHeaders(request),
      });
    }

    try {
      assertRequiredEnv(env, [
        "GOOGLE_APPS_SCRIPT_URL",
        "FORMSPREE_URL",
        "ADMIN_EMAIL",
        "ANTHROPIC_API_KEY",
      ]);
      const leadData = await request.json();

      if (!leadData.email) {
        return new Response(
          JSON.stringify({ error: "Email is required" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders(request) } }
        );
      }

      const qualification = await qualifyLead(leadData, env.ANTHROPIC_API_KEY);

      if (!qualification) {
        return new Response(
          JSON.stringify({ error: "Failed to qualify lead" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders(request) } }
        );
      }

      ctx.waitUntil(notifyOwner(leadData, qualification, env));
      ctx.waitUntil(sendProspectEmail(leadData, qualification, env));

      return new Response(
        JSON.stringify({
          success: true,
          score: qualification.score,
          category: qualification.category,
          interests: qualification.interests,
        }),
        { headers: { "Content-Type": "application/json", ...corsHeaders(request) } }
      );
    } catch (err) {
      console.error("Worker error:", err.message);
      return new Response(
        JSON.stringify({ error: "Processing failed" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders(request) } }
      );
    }
  },
};

