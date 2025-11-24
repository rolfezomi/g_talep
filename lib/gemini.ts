import { GoogleGenerativeAI } from "@google/generative-ai";
import { AIRoutingResponse, TicketPriority, Department } from "@/types";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

export async function routeTicketToDepartment(
  title: string,
  description: string,
  departments: Department[]
): Promise<AIRoutingResponse> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const departmentList = departments.map(d => `- ${d.name}: ${d.description || 'Açıklama yok'}`).join('\n');

    const prompt = `Sen bir kozmetik firmasında çalışan akıllı bir talep yönlendirme asistanısın.

Aşağıdaki departmanlar var:
${departmentList}

Kullanıcıdan gelen talep:
Başlık: ${title}
Açıklama: ${description}

Bu talebi hangi departmana yönlendirmelisin? Ayrıca talebin aciliyet seviyesini ve etiketlerini belirle.

SADECE aşağıdaki JSON formatında yanıt ver (başka açıklama ekleme):
{
  "department_name": "departman ismi",
  "confidence_score": 0.95,
  "reasoning": "Kısa açıklama",
  "suggested_priority": "dusuk|normal|yuksek|acil",
  "suggested_tags": ["etiket1", "etiket2"]
}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // JSON'ı parse et
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI yanıtı JSON formatında değil');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Departman ID'sini bul
    const department = departments.find(
      d => d.name.toLowerCase() === parsed.department_name.toLowerCase()
    );

    if (!department) {
      throw new Error('Departman bulunamadı');
    }

    return {
      department_id: department.id,
      department_name: department.name,
      confidence_score: parsed.confidence_score,
      reasoning: parsed.reasoning,
      suggested_priority: parsed.suggested_priority as TicketPriority,
      suggested_tags: parsed.suggested_tags
    };
  } catch (error) {
    console.error('AI routing error:', error);

    // Fallback: İlk departmanı döndür
    return {
      department_id: departments[0].id,
      department_name: departments[0].name,
      confidence_score: 0.5,
      reasoning: 'AI analizi başarısız oldu, varsayılan departman atandı.',
      suggested_priority: TicketPriority.NORMAL,
      suggested_tags: []
    };
  }
}

export async function analyzeSimilarTickets(
  description: string,
  limit: number = 3
): Promise<string[]> {
  // Bu fonksiyon gelecekte benzer talepleri bulmak için kullanılabilir
  // Şimdilik placeholder
  return [];
}

export async function generateResponseSuggestion(
  ticketDescription: string,
  context: string
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Sen bir müşteri hizmetleri temsilcisisin. Aşağıdaki talebe profesyonel ve yardımcı bir yanıt öner:

Talep: ${ticketDescription}

Bağlam: ${context}

Türkçe, kibar ve çözüm odaklı bir yanıt yaz:`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error('Response suggestion error:', error);
    return 'Yanıt önerisi oluşturulamadı.';
  }
}
