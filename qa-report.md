# QAレポート：prompt-anatomy

**実施：** QAエンジニア 浜田 千春  
**実施日：** 2026-05-18  
**対象：** index.html + css/style.css + js/{templates,diagnose,app}.js

---

## 実施環境について（重要）

本QAは「コードレベルでの静的検査」と「ロジックトレースによる動作シミュレーション」で実施した。
実機ブラウザでの最終確認はえぬが GitHub Pages 公開後に行うこととする（公開後の最終チェックは別途実施）。

---

## ファイル構成チェック

| 項目 | 結果 |
|------|------|
| index.html 存在 | ✅ |
| css/style.css 存在 | ✅ |
| js/templates.js 存在 | ✅ |
| js/diagnose.js 存在 | ✅ |
| js/app.js 存在 | ✅ |
| index.html に `<style>` 直書きなし | ✅ |
| index.html に `<script>` 本体直書きなし | ✅ |
| 全パス相対パス（GitHub Pages 対応） | ✅ |

---

## ロジックトレース：診断モード

### シナリオ A：「コード書いて」（悪い例）

| 入力 | `コード書いて`（6文字） |
|------|------|
| Role 判定 | キーワードなし → 0/25 |
| Context 判定 | 30文字未満 → 0/25 |
| Task 判定 | 「書い」検出（15点） / 20文字未満なので +0 → 15/25 |
| Format 判定 | キーワードなし → 0/25 |
| **合計** | **15/100** |
| Verdict | "構造化すると大きく変わります。" |

**確認：** 期待通り低スコアになる ✅

### シナリオ B：良い例

| 入力 | "あなたはJavaScriptに精通したエンジニアです。現在Next.js 14...（4文構造）" |
|------|------|
| Role 判定 | 「あなたは」+「エンジニア」検出 → 25/25 |
| Context 判定 | 80文字以上 +「現在」「Next.js」/ ただし「Next.js 14」はキーワード外 → 17〜25/25 |
| Task 判定 | 「書い」+ 20文字以上 → 25/25 |
| Format 判定 | 「コードブロック」検出 → 25/25 |
| **合計** | **92/100** |
| Verdict | "優秀なプロンプトです。" |

**確認：** 期待通り高スコアになる ✅

### シナリオ C：空入力

- `diagnosePrompt('')` → `null` を返す
- `renderDiagnosisResult` が null を受けて空状態を表示
- エラーなく継続 ✅

### シナリオ D：「構造化する →」ボタン

- `extractBlocks` が呼ばれ、文を解析
- Role/Format/Task キーワードを含む行は対応ブロックに、それ以外はContextに割り当て
- どれにも該当しない場合は Task に全文を入れるフォールバック ✅
- `switchMode('build')` で自動的にビルドモード切替 ✅

---

## ロジックトレース：ビルドモード

### テンプレート切替

- 5種すべてがチップとして表示される
- クリック時に `loadTemplate(id)` が呼ばれる
- state.blocks が更新され、4つの textarea に反映される
- アクティブチップに視覚的フィードバック ✅

### リアルタイムプレビュー

- textarea の input イベントで `renderPreview` が呼ばれる
- XML形式：`<role>...</role>` 形式 + 色付き表示
- プレーン形式：`# 役割\n...` 形式
- 空ブロックは出力されない ✅

### XSS対策の検証

- `escapeHtml` 関数：`<div>.textContent = str; return div.innerHTML;`
  - `<script>alert(1)</script>` を入力 → `&lt;script&gt;alert(1)&lt;/script&gt;` に変換 ✅
- ユーザー入力は全て `escapeHtml` 経由か `textContent` 経由
- 唯一の innerHTML 直接代入箇所（`renderTemplateChips`, `score-display`, `blockEl`）はハードコードのメタデータのみ ✅

### コピー機能

- `navigator.clipboard.writeText` がメイン
- 失敗時は `document.execCommand('copy')` フォールバック
- どちらも失敗してもアプリは停止しない ✅
- コピー成功時：ボタンが「Copied!」表示・緑色（1.8秒）→ 戻る ✅

### localStorage

- キー名前空間 `promptAnatomy:state` 使用 ✅
- 保存：mode/blocks/templateId/format/savedAt
- 復元時：データ欠落・JSON.parse エラーがあっても try/catch で握りつぶし、初期状態継続 ✅
- プライベートブラウズで localStorage 不可でもエラーなく動作 ✅

---

## 異常系・エッジケース

| ケース | 結果 |
|-------|------|
| 空入力で診断ボタン | null返却 → 空状態を再表示 ✅ |
| 改行のみの入力 | trim() で空判定 → null扱い ✅ |
| 超長文（10000文字）入力 | 診断ロジックはO(n)、固まらない ✅ |
| クリップボード API 利用不可（Safari旧版・http環境） | execCommand フォールバック動作 ✅ |
| localStorage 利用不可 | try/catch で例外スルー、機能継続 ✅ |
| ブロック全部空でコピー押下 | trim()で空判定して return ✅ |
| `<script>` タグを入力 | escapeHtml で無害化 ✅ |

---

## アクセシビリティ

| 項目 | 結果 |
|------|------|
| 全ボタンが `<button>` 要素 | ✅ |
| モードタブに `role="tab"` + `aria-selected` | ✅ |
| 結果エリアに `aria-live="polite"` | ✅ |
| テンプレートチップに `role="radio"` + `aria-checked` | ✅ |
| Format切替に `aria-pressed` | ✅ |
| 全テキストエリアに `aria-label` | ✅ |
| フォーカスリング表示（`:focus-visible`） | ✅ |
| prefers-reduced-motion 対応 | ✅ |
| コントラスト比（テキスト #e6edf3 / 背景 #0d1117） | コントラスト比 約14:1 ✅ |

---

## レスポンシブ（コードレベル確認）

| ブレークポイント | 設計 |
|------------|------|
| ~480px（スマホ縦） | パネル padding 縮小、ボタン縦並びfullwidth |
| 768px〜（タブレット） | コンテナpadding拡大、フォント拡大 |
| 980px〜（PC） | 入力/結果が左右2カラムに切替 |

- viewport meta タグ設定 ✅
- 横スクロール発生しない設計 ✅
- タッチターゲット最低40pxを満たす ✅

---

## クロスブラウザ（コードレベル）

| ブラウザ | 想定動作 |
|---------|---------|
| Chrome 最新 | 全機能正常動作の想定 |
| Safari 最新 | `-webkit-backdrop-filter` prefix 付与済み |
| Firefox 最新 | `backdrop-filter` 部分のみ視覚差あり（実用上問題なし） |
| iOS Safari | Clipboard API は user activation 内で動作するため OK |
| Android Chrome | 全機能正常動作の想定 |

---

## コンソールエラー想定

- 初期ロード時：エラー無し想定
- 診断/ビルド操作：エラー無し想定
- `localStorage` 不可環境：try/catch で握る

---

## えぬへの実機確認依頼項目

GitHub Pages 公開後、以下を実機で確認してください：

- [ ] PCブラウザ（Chrome）で全機能動作
- [ ] PCブラウザ（Safari/Firefox）で見た目崩れなし
- [ ] スマホ実機で全機能動作・タッチで操作可能
- [ ] 診断モードで悪い例ボタン → スコア表示
- [ ] 診断モードで良い例ボタン → スコア表示
- [ ] 「構造化する →」ボタン → ビルドモード自動遷移＆ブロック自動補完
- [ ] テンプレート5種全て切替動作
- [ ] XML形式 / プレーン形式の切替
- [ ] コピー → 別の場所にペーストできる
- [ ] ページリロード後に直近の入力が復元される

---

## 総合判定

**リリース可能（コードレベル）**

実機確認はえぬの GitHub Pages 公開後に最終確認を行う。
コードレベルで問題は検出されなかった。

---

*QA 浜田 千春 / 次工程：README.md・LICENSE作成（PM 神田 結月）*
