/* ============================================
   diagnose.js - プロンプト診断ロジック（純粋関数）
   ============================================ */

/* ============================================
   判定キーワード辞書
   自分の用途に合わせて自由に追加・調整してください。
   ============================================ */

const ROLE_KEYWORDS = [
  'あなたは', '君は', 'お前は', 'あなた方は', 'きみは',
  'として答え', 'として振る舞', 'として回答', 'の立場で',
  'のプロ', 'のエキスパート', 'の専門家', 'の達人',
  'You are', 'Act as', 'You\'re', 'Role:', '【Role', '【役割'
];

const ROLE_PROFESSION_PATTERNS = [
  // 技術職
  'エンジニア', 'プログラマー', '開発者', 'デベロッパー',
  'デザイナー', 'アーキテクト', 'データサイエンティスト', 'データアナリスト',
  // ライティング・編集
  '編集者', '校正', 'ライター', '翻訳', 'コピーライター', 'ジャーナリスト',
  // 教育・指導
  '先生', '教師', 'コーチ', 'メンター', 'インストラクター', '講師', 'チューター',
  // ビジネス系
  'コンサル', 'コンサルタント', 'アナリスト', 'ストラテジスト', 'アドバイザー',
  'マーケター', 'プランナー', 'プロデューサー', 'ディレクター',
  'マネージャー', 'リーダー', 'マネジャー',
  '営業', '企画', '人事', '財務', '法務', '広報',
  '部長', '課長', '主任', '担当', '責任者', '取締役', '役員',
  // ファシリテーション・進行
  'ファシリテーター', 'モデレーター', 'リサーチャー',
  // 専門職
  '医師', '医者', '弁護士', '税理士', '会計士', '研究者', '科学者',
  // その他
  '提案者', 'アシスタント', '秘書', 'パートナー', 'パートナーシップ',
  'スペシャリスト', 'プロ', 'エキスパート', '達人', '名人', 'プロフェッショナル',
  // 英語
  'engineer', 'developer', 'designer', 'writer', 'editor', 'translator',
  'manager', 'leader', 'director', 'consultant', 'strategist', 'advisor',
  'researcher', 'specialist', 'expert', 'analyst', 'coach', 'mentor',
  'professional', 'assistant', 'PM', 'CEO', 'CTO', 'CMO'
];

const CONTEXT_KEYWORDS = [
  // 時点・状況
  '現在', '今', '今回', '直近', '最近', '現状', '実態',
  // 前提・背景
  '前提', '背景', '状況', '事情', '理由', 'なぜなら', 'というのも',
  '目的', '課題', '問題', '困っ', 'ところ',
  // 参照
  '以下の', '次の', '上記の', '下記', '添付', '対象', '読者',
  // 環境・条件
  '使用', '環境', 'ターゲット', '条件', '制約', 'ケース',
  // 主体
  '私は', '私たち', '自分は', '自分たち', '弊社', '当社', '当チーム',
  'チームでは', 'プロジェクト', '組織では',
  // 形式パターン
  '〜中', '〜について', 'の場合', '〜のとき', 'においては',
  // セクション見出し
  'Context:', '【Context', '【背景', '【前提', '【状況', '【目的'
];

const TASK_VERBS = [
  // 創造系
  '書い', '書き', '作っ', '作り', '作成', '制作', '生成', '構成',
  '実装', '開発', '設計', 'デザイン', '草稿', 'ドラフト',
  // 思考系
  '考え', '提案', '案出', '案を', 'アイデア', '発想',
  '判断', '評価', '選択', '選ん', '決め',
  // 説明系
  '教え', '説明', '解説', '回答', '答え', '返答',
  // 整理系
  '整理', '要約', 'まとめ', 'リスト', '抽出', '比較', '分類',
  // 修正系
  '翻訳', '校正', '改善', '修正', '直し', 'リファクタ',
  // 検証系
  '分析', '検証', 'デバッグ', '確認', 'チェック',
  // 一般動詞
  '実行', '計算', '描写', '出して', '送って', '返し',
  // 指示語
  'ください', 'して下さい', 'お願い', 'してほしい',
  // 英語
  'create', 'write', 'generate', 'explain', 'summarize', 'translate',
  'review', 'design', 'analyze', 'help', 'plan', 'evaluate',
  'list', 'compare', 'suggest', 'refactor', 'debug', 'draft'
];

const FORMAT_KEYWORDS = [
  // 構造化
  '箇条書き', '番号', 'リスト', 'テーブル', '表形式', '表で', '一覧',
  // データ形式
  'JSON', 'YAML', 'XML', 'CSV', 'マークダウン', 'Markdown', 'HTML',
  'コードブロック', 'コード形式', 'スニペット',
  // 文章形式
  'スレッド形式', 'ツリー形式', '段落で', '見出し', 'チャート',
  // 量の指定
  '文字以内', '字以内', '文字以下', '行以内', '行で', '項目',
  'ワード以内', '単語以内', 'パラグラフ',
  // 順序指定
  '形式で', 'フォーマット', '構造で', 'パターンで',
  'の順で', 'の順序', '以下の順序', '以下の流れで',
  '最初に', 'まず', '次に', '最後に', '結論から',
  // 出力指示
  'のみ出力', 'のみ返', 'だけ書い', 'だけ出力',
  '出力例', 'output:', '出力形式', 'アウトプット',
  // セクション見出し
  'Format:', '【Format', '【形式', '【出力', '【フォーマット',
  'Example:', '【Example', '【例'
];

/* ============================================
   個別判定関数
   ============================================ */

function diagnoseRole(text) {
  const lower = text.toLowerCase();
  let score = 0;
  const matched = [];

  const hasRoleKeyword = ROLE_KEYWORDS.some(kw => {
    if (text.includes(kw) || lower.includes(kw.toLowerCase())) {
      matched.push(kw);
      return true;
    }
    return false;
  });

  if (hasRoleKeyword) score += 15;

  const hasProfession = ROLE_PROFESSION_PATTERNS.some(p => {
    if (text.includes(p) || lower.includes(p.toLowerCase())) {
      matched.push(p);
      return true;
    }
    return false;
  });

  if (hasProfession) score += 10;

  return {
    score,
    level: score >= 20 ? 'ok' : score >= 10 ? 'mid' : 'ng',
    found: matched,
    advice: score === 0
      ? '「あなたは○○です」と役割を与えると、AIの専門性が大きく変わります。'
      : score < 20
        ? '役割を「経験豊富な○○」のように具体化すると、より精度が上がります。'
        : null
  };
}

function diagnoseContext(text) {
  const len = text.length;
  let score = 0;

  if (len >= 30) score += 5;
  if (len >= 80) score += 5;

  const matched = CONTEXT_KEYWORDS.filter(kw => text.includes(kw));
  if (matched.length >= 1) score += 7;
  if (matched.length >= 2) score += 8;

  if (len >= 150 && matched.length >= 1) score = Math.max(score, 25);

  score = Math.min(score, 25);

  return {
    score,
    level: score >= 20 ? 'ok' : score >= 10 ? 'mid' : 'ng',
    found: matched,
    advice: score === 0
      ? '背景や前提（今どんな状況か、何を使っているか）を加えると、AIは的外れな回答を出さなくなります。'
      : score < 20
        ? '「使用言語」「対象読者」「目的」など、具体的な前提情報を増やすと精度が上がります。'
        : null
  };
}

function diagnoseTask(text) {
  let score = 0;
  const matched = [];

  const hasVerb = TASK_VERBS.some(v => {
    if (text.includes(v)) {
      matched.push(v);
      return true;
    }
    return false;
  });

  if (hasVerb) score += 15;

  if (hasVerb && text.length >= 20) score += 10;

  return {
    score,
    level: score >= 20 ? 'ok' : score >= 10 ? 'mid' : 'ng',
    found: matched,
    advice: score === 0
      ? '「○○してください」のように、具体的な動詞で何をしてほしいかを書いてください。'
      : score < 20
        ? '対象（何を）と動詞（どうする）の両方を含めると指示が明確になります。'
        : null
  };
}

function diagnoseFormat(text) {
  const lower = text.toLowerCase();
  let score = 0;
  const matched = [];

  const found = FORMAT_KEYWORDS.some(kw => {
    if (text.includes(kw) || lower.includes(kw.toLowerCase())) {
      matched.push(kw);
      return true;
    }
    return false;
  });

  if (found) score = 25;

  return {
    score,
    level: score >= 20 ? 'ok' : 'ng',
    found: matched,
    advice: score === 0
      ? '「箇条書きで」「200字以内で」「コードブロックで」など出力形式を指定すると整います。'
      : null
  };
}

/* ============================================
   統合診断関数
   ============================================ */

function diagnosePrompt(text) {
  const trimmed = (text || '').trim();

  if (trimmed.length === 0) {
    return null;
  }

  const role = diagnoseRole(trimmed);
  const context = diagnoseContext(trimmed);
  const task = diagnoseTask(trimmed);
  const format = diagnoseFormat(trimmed);

  const totalScore = role.score + context.score + task.score + format.score;

  let overall;
  if (totalScore >= 80) overall = 'excellent';
  else if (totalScore >= 50) overall = 'fair';
  else overall = 'poor';

  return {
    role,
    context,
    task,
    format,
    totalScore,
    overall,
    verdict: overall === 'excellent'
      ? '優秀なプロンプトです。'
      : overall === 'fair'
        ? 'もう一息！構造を整えると伸びます。'
        : '構造化すると大きく変わります。'
  };
}

/* ============================================
   診断結果からブロック抽出
   ============================================ */

function extractBlocks(text, diagnosis) {
  const trimmed = (text || '').trim();

  const blocks = {
    role: '',
    context: '',
    task: '',
    format: ''
  };

  if (!trimmed) return blocks;

  const lines = trimmed.split(/\n+/).map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    const hasRole = ROLE_KEYWORDS.some(kw => line.includes(kw))
      || ROLE_PROFESSION_PATTERNS.some(p => line.includes(p));
    if (hasRole && !blocks.role) {
      blocks.role = line;
      continue;
    }

    const hasFormat = FORMAT_KEYWORDS.some(kw => line.includes(kw));
    if (hasFormat && !blocks.format) {
      blocks.format = line;
      continue;
    }

    const hasVerb = TASK_VERBS.some(v => line.includes(v));
    if (hasVerb && !blocks.task) {
      blocks.task = line;
      continue;
    }

    if (!blocks.context) {
      blocks.context = line;
    } else {
      blocks.context += '\n' + line;
    }
  }

  if (!blocks.task && trimmed) {
    blocks.task = trimmed;
  }

  return blocks;
}
