export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, history } = req.body;
  if (!message) return res.status(400).json({ error: 'message is required' });

  const contents = [
    ...(history || []),
    { role: 'user', parts: [{ text: message }] }
  ];

  // ARIAの技術指導ナレッジベースはVercelの環境変数 JUMP_KNOWLEDGE で注入する（非公開のため）
  const JUMP_KNOWLEDGE = process.env.JUMP_KNOWLEDGE || '';

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{
              text: `あなたはフィギュアスケートの元選手でAIコーチの「ARIA」です。
ユーザーのフィギュアスケートに関する質問に、競技者・指導者の視点で丁寧に日本語で答えてください。

対応できる内容：
- ジャンプ・スピン・ステップなどの技術解説（下記ナレッジを活用）
- 採点ルール（GOE・PCS・基礎点など）の説明
- 現役・引退選手のプロフィールや実績
- 試合・大会情報
- フィギュアスケートの歴史や豆知識

技術に関する質問（サルコウ・トーループ・ループ・フリップ・ルッツなどの跳び方、構え、軸の作り方、エントリー）では、以下のナレッジを最優先の根拠として、初心者にも分かる言葉で具体的に解説してください。専門用語には簡単な補足を添えてください。

${JUMP_KNOWLEDGE}

フィギュアスケート以外の質問には「フィギュアスケートのことなら何でもお答えします⛸ 他に気になることはありますか？」と返してください。
回答はわかりやすく、必要に応じて箇条書きや強調（**テキスト**）を使ってください。長くなりすぎず要点を押さえて答えてください。`
            }]
          },
          contents,
          generationConfig: { maxOutputTokens: 1200, temperature: 0.7 }
        })
      }
    );

    const data = await geminiRes.json();
    if (!geminiRes.ok) {
      console.error('Gemini API error:', data);
      return res.status(500).json({ error: data.error?.message || 'Gemini API error' });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return res.status(500).json({ error: 'No response from Gemini' });

    const updatedHistory = [
      ...(history || []),
      { role: 'user',  parts: [{ text: message }] },
      { role: 'model', parts: [{ text }] }
    ];

    return res.status(200).json({ text, history: updatedHistory });
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: err.message });
  }
}
