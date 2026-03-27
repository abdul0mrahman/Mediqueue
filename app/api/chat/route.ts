import Groq from "groq-sdk";

export async function POST(req: Request) {
  try {
    const { message, history } = await req.json();
    
    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const messages = [
      {
        role: "system" as const,
        content: `You are MediQueue AI, an intelligent assistant embedded in a hospital triage management system called MediQueue+. 
        
You help doctors, nurses, and receptionists understand:
- How the priority queue works (Priority Scheduling with Aging/Starvation Prevention)
- What each severity level means (1=Minor, 2=Moderate, 3=Urgent, 4=Severe, 5=Critical)
- QoS (Quality of Service) scheduling concepts
- How the aging algorithm prevents patient starvation
- How to use the dashboard features
- General triage and emergency medicine questions

Be concise, professional, and helpful. Keep responses under 3 sentences unless a detailed explanation is needed. 
Do not make up patient data or clinical decisions. Always remind users that real medical decisions should be made by qualified professionals.`,
      },
      ...history
        .filter((m: { role: string; text: string }) => m.text && m.text.trim() !== "")
        .map((m: { role: string; text: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.text,
        })),
      { role: "user" as const, content: message },
    ];

    const stream = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages,
      max_tokens: 500,
      temperature: 0.7,
      stream: true,
    });

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("Chat error:", error?.message, error?.status, JSON.stringify(error?.error));
    return Response.json({ reply: "Sorry, something went wrong. Please try again." }, { status: 500 });
  }
}