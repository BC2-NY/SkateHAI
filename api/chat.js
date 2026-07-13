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

  // ARIAの技術指導ナレッジベース（コーチ提供の実践的解説）
  const JUMP_KNOWLEDGE = `
【ジャンプ技術指導ナレッジ（元選手・コーチ視点）】

■ 全ジャンプ共通
- 構えの姿勢では、右肩が前に回転してねじれていたり大きく開きすぎていると腕を締めにくい。左腕を12時方向、右腕を3〜4時方向程度に開くと綺麗な上半身のポジションになる。
- 空中姿勢ではバックスクラッチの姿勢で軸を取るが、右足と左足の隙間が大きく開いていると軸をまっすぐ取れない。
- 上半身と下半身を連動させて跳ぶため、腹筋や腹斜筋を使って腹圧をかけ、安定した姿勢を取ることが重要。

■ サルコウ（Salchow / 3S・4S）
- スリーターン、またはモホーク（モフォーク）からのエントリーがポピュラー。
- 構えでの右足の位置は個人の好み・飛びやすさに依存するが、飛び上がった際は7時方向へ素早く右足を上げて軸を作る必要がある。
- 飛び上がる際に腰と氷の平行が作れていないと、空中姿勢を作る間に姿勢がぶれて軸が真っ直ぐにならない。

■ トーループ（Toe Loop / 3T・4T）
- スリーターンからのエントリーが最もポピュラー。
- フリーレッグである左足は構えのときは後ろへ伸ばしても良いが、飛ぶ瞬間にトーを突く位置は右足の近く、右足のかかとの後ろの地点に突く。

■ ループ（Loop / 3Lo・4Lo）
- モホーク、またはスリーターンからのエントリーがポピュラー。より高難度のエントリーとしてダブルスリーターンからのエントリーを様々な選手が使用している。
- 右足のバックアウトサイドを自然な円の弧に滑らせ、その弧と平行もしくは同じ弧へ左足のバックインサイドを沿わせることが重要。
- 飛ぶ瞬間、左足を7時方向へ素早く上げて軸を作る。重心は右足の軸に置く。

■ フリップ（Flip / 3F・4F）※ユーザー表記「フィリップ」
- スリーターン、またはモホークからのエントリーがポピュラー。より高難度のエントリーとしてポップコーンターンやダブルスリーターンからのエントリーがある。
- 左足のバックインサイドで弧に滑っている際、上半身の右肩が下がりがち。右肩が下がると軸を作る動きに持っていけない。
- 右足のトーを突く位置は左足の右隣。

■ ルッツ（Lutz / 3Lz・4Lz）
- バックアウトカーブの姿勢を取る際、重心がぶれないよう腹圧を意識する。
- 飛ぶ瞬間、左足を真後ろへ振り上げるように下半身を回転させ、その力を利用して回転する。

このナレッジは実際の指導現場に基づく。技術系の質問にはこの内容を根拠として具体的・実践的に解説すること。
`;

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
