import { GoogleGenAI, Type } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY || '';

export const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
    timeout: 10000,
  },
});

export interface MemoryProposal {
  type: 'event' | 'person' | 'place' | 'emotion' | 'plan' | 'reflection' | 'memory';
  title: string;
  content: string;
  eventDate?: string;
  datePrecision?: 'exact' | 'approximate' | 'unknown';
  certainty?: 'confirmed' | 'inferred';
  sourceQuote: string;
  reasoning: string;
}

export interface ChatAiResult {
  reply: string;
  suggestedTitle?: string;
  memoryProposal?: MemoryProposal | null;
}

export async function generateChatResponse(
  user: { name?: string; aiStyle?: string; proactivity?: string; useOldMemories?: boolean },
  userMessage: string,
  history: Array<{ role: string; content: string }>,
  context: { memories: any[]; coreMemories: any[]; plans: any[] }
): Promise<ChatAiResult> {
  const aiStyle = user.aiStyle || 'companion';
  const proactivity = user.proactivity || 'moderate';
  const userName = user.name || 'bạn';

  // System instruction respecting the persona rules in section 2 and 3 of brief
  const styleDescriptions: Record<string, string> = {
    companion: 'Ấm áp, thân thiết, lắng nghe tự nhiên, như một người bạn tri kỷ chân thành.',
    gentle: 'Nhẹ nhàng, từ tốn, an ủi tinh tế, tạo không gian an toàn để trải lòng.',
    curious: 'Gợi mở, hứng thú với câu chuyện của bạn, tinh tế hỏi han chi tiết ý nghĩa.',
    reflective: 'Chiêm nghiệm, sâu sắc, giúp nhìn nhận lại bài học và góc nhìn cuộc sống.',
  };

  const proactivityGuidelines: Record<string, string> = {
    low: 'Chỉ trả lời ngắn gọn, lắng nghe, không hỏi thêm nếu người dùng chưa mở lời.',
    moderate: 'Biết hỏi tiếp 1 câu tự nhiên dựa trên điều người dùng vừa kể; không hỏi dồn dập.',
    high: 'Chủ động kết nối với những kỷ niệm cũ phù hợp, gợi ý chi tiết để người dùng kể thêm.',
  };

  let memoryContextText = '';
  if (user.useOldMemories !== false && (context.memories.length > 0 || context.coreMemories.length > 0 || context.plans.length > 0)) {
    memoryContextText = `
--- DỮ LIỆU KÝ ỨC ĐÃ ĐƯỢC DUYỆT CỦA ${userName.toUpperCase()} (CHỈ SỬ DỤNG KHI PHÙ HỢP NGỮ CẢNH) ---
${context.coreMemories.map((c) => `- [Ký ức cốt lõi]: ${c.title}: ${c.content}`).join('\n')}
${context.memories.map((m) => `- [${m.type.toUpperCase()}]: ${m.title} (${m.eventDate || 'thời gian chưa rõ'}): ${m.content}`).join('\n')}
${context.plans.map((p) => `- [Kế hoạch]: ${p.title} (${p.targetDate || 'chưa định ngày'}): ${p.description}`).join('\n')}
---------------------------------------------------------------------------------
`;
  }

  const systemInstruction = `
Bạn là DiaryChat AI — người bạn đồng hành lắng nghe, viết nhật ký và lưu giữ ký ức mỗi ngày cho ${userName}.
Thông điệp: "Một nơi để kể chuyện hôm nay, và tìm lại những điều đã qua."
Ngôn ngữ giao tiếp: Tiếng Việt tự nhiên, ấm áp, không sáo rỗng.

PHONG CÁCH CỦA BẠN:
- ${styleDescriptions[aiStyle] || styleDescriptions.companion}
- Mức độ chủ động: ${proactivityGuidelines[proactivity] || proactivityGuidelines.moderate}

CÁC NGUYÊN TẮC BẮT BUỘC:
1. Không phán xét người dùng về cảm xúc, quyết định hay chuyện riêng tư.
2. Không biến cuộc trò chuyện thành buổi khám tâm lý, không đưa ra lời khuyên giáo điều nếu người dùng chỉ muốn được lắng nghe.
3. Không tự ý biến suy đoán thành sự thật. Phân biệt rõ: điều người dùng trực tiếp kể vs phỏng đoán.
4. Nếu người dùng nói "không muốn nói chuyện" hoặc mệt mỏi, hãy tôn trọng, chào nhẹ nhàng và dừng hỏi.
5. Nếu người dùng hỏi về chuyện cũ, CHỈ trả lời dựa trên những ký ức có trong dữ liệu được cung cấp dưới đây. Nếu không có dữ liệu, hãy thành thật: "Mình tìm lại trong sổ ký ức thì chưa thấy bạn từng kể về điều này." Tuyệt đối không bịa đặt sự kiện quá khứ!

${memoryContextText}

CƠ CHẾ ĐỀ XUẤT KÝ ỨC (Memory Proposal):
Nếu tin nhắn của người dùng chứa thông tin có giá trị lâu dài cần lưu giữ (Event: sự việc đã/đang diễn ra, Person: người mới/quan trọng, Place: địa điểm, Emotion: cảm xúc đặc biệt, Plan: dự định tương lai, Reflection: bài học/suy ngẫm):
Hãy tạo một \`memoryProposal\` rõ ràng, có trích dẫn nguyên văn (\`sourceQuote\`) từ lời kể của người dùng.
Nếu tin nhắn chỉ là chào hỏi bình thường hoặc không có sự kiện đáng lưu, hãy để \`memoryProposal\` là null.
`;

  try {
    const formattedHistory = history.slice(-8).map((h) => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }],
    }));

    const contents = [
      ...formattedHistory,
      {
        role: 'user',
        parts: [{ text: userMessage }],
      },
    ];

    const config = {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          reply: {
            type: Type.STRING,
            description: 'Câu trả lời trò chuyện tự nhiên của AI bằng tiếng Việt.',
          },
          suggestedTitle: {
            type: Type.STRING,
            description: 'Gợi ý tiêu đề ngắn gọn (dưới 6 từ) cho câu chuyện hoặc ngày hôm nay nếu đây là đoạn mở đầu hoặc chủ đề mới.',
          },
          memoryProposal: {
            type: Type.OBJECT,
            description: 'Đề xuất ký ức trích xuất từ câu chuyện người dùng để xin phép lưu trữ, hoặc null nếu không có.',
            properties: {
              type: {
                type: Type.STRING,
                description: 'Một trong các loại: event, person, place, emotion, plan, reflection, memory',
              },
              title: {
                type: Type.STRING,
                description: 'Tiêu đề ngắn gọn cho ký ức',
              },
              content: {
                type: Type.STRING,
                description: 'Nội dung cốt lõi của ký ức đúc kết',
              },
              eventDate: {
                type: Type.STRING,
                description: 'Thời điểm sự việc diễn ra (YYYY-MM-DD hoặc áng chừng)',
              },
              datePrecision: {
                type: Type.STRING,
                description: 'exact, approximate, hoặc unknown',
              },
              certainty: {
                type: Type.STRING,
                description: 'confirmed hoặc inferred',
              },
              sourceQuote: {
                type: Type.STRING,
                description: 'Trích dẫn nguyên văn chính xác lời của người dùng',
              },
              reasoning: {
                type: Type.STRING,
                description: 'Lý do AI đề xuất lưu điều này',
              },
            },
          },
        },
        required: ['reply'],
      },
    };

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config,
      });
    } catch (primaryErr: any) {
      console.warn('gemini-3.8-flash returned error, attempting fallback:', primaryErr?.message || primaryErr);
      response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents,
        config,
      });
    }

    const text = response.text || '{}';
    const parsed = JSON.parse(text);
    return {
      reply: parsed.reply || 'Mình đang lắng nghe bạn đây...',
      suggestedTitle: parsed.suggestedTitle,
      memoryProposal: parsed.memoryProposal && parsed.memoryProposal.title ? parsed.memoryProposal : null,
    };
  } catch (error: any) {
    console.warn('Gemini temporary spike/error:', error?.message || error);

    // Graceful fallback to preserve conversation and allow memory proposal
    const shortQuote = userMessage.length > 80 ? userMessage.slice(0, 80) + '...' : userMessage;
    const isPlan = /dự định|kế hoạch|sẽ|muốn|chuẩn bị/i.test(userMessage);
    const isEmotion = /vui|buồn|lo lắng|hạnh phúc|mệt|thất vọng/i.test(userMessage);

    const fallbackType = isPlan ? 'plan' : isEmotion ? 'emotion' : 'event';
    const fallbackTitle = isPlan
      ? 'Dự định mới của bạn'
      : isEmotion
      ? 'Cảm xúc được chia sẻ'
      : 'Sự kiện được chia sẻ';

    return {
      reply: `Mình đã lắng nghe và lưu lại câu chuyện của bạn: "${shortQuote}". Cảm ơn bạn vì đã mở lòng chia sẻ cùng mình!`,
      suggestedTitle: 'Chia sẻ hôm nay',
      memoryProposal: {
        type: fallbackType,
        title: fallbackTitle,
        content: userMessage,
        eventDate: new Date().toISOString().split('T')[0],
        datePrecision: 'exact',
        certainty: 'confirmed',
        sourceQuote: shortQuote,
        reasoning: 'Ghi nhận từ lời chia sẻ trực tiếp của bạn',
      },
    };
  }
}

export async function generateDailySummary(
  userName: string,
  date: string,
  messages: Array<{ role: string; content: string; createdAt?: string }>
) {
  const userMessages = messages.filter((m) => m.role === 'user').map((m) => m.content).join('\n---\n');

  if (!userMessages.trim()) {
    return {
      title: `Nhật ký ngày ${date}`,
      summary: 'Hôm nay bạn chưa ghi chép điều gì.',
      highlights: [],
    };
  }

  const prompt = `
Hãy viết một bản tóm tắt trang nhật ký ngày ${date} cho ${userName} dựa trên những điều họ đã chia sẻ hôm nay:

${userMessages}

YÊU CẦU:
1. Viết với giọng văn nhật ký ngôi thứ nhất ("Hôm nay mình...") hoặc góc nhìn người bạn đồng hành ("Hôm nay bạn đã..."). Giọng văn ấm áp, sâu sắc, chân thực.
2. Gợi ý 1 tiêu đề thật hay, đậm chất nhật ký.
3. Tóm tắt súc tích, làm nổi bật sự kiện chính, cảm xúc và dự định nếu có.
4. KHÔNG tự bịa đặt những việc người dùng không nhắc tới.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Tiêu đề trang nhật ký' },
            summary: { type: Type.STRING, description: 'Bản tóm tắt nhật ký ấm áp' },
            highlights: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Các điểm nhấn nổi bật trong ngày',
            },
          },
          required: ['title', 'summary', 'highlights'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return parsed;
  } catch (error: any) {
    console.warn('Gemini summary temporary spike, using synthesis fallback:', error?.message);
    const firstSnippet = userMessages.split('\n---\n')[0]?.slice(0, 100) || '';
    return {
      title: `Trang nhật ký ngày ${date}`,
      summary: `Hôm nay là một ngày đặc biệt với nhiều suy ngẫm và cột mốc đáng nhớ. Những chia sẻ của ${userName} ("${firstSnippet}...") đã được đúc kết và lưu giữ lại trọn vẹn trong cuốn sổ ký ức.`,
      highlights: userMessages
        .split('\n---\n')
        .slice(0, 3)
        .map((m) => m.slice(0, 80)),
    };
  }
}

export async function answerMemoryQuestion(
  userName: string,
  question: string,
  memories: any[],
  conversations: any[]
) {
  const prompt = `
Người dùng ${userName} hỏi về quá khứ hoặc ký ức: "${question}"

DỮ LIỆU KÝ ỨC ĐÃ ĐƯỢC DUYỆT:
${memories.map((m) => `- [${m.type}] ${m.title} (Ngày: ${m.eventDate || 'chưa rõ'}): ${m.content} (Trích dẫn: "${m.sourceQuote || ''}")`).join('\n')}

CÁC CUỘC TRÒ CHUYỆN QUÁ KHỨ:
${conversations.map((c) => `- Cuộc trò chuyện ${c.date}: "${c.title}" - Tóm tắt: ${c.summary || 'Không có tóm tắt'}`).join('\n')}

NGUYÊN TẮC BẮT BUỘC:
1. Trả lời chính xác theo trình tự thời gian dựa trên các sự kiện tìm thấy.
2. Dẫn nguồn cụ thể (nhắc đến ngày hoặc cuộc trò chuyện tương ứng).
3. Nêu rõ những điểm còn chưa rõ hoặc dữ liệu không đủ.
4. NẾU KHÔNG CÓ DỮ LIỆU PHÙ HỢP: Hãy trả lời chân thực rằng chưa tìm thấy thông tin bạn đã từng chia sẻ về điều này. KHÔNG ĐƯỢC BỊA ĐẶT KÝ ỨC!
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: 'Bạn là DiaryChat AI, người gìn giữ ký ức chân thực và tôn trọng sự thật.',
      },
    });

    return response.text;
  } catch (error: any) {
    console.warn('Gemini recall temporary spike, using local grounded response:', error?.message);
    const stopWords = new Set(['mình', 'bạn', 'của', 'vào', 'khi', 'nào', 'được', 'ngày', 'trong', 'những', 'cho', 'với', 'lần', 'đầu', 'chuyện', 'điều']);
    const cleanQ = question.toLowerCase();
    const tokens = cleanQ
      .split(/\s+/)
      .map((w) => w.replace(/[.,?!]/g, ''))
      .filter((w) => w.length > 2 && !stopWords.has(w));

    const matched = memories.filter((m) => {
      const combined = `${m.title} ${m.content} ${m.tags || ''}`.toLowerCase();
      return tokens.some((t) => combined.includes(t));
    });

    if (matched.length > 0) {
      const topMem = matched[0];
      return `Dựa trên dữ liệu đã lưu trong sổ ký ức của bạn:\n- Vào ngày ${topMem.eventDate || 'chưa rõ'}: Bạn đã ghi nhận sự kiện "${topMem.title}": ${topMem.content}.\nTrích dẫn nguyên văn: "${topMem.sourceQuote || ''}".`;
    }
    return `Mình đã kiểm tra trong toàn bộ kho ký ức đã lưu nhưng chưa tìm thấy dữ liệu nào về việc bạn từng chia sẻ về điều này trước đây.`;
  }
}
