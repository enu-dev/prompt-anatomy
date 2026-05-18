# 設計書（アーキテクチャ + UI）：prompt-anatomy

**作成：** アーキテクト 藤井 誠 + UIUXデザイナー 宮崎 光  
**作成日：** 2026-05-18

---

## PART 1：ファイル構成（アーキテクト 藤井）

```
prompt-anatomy/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── templates.js   ← テンプレートデータ
│   ├── diagnose.js    ← 診断ロジック
│   └── app.js         ← UI制御・DOM操作
├── README.md
└── LICENSE
```

### js分割の理由
- `templates.js`：テンプレートデータの定義（後から追加しやすい構造）
- `diagnose.js`：診断ロジックを純粋関数で分離（テストしやすい）
- `app.js`：DOM操作とイベント処理（UI制御）

### index.html の読み込み順
```html
<link rel="stylesheet" href="css/style.css">
<script src="js/templates.js" defer></script>
<script src="js/diagnose.js" defer></script>
<script src="js/app.js" defer></script>
```

---

## PART 2：CSS変数設計（藤井 + 宮崎）

```css
:root {
  /* 背景・サーフェス */
  --color-bg: #0d1117;
  --color-surface: #161b22;
  --color-surface-elevated: #1c2128;
  --color-border: #30363d;

  /* ブロック別カラー（4ブロックの識別カラー） */
  --color-role: #c084fc;       /* 紫：役割 */
  --color-context: #60a5fa;    /* 青：文脈 */
  --color-task: #4ade80;       /* 緑：指示 */
  --color-format: #fbbf24;     /* 橙：形式 */

  /* 状態カラー */
  --color-success: #3fb950;
  --color-warning: #d29922;
  --color-error: #f85149;

  /* テキスト */
  --color-text: #e6edf3;
  --color-text-muted: #8b949e;
  --color-text-strong: #ffffff;

  /* フォント */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', sans-serif;
  --font-mono: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;

  /* サイズ */
  --radius: 8px;
  --radius-lg: 12px;
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --transition: 0.2s ease;
}
```

---

## PART 3：JS関数設計（藤井）

### diagnose.js（純粋関数）

```javascript
/**
 * プロンプトを4ブロックで診断する
 * @param {string} text - プロンプト全文
 * @returns {Object} 診断結果
 */
function diagnosePrompt(text) {
  return {
    role: diagnoseRole(text),       // { score, level, found, advice }
    context: diagnoseContext(text),
    task: diagnoseTask(text),
    format: diagnoseFormat(text),
    totalScore: ...,                // 0-100
    overall: ...                    // 'excellent' | 'fair' | 'poor'
  };
}

function diagnoseRole(text) {...}
function diagnoseContext(text) {...}
function diagnoseTask(text) {...}
function diagnoseFormat(text) {...}

/**
 * 診断結果からビルドモード用の初期値を生成
 */
function extractBlocks(text, diagnosis) {
  return {
    role: '...',     // 抽出 or 空
    context: '...',
    task: '...',
    format: '...'
  };
}
```

### templates.js

```javascript
const TEMPLATES = [
  {
    id: 'code',
    name: 'コード生成',
    icon: '⚡',
    description: 'プログラミングコードを書かせる',
    role: 'あなたは経験豊富なソフトウェアエンジニアです。',
    context: '使用言語：[ここに記入]\n環境：[ここに記入]\n制約：[ここに記入]',
    task: '[何を作るか]を実装してください。',
    format: 'コードブロックで出力し、主要な処理に短いコメントをつけてください。'
  },
  {
    id: 'edit',
    name: '文章校正',
    ...
  },
  // ...合計5種
];
```

### app.js

```javascript
// 状態管理（モジュールスコープ）
const state = {
  mode: 'diagnose',        // 'diagnose' | 'build'
  diagnosis: null,
  blocks: { role: '', context: '', task: '', format: '' },
  template: null,
  format: 'xml'            // 'xml' | 'plain'
};

// 主要関数
function init() {...}
function switchMode(mode) {...}
function handleDiagnose() {...}
function renderDiagnosis(diagnosis) {...}
function loadTemplate(templateId) {...}
function updateBlock(key, value) {...}
function renderPreview() {...}
function copyPrompt() {...}
function saveToLocalStorage() {...}
function loadFromLocalStorage() {...}
```

### localStorage設計

```
キー名前空間：promptAnatomy:state

保存形式：
{
  "blocks": { "role": "...", "context": "...", "task": "...", "format": "..." },
  "mode": "build",
  "format": "xml",
  "savedAt": "2026-05-18T..."
}
```

---

## PART 4：UI設計（UIUXデザイナー 宮崎）

### レイアウト

#### PC（1280px以上）

```
┌──────────────────────────────────────────────────────────┐
│  Header: ロゴ + タグライン                                   │
│  [診断モード] [ビルドモード]                                  │
├──────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐  ┌─────────────────────────────┐ │
│  │  入力エリア            │  │  プレビュー or 診断結果       │ │
│  │  （左半分）            │  │  （右半分）                  │ │
│  │                     │  │                            │ │
│  │  [テキストエリア]       │  │  [4ブロックの色付きプレビュー] │ │
│  │  [診断する/コピーする]  │  │  [品質スコア表示]            │ │
│  └─────────────────────┘  └─────────────────────────────┘ │
├──────────────────────────────────────────────────────────┤
│  Footer: 著作・GitHub                                       │
└──────────────────────────────────────────────────────────┘
```

#### スマホ（375px）

縦並びに切り替え：
- ヘッダー
- モード切替タブ
- 入力エリア
- プレビュー/結果エリア
- フッター

### モード切替タブ

```
[💉 診断する]  [🧱 組み立てる]
```

- 選択中のタブは下線 + アクセントカラー
- アイコンは絵文字で軽量化

### 診断モード画面

**入力エリア（左）：**
- テキストエリア（高さ：300px、リサイズ可）
- プレースホルダー：「コード書いて」「翻訳してほしい」など、雑なプロンプトの例
- 「💉 診断する」ボタン（プライマリ）
- 「サンプルを試す」リンク

**結果エリア（右）：**
```
┌────────────────────────────┐
│      品質スコア              │
│         42 / 100            │
│      もう一息！              │
├────────────────────────────┤
│ ● Role     ×  なし          │
│ ● Context  △  弱い          │
│ ● Task     ○  あり          │
│ ● Format   ×  なし          │
├────────────────────────────┤
│ アドバイス：                  │
│ ・役割を指定すると専門性UP    │
│ ・出力形式を決めると整う      │
├────────────────────────────┤
│ [🧱 構造化する →]            │
└────────────────────────────┘
```

### ビルドモード画面

**入力エリア（左）：**
- テンプレート選択（横スクロールできるチップ群）
  ```
  [⚡コード生成] [✏️文章校正] [💡アイデア] [📝要約] [🌐翻訳]
  ```
- 4つの色付きブロック（縦並び）：
  ```
  ┌── Role 紫 ──────────────┐
  │ [テキストエリア]            │
  │ ヒント：誰として答えるか     │
  └────────────────────────┘
  ┌── Context 青 ────────────┐
  │ [テキストエリア]            │
  │ ヒント：背景・前提情報       │
  └────────────────────────┘
  ┌── Task 緑 ──────────────┐
  │ [テキストエリア]            │
  │ ヒント：何をしてほしいか     │
  └────────────────────────┘
  ┌── Format 橙 ─────────────┐
  │ [テキストエリア]            │
  │ ヒント：出力形式の指定       │
  └────────────────────────┘
  ```

**プレビューエリア（右）：**
- 切り替え：[XML形式] [プレーン形式]
- 色付きプレビュー（各ブロックの色を背景にうっすら表示）
- 「📋 コピー」ボタン（大きめ）
- 「クリア」リンク

### インタラクション仕様

- 診断ボタン押下 → 0.3秒のフェードイン → 結果表示
- スコア数字 → カウントアップアニメーション（0 → 実数値、0.5秒）
- ブロック判定 → 1つずつ順番に表示（0.1秒ずつディレイ）
- コピー成功 → ボタンが「✓ Copied!」に変化（2秒）→ 戻る
- モード切替 → タブのアクセントが0.2秒でスライド

### アクセシビリティ

- コントラスト比4.5:1以上（テキスト/背景）
- フォーカスリングを明示（`outline: 2px solid var(--color-role)` 等）
- ボタンは`button`要素を使用（divでクリックを実装しない）
- スコア表示は `aria-live="polite"`

### スクリーンショット用デモデータ

**診断モード用（悪い例）：**
```
コード書いて
```
→ スコア20点 / Roleなし・Contextなし・Task弱・Formatなし

**診断モード用（良い例）：**
```
あなたはJavaScriptに精通したエンジニアです。
現在Next.js 14でブログサイトを作っています。
記事一覧をページネーションする関数を、TypeScriptで書いてください。
コードブロックで出力し、主要な処理にコメントをつけてください。
```
→ スコア95点 / 全ブロック充実

**ビルドモード用（テンプレート：コード生成）：**
- Role：「あなたは経験豊富なソフトウェアエンジニアです。」
- Context：「使用言語：JavaScript / 環境：Node.js 20 / 制約：外部ライブラリ不可」
- Task：「URLを受け取ってOGP情報を取得する関数を実装してください。」
- Format：「コードブロックで出力し、エラーハンドリングのコメントを含めてください。」

---

## PART 5：CTO承認事項

- バニラJSのみで実現可能 → ✅
- 外部CDN不要 → ✅
- GitHub Pages公開可能 → ✅
- ファイル構成標準 → ✅
- セキュリティ：XSS対策必須（textContent使用・innerHTMLは避ける）→ ⚠️ FE2に指示

---

*アーキテクト 藤井 誠 + UIUXデザイナー 宮崎 光 / 次工程：実装*
