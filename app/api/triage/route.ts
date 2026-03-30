  import Groq from "groq-sdk";

  export async function POST(req: Request) {
    try {
      const { condition } = await req.json();

      if (!condition) {
        return Response.json({ error: "Condition is required" }, { status: 400 });
      }

      const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

      const response = await client.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are an emergency room triage AI. Assign a priority level to the patient condition.

  Priority scale:
  5 = Critical (cardiac arrest, severe trauma, stopped breathing)
  4 = Severe (chest pain, stroke, severe bleeding)
  3 = Urgent (high fever, broken bone, difficulty breathing)
  2 = Moderate (sprained ankle, mild allergic reaction)
  1 = Minor (headache, minor bruise, cold)

  Respond ONLY with valid JSON, no markdown, no extra text:
  {"priority": <1-5>, "reasoning": "<one sentence why>", "keywords": ["<symptom 1>", "<symptom 2>"]}`,
          },
          {
            role: "user",
            content: `Patient condition: ${condition}`,
          },
        ],
      });

      const text = response.choices[0].message.content || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      return Response.json(parsed);
    } catch (error: any) {
      console.error("Triage error:", error?.message, error?.status, JSON.stringify(error?.error));
      return Response.json({ error: "Failed to assess condition. Please try again." }, { status: 500 });
    }
  }