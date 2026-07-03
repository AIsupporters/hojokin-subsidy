// 公開Web一覧フロント（静的・ページ内JS）。subsidies.json を読み、「相性の視点」を切り替えて表示。
// ★視点モデル: 既定=未設定（相性を出さない＝固定の誤解を避ける）／"jisha"=AIサポーターズ自社（既存のエンジン採点S/A/B/Cを相性として使用）／業種=相性v2判定のS/A/B/C（負のゲート→加点→絶対閾値・💰0円）。
// バッジも本文の相性テキストも視点に追従。視点はlocalStorageに登録（記憶）。データ値は素通し（捏造なし）。
"use strict";

const RANK_LIST = ["S", "A", "B", "C"];
const REL_LIST = ["S", "A", "B", "C"]; // 相性もSABC（Sほど重要）
const PAGE = 40;
// 業種一覧（登録フォーム register.js と同じ30分類）
const INDUSTRIES_30 = ["建設・工事業", "製造業", "卸売業", "小売業", "飲食業", "宿泊・観光業", "運送・物流業", "IT・システム開発", "Web制作・デザイン", "広告・マーケティング", "通信業", "不動産業", "建物管理・清掃業", "金融業", "保険業", "医療業", "介護・福祉業", "教育・研修業", "士業", "コンサルティング業", "人材サービス業", "美容・健康業", "自動車関連業", "農業・林業", "水産・漁業", "エネルギー・環境業", "娯楽・イベント業", "冠婚葬祭・生活サービス業", "貿易・輸出入業", "その他サービス業"];
// ===== 相性判定v2（2026-07 3専門家レビューで再設計） =====
// 設計: ①負のゲート（対象外の根拠があるものだけC）→②加点（業種名指し/テーマ/規模）→③絶対閾値 S≥5/A≥3/B=それ以外。
// 根拠はすべてアイテムのテキスト由来（捏造なし）。reasonの運営自社視点の判定文は除去してから使う。

// ASCII語の境界付きマッチ（"AI"が機関名等に部分一致する誤ヒット対策・lookbehind不使用で旧Safariも安全）
const RB = (w) => new RegExp("(?:^|[^A-Za-z0-9])" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?![A-Za-z0-9])");
// reason から運営（AIサポーターズ）視点の判定文を除去し、「何が対象か」の説明だけ残す
const SELF_MARK = /当社|自社|AIコンサル|非該当|対象外|非直結|無関係|関心|該当(?:性)?(?:は)?(?:低|薄|し(?:ない|にくい)|可)/;
function cleanReason(r) {
  return String(r || "").split("。").map((s) => {
    const m = s.search(SELF_MARK);
    if (m === 0) return "";
    if (m > 0) s = s.slice(0, m).replace(/(?:で|には|に|は|が|と|だが|ため)$/, "");
    return s;
  }).filter(Boolean).join("。");
}
// 負のゲート（＝Cの根拠。実データ651件の言い回しから抽出）
const JUNK_RE = /会計年度任用職員|職員.{0,12}募集|アルバイト/;                              // 求人
const NONPROG_NAME_RE = /受賞|表彰|採択(?:者|結果)|募集結果|入札|委託事業者|積算基準/;         // 制度でない情報
const NOTGRANT_REASON_RE = /補助金?では?な/;                                                // 検知メモ「補助金でない」
const EVENT_NAME_RE = /見学会|セミナー|講座|説明会|シンポジウム|フォーラム|交流会|相談会|プレゼンテーション/;
const GRANT_NAME_RE = /補助金|助成金|補助し|支援金|給付金/;
const PUBLIC_RE = /地方公共団体|地方自治体|官公庁|市町村(?:等)?(?:向け|が対象|を対象|に限|のみ)/;
const PERSON_RE = /(?:個人|市民|住民|世帯)向け|住宅(?:向け|等に対して)|奨学金|NPO向け|市民公益活動|ボランティア団体/;
const GROUP_ONLY_RE = /(?:事業協同組合|商工組合|振興組合|協議会)(?:等)?(?:向け|限定|が対象|を対象)|組合限定|団体向け|民間連携体向け/;
// 包含シグナル
const SME_RE = /中小企業|小規模|個人事業主/;      // 民間中小向けの明示（+1）
const STARTUP_RE = /創業|起業|開業|スタートアップ/; // 創業者向け（B床のみ）
const SMALL_RE = /小規模|持続化/;                  // 小規模事業者向け（規模1〜20人のとき+1）

// 業種辞書v2: t=対象業種の「名指し」（強・他業種の排他判定にも使用）/ a=関連語（弱・正のみ）
const INDUSTRY_MAP = {
  "建設・工事業": { t: [/建設業/, /工務店/, /建設事業者/, /施工業者/, /工事業/, /建設キャリアアップ/, /建設分野/, /建設現場/], a: [/建築物/, /土木/, /リフォーム/, /住宅/] },
  "製造業": { t: [/製造業/, /町工場/, /(?:食品|金属|化学|機械|部品)(?:製造|加工)/], a: [/ものづくり/, /工場/, /生産設備/, /試作/, /加工/] },
  "卸売業": { t: [/卸売業/, /卸売事業者/], a: [/商社/, /流通/] },
  "小売業": { t: [/小売業?/, /商店街/, /新規出店/, /揮発油/], a: [/店舗/, RB("EC"), /通販/] },
  "飲食業": { t: [/飲食/, /レストラン/, /食堂/, /カフェ/, /居酒屋/, /新規出店/, /生活衛生/], a: [/店舗/, /メニュー/, /食品/] },
  "宿泊・観光業": { t: [/宿泊/, /ホテル/, /旅館/, /観光/, /インバウンド/, /生活衛生/], a: [/旅行/] },
  "運送・物流業": { t: [/運送/, /運輸/, /物流/, /貨物/, /トラック/, /倉庫業/, /タクシー/, /バス事業/], a: [/配送/, /ドライバー/] },
  "IT・システム開発": { t: [/情報通信業/, /情報サービス業/, /(?:ソフトウェア|システム|アプリ)開発/], a: [RB("AI"), RB("IT"), RB("DX"), /デジタル/, /ソフトウェア/, RB("SaaS"), RB("IoT")] },
  "Web制作・デザイン": { t: [/デザイン業/, /クリエイティブ産業/, /映像制作/, /コンテンツ制作/], a: [/デザイン/, /動画/, /コンテンツ/, RB("Web")] },
  "広告・マーケティング": { t: [/広告業/, /広告代理/], a: [/広告/, /プロモーション/, RB("SNS"), /マーケティング/] },
  "通信業": { t: [/電気通信事業/, /通信業/], a: [/ネットワーク/, RB("5G")] },
  "不動産業": { t: [/不動産業/, /宅地建物/, /賃貸住宅事業/, /住宅事業者/], a: [/不動産/, /空き家/] },
  "建物管理・清掃業": { t: [/ビルメンテナンス/, /清掃業/, /警備業/, /生活衛生/], a: [/清掃/, /設備管理/] },
  "金融業": { t: [/金融業/, /銀行業/, /貸金業/], a: [/ファンド/, /リース/] },
  "保険業": { t: [/保険業/, /保険代理/], a: [] },
  "医療業": { t: [/医療機関/, /病院/, /診療所/, /クリニック/, /歯科/, /薬局/, /医療法人/], a: [/医療/, /看護/] },
  "介護・福祉業": { t: [/介護事業/, /介護施設/, /障害福祉サービス/, /福祉施設/, /社会福祉法人/, /保育(?:所|園|士|事業)/, /介護サービス/], a: [/介護/, /福祉/] },
  "教育・研修業": { t: [/学校法人/, /専修学校/, /学習塾/, /教育機関/], a: [/教育/, /研修事業/, /eラーニング/] },
  "士業": { t: [/士業/, /(?:税理士|行政書士|司法書士|社会保険労務士|社労士|弁護士|公認会計士|中小企業診断士)(?:事務所|法人)/], a: [/税理士|行政書士|司法書士|社会保険労務士|社労士|弁護士|公認会計士/] },
  "コンサルティング業": { t: [/コンサルティング業/], a: [/コンサル/, /専門家派遣/, /伴走支援/] },
  "人材サービス業": { t: [/人材派遣|職業紹介|人材紹介/], a: [/人材サービス/] },
  "美容・健康業": { t: [/美容(?:院|室|業|所)/, /理美容/, /理容/, /エステ/, /生活衛生/], a: [/美容/, /フィットネス/] },
  "自動車関連業": { t: [/自動車(?:整備|販売|部品)/, /整備工場/, /鈑金/, /揮発油/], a: [/自動車/] },
  "農業・林業": { t: [/農業者/, /農業法人/, /認定農業者/, /農林漁業/, /営農/, /農地/, /畜産/, /酪農/, /林業/, /森林組合/, /農山漁村/, /(?:6|六)次産業/], a: [/農業/, /農産物/, /園芸/, /スマート農業/] },
  "水産・漁業": { t: [/漁業/, /水産/, /養殖/, /漁協/, /漁村/], a: [/水産物/] },
  "エネルギー・環境業": { t: [/エネルギー事業/, /電気事業者/, /ガス事業者/, /発電事業/, /廃棄物処理業/, /リサイクル業/, /資源循環事業/], a: [/再エネ/, /再生可能エネルギー/, /太陽光/, /蓄電/, /リサイクル/] },
  "娯楽・イベント業": { t: [/興行/, /エンターテインメント/, /イベント事業者/, /スポーツ(?:施設|団体|事業)/], a: [/イベント/, /文化芸術/, /エンタメ/, /ゲーム/] },
  "冠婚葬祭・生活サービス業": { t: [/冠婚葬祭/, /ブライダル/, /葬祭/, /クリーニング業/, /生活衛生/], a: [/ペット/, /写真館/] },
  "貿易・輸出入業": { t: [/輸出(?:事業者|企業|業)/, /貿易/, /商社/], a: [/輸出/, /越境/, /海外/] },
  "その他サービス業": { t: [/サービス業/], a: [] },
};
// 「今後の予定」→パターン（登録フォームの選択肢と同キー）。URLの plans= で渡る。
const PLAN_MAP = {
  "新しい設備を購入予定": [/設備/, /機械装置/, /省力化/, /設備投資/],
  "車両購入予定": [/車両/, RB("EV"), /電気自動車/, /トラック/, /フォークリフト/],
  "店舗改装": [/店舗/, /改装/, /内装/, /リニューアル/],
  "工場新設": [/工場/, /新増設/, /生産拠点/, /立地/],
  "IT導入": [RB("IT"), /ITツール/, /デジタル/, /システム/, RB("DX")],
  "AI導入": [RB("AI"), /人工知能/],
  "ECサイト": [RB("EC"), /ネットショップ/, /オンライン販売/, /通販/],
  "ホームページ制作": [/ホームページ/, /ウェブサイト/, RB("Web")],
  "DX化": [RB("DX"), /デジタル/],
  "人材採用": [/採用/, /雇用/, /雇入れ/, /人材確保/, /求人/],
  "人材育成": [/育成/, /研修/, /人材開発/, /能力開発/, /リスキリング/, /スキルアップ/],
  "海外展開": [/海外/, /輸出/, /越境/, /グローバル/],
  "新商品開発": [/新商品/, /商品開発/, /製品開発/, /研究開発/, /試作/, /新製品/],
  "新サービス開発": [/新サービス/, /新事業/, /新分野/, /事業再構築/, /第二創業/],
  "脱炭素": [/脱炭素/, /カーボンニュートラル/, /CO2|CO₂/, RB("GX"), /再エネ/, /再生可能エネルギー/],
  "省エネ設備": [/省エネ/, /高効率/, /エネルギー使用合理化/],
  "事業承継": [/事業承継/, /承継/, /後継者/],
  "M&A": [/M&A|Ｍ＆Ａ/, /買収/, /譲渡/, /経営資源引継ぎ/],
};
// 「改善したいこと」→パターン
const IMPROVE_MAP = {
  "売上を伸ばしたい": [/販路/, /売上/, /集客/, /販売促進/, /需要開拓/, /持続化/],
  "人手不足": [/省力化/, /人手不足/, /自動化/, /人材確保/, /労働生産性/],
  "採用": [/採用/, /雇用/, /雇入れ/, /求人/, /人材確保/],
  "資金繰り": [/融資/, /資金繰り/, /運転資金/, /利子補給/, /信用保証/, /借換/],
  "広告": [/広告/, /販促/, /プロモーション/, RB("PR")],
  "SNS": [RB("SNS"), /情報発信/],
  "AI活用": [RB("AI"), /人工知能/],
  "業務効率化": [/効率化/, /省力化/, /生産性/, /業務改善/],
  "システム化": [/システム/, RB("IT"), /デジタル/],
  "コスト削減": [/省エネ/, /コスト削減/, /経費削減/],
};
// テーマの隣接語（弱ヒット+1のみ）
const THEME_WEAK = { "店舗改装": [/改修/] };
// 「希望する支援」→パターン（補助金/助成金は全件対象＝null。融資等は該当タイプの制度を持ち上げ＋「補助金でない」ゲートから救済）
const SUPPORT_MAP = {
  "補助金": null, "助成金": null,
  "融資": [/融資/, /利子補給/, /信用保証/, /貸付/, /保証制度/, /貸与/, /資金繰り/],
  "税金相談": [/税制/, /税額控除/, /固定資産税/],
  "節税": [/税額控除/, /優遇税制/, /減税/],
  "M&A": [/M&A|Ｍ＆Ａ/, /事業承継/, /承継/, /譲渡/],
  "保険": [/共済/, /保険料/],
  "不動産": [/不動産/, /空き家/],
  "DX支援": [RB("DX"), /デジタル/],
  "AI導入": [RB("AI")],
};
const anyHit = (text, pats) => pats.some((p) => p.test(text));
let PLANS = [];      // 今後の予定（URL plans=）
let IMPROVES = [];   // 改善したいこと（URL improve=）
let SUPPORTS = [];   // 希望する支援（URL support=）
let SIZE = "";       // 規模ID（URL size=）
let MODE = "simple"; // "detail"=詳細検索 / "simple"=簡易検索
let ORIG = null;     // 登録内容スナップショット（「絞り込み状態を初期化」で復元）
let EDIT_TOKEN = ""; // 登録編集トークン（URL edit=）＝サーバー保存の本人確認にも使う
let KUNI = false;    // 国（全国）の制度を表示（URL kuni=1）※都道府県とは独立して選べる
let PREF = "";       // 都道府県（URL pref=／旧 region=・category=）※normPref済みで保持
let CITY = "";       // 市区町村（URL city=・都道府県の下位）
let PERSP = "";      // 業種（URL v=／旧 ind=）＝相性判定の視点
let QUERY = "";      // キーワード（簡易のみ・URL q=）
let SORT = "deadline";
let REGION_CITIES = { "大阪府": [], "京都府": [], "兵庫県": [] }; // 補助金データに実在する市区町村（検索用・init時に生成）
const SAVE_ENDPOINT = "https://hojokin-line-webhook.ai-supporters.workers.dev/save-view";

// 都道府県の表記ゆれを正規化（旧値 大阪/京都/兵庫・全国 → 大阪府/京都府/兵庫県・国）。その他は絞り込みなし扱い。
function normPref(v) {
  v = String(v || "").trim();
  if (!v) return "";
  if (v === "国" || v === "全国") return "国"; // 旧UI互換（国は今はKUNIチェックへ移行）
  if (v.startsWith("大阪")) return "大阪府";
  if (v.startsWith("京都")) return "京都府";
  if (v.startsWith("兵庫")) return "兵庫県";
  return ""; // その他・未対応都道府県 → すべて表示
}
// 補助金1件が現在の地域絞り込み（国チェック＋都道府県＋市区町村）に合致するか（region文字列を階層判定・捏造なし）
function regionMatch(it) {
  if (!KUNI && !PREF) return true; // 地域指定なし＝全件
  const parts = String(it.region || "").split(/\s*\/\s*/).map((x) => x.trim()).filter(Boolean);
  const isNational = parts.some((x) => x === "国" || x.startsWith("全国"));
  if (KUNI && isNational) return true;
  if (PREF && PREF !== "国") {
    if (CITY) return parts.some((x) => x === PREF + CITY || x.startsWith(PREF + CITY));
    return parts.some((x) => x.startsWith(PREF));
  }
  return false;
}
// 検索用の市区町村リストを補助金データから生成（結果が必ず存在する市区町村だけ）
function deriveRegionCities() {
  const m = { "大阪府": new Set(), "京都府": new Set(), "兵庫県": new Set() };
  for (const it of DATA.items) {
    const parts = String(it.region || "").split(/\s*\/\s*/).map((x) => x.trim());
    for (const part of parts) for (const pref of ["大阪府", "京都府", "兵庫県"]) {
      if (part.startsWith(pref)) { const c = part.slice(pref.length).trim(); if (c) m[pref].add(c); }
    }
  }
  REGION_CITIES = { "大阪府": [...m["大阪府"]].sort(), "京都府": [...m["京都府"]].sort(), "兵庫県": [...m["兵庫県"]].sort() };
}
// 市区町村セレクトを、都道府県に応じて詰め替える（カスケード）。sは "s"(簡易)/"d"(詳細)。
function fillCity(sel, prefRaw) {
  if (!sel) return;
  const pref = normPref(prefRaw);
  const cur = sel.value;
  const cities = (pref && pref !== "国" && REGION_CITIES[pref]) ? REGION_CITIES[pref] : [];
  sel.innerHTML = `<option value="">市区町村: すべて</option>` + cities.map((c) => `<option value="${attr(c)}">${esc(c)}</option>`).join("");
  sel.disabled = cities.length === 0;
  sel.value = [...sel.options].some((o) => o.value === cur) ? cur : "";
}
// unicode安全なbase64（初期化用の登録内容ブロブ o= のデコード）
function decodeBlob(s) { try { return JSON.parse(decodeURIComponent(escape(atob(String(s || ""))))); } catch { return null; } }

const els = {};
let DATA = { items: [], total: 0 };
let LASTSEEN = null;
let showRest = false;   // C / 対象外 を表示するか
let page = PAGE;        // 未設定（フラット）時のページング
let searchTimer = null;

const $ = (id) => document.getElementById(id);
const isISO = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || "").trim());
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function attr(s) { return esc(s).replace(/'/g, "&#39;"); }
function present(v) { const s = String(v == null ? "" : v).trim(); return s !== "" && s !== "0"; }
function safeUrl(u) { try { const x = new URL(String(u || ""), location.href); return (x.protocol === "http:" || x.protocol === "https:") ? x.href : ""; } catch { return ""; } }
function todayStr() { const j = new Date(Date.now() + 9 * 3600 * 1000); return j.toISOString().slice(0, 10); }

// ---- 相性v2（視点に応じて算出。reasonsは根拠の開示用＝すべてテキスト由来） ----
function relevanceFor(it, persp) {
  if (persp === "jisha") return { kind: "jisha", level: it.rank };
  const detail = MODE === "detail";
  const hasInd = !!INDUSTRY_MAP[persp];
  const plans = detail ? PLANS : [], improves = detail ? IMPROVES : [], supports = detail ? SUPPORTS : [];
  const hasTheme = plans.length || improves.length || supports.length;
  const small = detail && (SIZE === "s1_5" || SIZE === "s6_20");
  if (!hasInd && !hasTheme && !small) return null; // 条件なし＝未設定（相性を出さない）

  const name = String(it.name || "");
  const req = String(it.requirements || "").trim().replace(/^-.*$/, "");
  const rTgt = cleanReason(it.reason);        // reasonから運営自社視点の判定文を除去
  const strong = name + " " + rTgt;           // 強シグナル判定用（名称＋対象説明）
  const text = strong + " " + req;
  const C = (reason) => ({ kind: "industry", level: "C", pts: 0, reasons: [reason], gated: true });

  // 0) 補助金でない情報（求人・表彰・告知等）→ C。ただし希望支援タイプ（融資等）に合致すれば救済して通常採点
  if (JUNK_RE.test(text)) return C("求人・お知らせ情報のため対象外の可能性が高い");
  if (NONPROG_NAME_RE.test(name) && !GRANT_NAME_RE.test(name)) return C("表彰・採択結果などのお知らせ情報");
  const supportRescue = supports.some((k) => SUPPORT_MAP[k] && anyHit(text, SUPPORT_MAP[k]));
  if (!supportRescue) {
    if (NOTGRANT_REASON_RE.test(String(it.reason || ""))) return C("補助金・助成金ではない情報");
    if (EVENT_NAME_RE.test(name) && !GRANT_NAME_RE.test(name)) return C("セミナー・見学会などの告知");
  }
  // 1) 対象者の排他（自治体・個人・組合向け）。中小企業等の明示があれば併存とみなし残す
  const sme = SME_RE.test(text);
  if (PUBLIC_RE.test(text) && !sme) return C("対象が自治体・公的機関に限られる可能性");
  if (PERSON_RE.test(text) && !sme) return C("個人・住民向けの情報の可能性");
  if (GROUP_ONLY_RE.test(text) && !sme) return C("対象が組合・団体に限られる可能性");

  let pts = 0; const reasons = []; let capB = false;
  let matched = [], themeMatched = [];
  // 2) 業種軸: 名指し（名称=4/説明=3）・関連語（=1）・他業種の名指し（排他）
  if (hasInd) {
    const d = INDUSTRY_MAP[persp];
    const tName = anyHit(name, d.t), tText = anyHit(rTgt + " " + req, d.t), aAny = d.a.length && anyHit(text, d.a);
    let indPts = tName ? 4 : tText ? 3 : aAny ? 1 : 0;
    let foreign = "";
    for (const o in INDUSTRY_MAP) { if (o !== persp && anyHit(strong, INDUSTRY_MAP[o].t)) { foreign = o; break; } }
    if (indPts === 0 && foreign) return C(`説明文は「${foreign}」向けとみられます`);
    if (indPts === 1 && foreign) capB = true;
    if (indPts >= 3) { reasons.push(tName ? "制度名が御社の業種と重なります" : "対象の説明が御社の業種と重なります"); matched = ["業種名指し"]; }
    else if (indPts === 1) { reasons.push("御社の業種に関連する言葉があります"); matched = ["関連語"]; }
    pts += indPts;
  }
  // 3) テーマ軸: 選択テーマごとに名称=3/本文=1/隣接=1（テーマ計は上限4）。補助金・助成金(null)は全件対象
  if (hasTheme) {
    let themePts = 0;
    const themes = plans.map((k) => [k, PLAN_MAP[k]]).concat(improves.map((k) => [k, IMPROVE_MAP[k]])).concat(supports.map((k) => [k, SUPPORT_MAP[k]]));
    for (const [label, pats] of themes) {
      if (!pats) continue;
      if (anyHit(name, pats)) { themePts += 3; themeMatched.push(label); }
      else if (anyHit(rTgt + " " + req, pats)) { themePts += 1; themeMatched.push(label); }
      else if (THEME_WEAK[label] && anyHit(text, THEME_WEAK[label])) { themePts += 1; themeMatched.push(label); }
    }
    pts += Math.min(themePts, 4);
    if (themeMatched.length) reasons.push("ご要望に合致：" + themeMatched.join("・"));
  }
  // 4) 規模・中小向け明示・創業（創業は加点せずB床のみ＝創業/既存が登録情報にないため）
  const smallHit = small && SMALL_RE.test(text);
  if (smallHit) { pts += 1; reasons.push("小規模事業者向けの記載あり"); }
  if (sme) { pts += 1; reasons.push("中小企業向けと明示"); }
  if (pts === 0 && STARTUP_RE.test(text)) { pts = 1; reasons.push("創業者向け（参考）"); }
  // 5) 絶対閾値。シグナルなしはC でなく B（＝業種不問の一般制度の可能性。対象外の根拠があるものだけC）
  let level = pts >= 5 ? "S" : pts >= 3 ? "A" : "B";
  if (capB && level !== "B") { level = "B"; reasons.push("※主対象は他業種の可能性"); }
  if (pts === 0) reasons.push("業種の限定は読み取れませんでした（業種を問わない一般制度の可能性）");
  return { kind: "industry", level, pts, reasons, matched, themeMatched, smallHit };
}
function groupsFor(persp) {
  if (persp === "jisha") return RANK_LIST;
  const detail = MODE === "detail";
  if (INDUSTRY_MAP[persp] || (detail && (PLANS.length || IMPROVES.length || SUPPORTS.length || SIZE === "s1_5" || SIZE === "s6_20"))) return REL_LIST;
  return null;
}
function restGroup(persp) { return "C"; } // C（相性が薄い）を折りたたみ対象に

// ---- 締切（残り日数・値は素通し） ----
function deadlineInfo(it) {
  const d = String(it.deadline || "").trim();
  if (!isISO(d)) return { cls: "none", text: "締切未定" };
  const days = Math.round((Date.parse(d + "T00:00:00Z") - Date.parse(todayStr() + "T00:00:00Z")) / 86400000);
  const md = d.slice(5).replace("-", "/");
  const cls = days <= 7 ? "urgent" : days <= 30 ? "soon" : "";
  const rel = days < 0 ? "締切超過" : days === 0 ? "本日締切" : `あと${days}日`;
  return { cls, text: `締切 ${md}・${rel}` };
}
function regionDisplay(region) {
  const r = String(region || "");
  const parts = r.split(/[\/、,]/).map((s) => s.trim()).filter(Boolean);
  if (r.includes("全国") || parts.length >= 40) return { label: "全国", full: r };
  if (parts.length > 3) return { label: `${parts.slice(0, 2).join("・")}ほか${parts.length - 2}地域`, full: r };
  return { label: r || "—", full: r };
}
function isRecent(it) {
  if (LASTSEEN) return isISO(it.detectedDate) && it.detectedDate > LASTSEEN;
  return it.detectedDate === DATA.lastUpdated;
}

// ---- 状態 ----
function savedView() { try { return JSON.parse(localStorage.getItem("sw-view") || "{}"); } catch { return {}; } }
function savedOrig() { try { return JSON.parse(localStorage.getItem("sw-orig") || "null"); } catch { return null; } }
const arrCsv = (str, map) => String(str || "").split(",").map((s) => s.trim()).filter((s) => s in map); // nullも有効キー（補助金/助成金=全件対象）

// URLパラメータ(URLSearchParams) or 保存オブジェクト から業種/地域/規模/テーマ等のグローバル状態を設定。
function applyFrom(src) {
  const g = (k) => (src.get ? (src.has(k) ? src.get(k) : "") : (src[k] != null ? src[k] : ""));
  let persp = g("v") || g("ind"); // 旧ind互換
  if (persp && persp !== "jisha" && !INDUSTRY_MAP[persp]) persp = "";
  PERSP = persp;
  PREF = normPref(g("pref") || g("region") || g("category")); // 旧region/category互換
  CITY = g("city") || "";
  KUNI = String(g("kuni")) === "1" || String(g("kuni")) === "true";
  SIZE = g("size") || "";
  PLANS = arrCsv(g("plans"), PLAN_MAP);
  IMPROVES = arrCsv(g("improve"), IMPROVE_MAP);
  SUPPORTS = arrCsv(g("support"), SUPPORT_MAP);
  QUERY = g("q") || "";
  const m = g("mode"); if (m === "detail" || m === "simple") MODE = m;
  const sort = g("sort"); if (sort) SORT = sort;
}

function readState() {
  const p = new URLSearchParams(location.search);
  const lineOpen = p.has("ind") || p.has("v") || p.has("edit"); // 公式LINE由来のパーソナライズURL
  if (p.has("edit")) EDIT_TOKEN = p.get("edit");
  const hasParams = ["v", "ind", "pref", "region", "category", "city", "kuni", "size", "plans", "improve", "support", "q", "mode"].some((k) => p.has(k));

  // 初期化用の登録内容スナップショット原本: o=blob（保存ビューで開いた場合）→ URLパラメータ自体 → localStorage
  let origRaw = null;
  if (p.has("o")) origRaw = decodeBlob(p.get("o"));
  else if (lineOpen) origRaw = { v: p.get("v") || p.get("ind") || "", pref: p.get("pref") || p.get("region") || "", city: p.get("city") || "", kuni: p.get("kuni") || "", size: p.get("size") || "", plans: p.get("plans") || "", improve: p.get("improve") || "", support: p.get("support") || "" };

  if (hasParams) {
    MODE = lineOpen ? "detail" : "simple"; // 既定。mode= があれば applyFrom が上書き
    applyFrom(p);
  } else {
    const ls = savedView();
    if (ls && Object.keys(ls).length) applyFrom(ls); // パラメータ無し（直接アクセス）は保存ビューを復元
  }

  if (origRaw) {
    ORIG = { persp: (origRaw.v && INDUSTRY_MAP[origRaw.v]) ? origRaw.v : "", pref: normPref(origRaw.pref), city: origRaw.city || "", kuni: String(origRaw.kuni) === "1" || String(origRaw.kuni) === "true", size: origRaw.size || "", plans: arrCsv(origRaw.plans, PLAN_MAP), improves: arrCsv(origRaw.improve, IMPROVE_MAP), supports: arrCsv(origRaw.support, SUPPORT_MAP) };
    try { localStorage.setItem("sw-orig", JSON.stringify(ORIG)); } catch {}
  } else { ORIG = savedOrig(); }
}
// 現在の絞り込みをURLパラメータ相当のオブジェクトに（保存・共有用。文字列ベースでapplyFromと相互運用）。
function currentView() {
  return { v: PERSP, pref: PREF, city: CITY, kuni: KUNI ? "1" : "", size: SIZE, plans: PLANS.join(","), improve: IMPROVES.join(","), support: SUPPORTS.join(","), mode: MODE, q: QUERY, sort: SORT };
}
// グローバル状態を両パネルのコントロールへ反映
function syncControls() {
  if (els.q) els.q.value = QUERY;
  ["s", "d"].forEach((pfx) => {
    const kuni = $(pfx + "-kuni"); if (kuni) kuni.checked = KUNI;
    const pref = $(pfx + "-pref"); if (pref) pref.value = PREF;
    const city = $(pfx + "-city"); if (city) { fillCity(city, PREF); city.value = CITY; }
    const ind = $(pfx + "-industry"); if (ind) ind.value = PERSP;
  });
  const size = $("d-size"); if (size) size.value = SIZE;
  const sort = $("sort"); if (sort) sort.value = SORT;
}
function saveView() {
  const v = currentView();
  try { localStorage.setItem("sw-view", JSON.stringify(v)); } catch {}
  // サーバー保存（LINEの「補助金の一覧」に反映）。編集トークンで本人確認。無ければローカルのみ。
  if (EDIT_TOKEN) fetch(SAVE_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t: EDIT_TOKEN, view: v }) }).catch(() => {});
}
function syncUrl() {
  const p = new URLSearchParams();
  if (MODE === "detail") p.set("mode", "detail");
  if (QUERY && MODE === "simple") p.set("q", QUERY);
  if (KUNI) p.set("kuni", "1");
  if (PREF) p.set("pref", PREF);
  if (CITY) p.set("city", CITY);
  if (PERSP) p.set("v", PERSP);
  if (SIZE) p.set("size", SIZE);
  if (PLANS.length) p.set("plans", PLANS.join(","));
  if (IMPROVES.length) p.set("improve", IMPROVES.join(","));
  if (SUPPORTS.length) p.set("support", SUPPORTS.join(","));
  if (SORT && SORT !== "deadline") p.set("sort", SORT);
  const qs = p.toString();
  history.replaceState(null, "", qs ? "?" + qs : location.pathname);
}

function baseFilter() {
  const words = (MODE === "simple" ? QUERY : "").toLowerCase().split(/\s+/).filter(Boolean);
  return DATA.items.filter((it) => {
    if (!regionMatch(it)) return false;
    if (words.length) {
      const hay = (it.name + " " + it.organization + " " + it.region + " " + it.reason).toLowerCase();
      if (!words.every((w) => hay.includes(w))) return false;
    }
    return true;
  });
}
function sortWithin(arr, sort) {
  const far = "9999-12-31";
  return arr.slice().sort((a, b) => {
    if (sort === "new") return String(b.detectedDate).localeCompare(String(a.detectedDate));
    const da = isISO(a.deadline) ? a.deadline : far, db = isISO(b.deadline) ? b.deadline : far;
    return da.localeCompare(db);
  });
}

// ---- カード ----
function moneyBlock(it) {
  const t = present(it.maxLimit) ? `上限 ${esc(it.maxLimit)}${present(it.rate) ? "／補助率 " + esc(it.rate) : ""}` : present(it.rate) ? `補助率 ${esc(it.rate)}` : "";
  if (!t) return "";
  const full = present(it.maxLimit) ? "上限 " + it.maxLimit + (present(it.rate) ? " ／補助率 " + it.rate : "") : "補助率 " + it.rate;
  return `<div><span class="k">補助</span><span class="v clamp" title="${attr(full)}">${t}</span></div>`;
}
function relLine(it, persp, rel) {
  if (!rel) return "";
  if (rel.kind === "jisha") return it.reason ? `<p class="reason">${esc(it.reason)}</p>` : "";
  // v2: 判定根拠（reasons）をそのまま開示。誤ヒット時も利用者が一目で棄却できるようにする
  const bits = (rel.reasons || []).map(esc);
  const cls = (rel.level === "S" || rel.level === "A") ? "high" : rel.level === "B" ? "mid" : "low";
  const label = persp && INDUSTRY_MAP[persp] ? `「${esc(persp)}」との相性` : "あなたの登録内容との相性";
  return `<p class="reason rel-${cls}">${label}：<b>${esc(rel.level)}</b> ／ ${bits.join(" ／ ") || "判定材料なし"}<span class="rel-note">（文面からの目安）</span></p>`;
}
function badge(persp, rel) {
  if (!rel) return `<span class="badge none" aria-hidden="true">·</span>`;
  return `<span class="badge ${esc(rel.level)}" aria-label="相性${esc(rel.level)}">${esc(rel.level)}</span>`;
}
function card(it, persp, rel) {
  const dl = deadlineInfo(it);
  const reg = regionDisplay(it.region);
  const url = safeUrl(it.url);
  const catCls = it.category === "国" ? "kuni" : it.category === "大阪" ? "osaka" : it.category === "京都" ? "kyoto" : it.category === "兵庫" ? "hyogo" : "";
  return `<li class="card${rel && rel.kind === "jisha" ? " rank-" + esc(rel.level) : ""}">
    <div class="card-top">
      ${badge(persp, rel)}
      <h3>${esc(it.name)}</h3>
    </div>
    <div class="card-sub">
      <span class="deadline ${dl.cls}">${esc(dl.text)}</span>
      <span class="tag ${catCls}">${esc(it.category)}</span>
      ${isRecent(it) ? '<span class="tag new">新着</span>' : ""}
      ${it.verified ? '<span class="tag verified">公式確認済</span>' : ""}
    </div>
    ${relLine(it, persp, rel)}
    <div class="facts">
      ${moneyBlock(it)}
      ${present(it.organization) ? `<div><span class="k">実施機関</span><span class="v clamp" title="${attr(it.organization)}">${esc(it.organization)}</span></div>` : ""}
      <div><span class="k">地域</span><span class="v" title="${attr(reg.full)}">${esc(reg.label)}</span></div>
    </div>
    ${url ? `<a class="src" href="${attr(url)}" target="_blank" rel="noopener noreferrer">公式ページで確認 →<span class="visually-hidden">（新しいタブで開く）</span></a>` : ""}
  </li>`;
}

const GROUP_LABEL = { S: "相性S｜業種・ご要望に合致（最有力）", A: "相性A｜有力候補（一部が合致）", B: "相性B｜業種を問わない一般制度の可能性", C: "相性C｜対象が異なる可能性（参考）" };
const GROUP_NOTE = {
  S: "タイトルや説明文に、御社の業種やご要望と重なる言葉が入っている制度です。",
  A: "業種またはご要望のどちらかが部分的に重なる制度です。",
  B: "文面から業種の限定が読み取れなかった制度です。「対象外」という意味ではありません。中小企業なら申請できる一般制度が多く含まれます。",
  C: "説明文に他の業種や特定の対象（自治体など）向けの記載がある制度です。念のため残しています。",
};

const SIZE_LABELS = { s1_5: "1〜5人", s6_20: "6〜20人", s21_50: "21〜50人", s51_100: "51〜100人", s101: "101人以上" };

function renderBanner() {
  const b = els.banner;
  if (MODE === "detail") { b.innerHTML = ""; b.style.display = "none"; return; } // 詳細はパネル内で説明済み
  b.style.display = "";
  if (!PERSP && !PREF && !CITY && !KUNI) { b.className = "persp-banner unset"; b.innerHTML = `🔎 <b>簡易検索</b>：上の「業種」「地域」を選ぶと絞り込めます。<span class="rel-note">（公式LINE「補助金の一覧」からは登録内容で自動絞り込み）</span>`; return; }
  const parts = []; if (PERSP) parts.push(`業種「${esc(PERSP)}」`);
  const region = []; if (KUNI) region.push("国（全国）"); if (PREF) region.push(esc(PREF) + (CITY ? " " + esc(CITY) : ""));
  if (region.length) parts.push(`地域「${region.join("・")}」`);
  b.className = "persp-banner set"; b.innerHTML = `🔎 <b>簡易検索</b>：${parts.join(" ／ ")}で絞り込み中`;
}

// 詳細検索：現在の絞り込み条件（×で解除）
function renderDetailActive() {
  const box = $("detail-active"); if (!box) return;
  const chips = [];
  if (KUNI) chips.push(["kuni", "国（全国）"]);
  if (PREF) chips.push(["pref", `都道府県：${PREF}`]);
  if (CITY) chips.push(["city", `市区町村：${CITY}`]);
  if (PERSP && INDUSTRY_MAP[PERSP]) chips.push(["persp", `業種：${PERSP}`]);
  if (SIZE && SIZE_LABELS[SIZE]) chips.push(["size", `規模：${SIZE_LABELS[SIZE]}`]);
  PLANS.forEach((p) => chips.push(["plan:" + p, `予定：${p}`]));
  IMPROVES.forEach((m) => chips.push(["improve:" + m, `改善：${m}`]));
  SUPPORTS.forEach((s) => chips.push(["support:" + s, `希望：${s}`]));
  if (!chips.length) { box.innerHTML = `<p class="detail-empty">絞り込み条件がありません。上の項目や下の「追加できる条件」から、自由に条件を足せます。</p>`; return; }
  box.innerHTML = `<span class="pool-label">絞り込み中（クリックで解除）</span>` + chips.map(([k, l]) => `<button class="chip active" data-dk="${attr(k)}">${esc(l)}</button>`).join("");
}
// 詳細検索：追加できるテーマ条件（今後の予定／改善／希望する支援）。クリックで足し引き。
function renderThemePool() {
  const box = $("theme-pool"); if (!box) return;
  const group = (title, map, active, kind) => {
    const chips = Object.keys(map).map((k) => {
      const on = active.indexOf(k) >= 0;
      return `<button class="theme-chip${on ? " on" : ""}" data-tk="${kind}:${attr(k)}">${on ? "✓ " : "＋ "}${esc(k)}</button>`;
    }).join("");
    return `<div class="theme-group"><span class="pool-label">${title}</span><div class="theme-chips">${chips}</div></div>`;
  };
  box.innerHTML = `<span class="pool-title">追加できる条件（クリックで追加／解除）</span>` +
    group("今後の予定", PLAN_MAP, PLANS, "plan") +
    group("改善したいこと", IMPROVE_MAP, IMPROVES, "improve") +
    group("希望する支援", SUPPORT_MAP, SUPPORTS, "support");
}
function toggleTheme(tk) {
  const i = tk.indexOf(":"); const kind = tk.slice(0, i), val = tk.slice(i + 1);
  if (kind === "plan") PLANS = PLANS.indexOf(val) >= 0 ? PLANS.filter((x) => x !== val) : PLANS.concat([val]);
  else if (kind === "improve") IMPROVES = IMPROVES.indexOf(val) >= 0 ? IMPROVES.filter((x) => x !== val) : IMPROVES.concat([val]);
  else if (kind === "support") SUPPORTS = SUPPORTS.indexOf(val) >= 0 ? SUPPORTS.filter((x) => x !== val) : SUPPORTS.concat([val]);
}
function removeDetailCond(k) {
  if (k === "kuni") KUNI = false;
  else if (k === "pref") { PREF = ""; CITY = ""; }
  else if (k === "city") CITY = "";
  else if (k === "persp") PERSP = "";
  else if (k === "size") SIZE = "";
  else if (k.indexOf("plan:") === 0) PLANS = PLANS.filter((x) => x !== k.slice(5));
  else if (k.indexOf("improve:") === 0) IMPROVES = IMPROVES.filter((x) => x !== k.slice(8));
  else if (k.indexOf("support:") === 0) SUPPORTS = SUPPORTS.filter((x) => x !== k.slice(8));
}
function setMode(m) { MODE = m === "detail" ? "detail" : "simple"; onChange(); }

function renderScoreboard(persp, buckets, total) {
  const sb = els.scoreboard;
  if (!groupsFor(persp)) {
    sb.innerHTML = `<div class="score-msg">全 <b>${total}</b> 件 ／ <span class="muted">${MODE === "detail" ? "上の条件で絞り込み" : "業種・地域を選んで相性を見る"}</span></div>`;
    return;
  }
  const groups = groupsFor(persp);
  const cls = (g) => g.toLowerCase();
  const legend = persp === "jisha" ? "" : `<div class="score-legend">S=業種・ご要望に合致 ／ A=一部合致 ／ B=業種を問わない一般制度の可能性 ／ C=対象が異なる可能性<br>※タイトル・説明文の言葉による自動の目安です。対象になるかは必ず公式ページでご確認ください。</div>`;
  sb.innerHTML = groups.map((g) => `<button class="score ${cls(g)}" data-g="${esc(g)}"><span class="dot"></span>${esc(g)} <b>${(buckets[g] || []).length}</b></button>`).join("") + legend;
}

function renderChips() {
  const chips = [];
  if (PERSP) chips.push(["v", `業種：${PERSP === "jisha" ? "自社" : PERSP}`]);
  if (KUNI) chips.push(["kuni", "国（全国）"]);
  if (PREF) chips.push(["pref", `都道府県：${PREF}`]);
  if (CITY) chips.push(["city", `市区町村：${CITY}`]);
  if (QUERY) chips.push(["q", `「${QUERY}」`]);
  els.chips.innerHTML = chips.map(([k, l]) => `<button class="chip" data-k="${k}">${esc(l)}</button>`).join("") + (chips.length ? `<button class="chip clear" data-k="__all">すべて解除</button>` : "");
}

function render() {
  syncUrl();
  syncControls();
  const persp = PERSP, sort = SORT;
  // タブ・パネルの表示切替
  els.tabDetail.setAttribute("aria-selected", MODE === "detail");
  els.tabSimple.setAttribute("aria-selected", MODE === "simple");
  els.panelDetail.hidden = MODE !== "detail";
  els.panelSimple.hidden = MODE !== "simple";
  const isDetail = MODE === "detail";
  if (els.resetDetail) els.resetDetail.hidden = !isDetail;
  if (els.editReg) { els.editReg.hidden = !isDetail; els.editReg.href = EDIT_TOKEN ? ("register.html?t=" + encodeURIComponent(EDIT_TOKEN)) : "register.html"; }
  renderBanner();
  if (isDetail) { renderDetailActive(); renderThemePool(); els.chips.innerHTML = ""; }
  else renderChips();
  const base = baseFilter();
  window.__visible = base;
  els.resultCount.textContent = `${base.length} 件${DATA.total ? ` / 全 ${DATA.total} 件` : ""}`;
  els.empty.hidden = base.length > 0;
  if (!base.length) { els.list.innerHTML = ""; els.empty.textContent = "この条件に合う補助金はありません。条件をゆるめてください。"; renderScoreboard(persp, {}, 0); return; }

  const groups = groupsFor(persp);
  if (!groups) {
    // 未設定: フラット・締切順・ページング・相性なし
    renderScoreboard("", {}, DATA.total);
    const arr = sortWithin(base, sort);
    const shown = arr.slice(0, page);
    els.list.innerHTML = `<ul class="cards">${shown.map((it) => card(it, "", null)).join("")}</ul>` + (arr.length > page ? `<button class="more" id="more-flat">残り ${arr.length - page} 件を表示</button>` : "");
    const m = $("more-flat"); if (m) m.addEventListener("click", () => { page += PAGE; render(); });
    return;
  }
  // 視点あり: 相性でグルーピング
  const buckets = {}; groups.forEach((g) => (buckets[g] = []));
  for (const it of base) { const rel = relevanceFor(it, persp); (buckets[rel.level] || buckets[restGroup(persp)]).push({ it, rel }); }
  renderScoreboard(persp, buckets, base.length);
  const rest = restGroup(persp);
  let html = "";
  // Sが空のとき: 「全滅」に見せない前向きな案内（S恒常ゼロの業種があるため）
  if (persp !== "jisha" && (!buckets.S || !buckets.S.length)) {
    html += `<p class="empty-s-note">本日の時点で、御社の業種名に直撃する制度は見つかりませんでした。補助金の多くは業種を問いません。まず<b>相性A（有力候補）</b>と<b>相性B（一般制度）</b>をご覧ください。</p>`;
  }
  for (const g of groups) {
    let arr = buckets[g]; if (!arr.length) continue;
    arr = arr.map((x) => x.it); const sorted = sortWithin(arr, sort);
    const pairs = sorted.map((it) => ({ it, rel: relevanceFor(it, persp) }));
    let view = pairs, more = "";
    if (g === rest && !showRest) { view = pairs.slice(0, 8); if (pairs.length > 8) more = `<button class="more" id="more-rest">相性C を${pairs.length}件表示</button>`; }
    const note = persp !== "jisha" && GROUP_NOTE[g] ? `<p class="group-note">${esc(GROUP_NOTE[g])}</p>` : "";
    html += `<section class="group group-${g.toLowerCase()}" id="grp-${esc(g)}"><h2 class="group-head"><span class="gdot"></span>${esc(GROUP_LABEL[g] || g)} <span class="gcount">${pairs.length}件</span></h2>${note}<ul class="cards">${view.map((x) => card(x.it, persp, x.rel)).join("")}</ul>${more}</section>`;
  }
  els.list.innerHTML = html;
  const mr = $("more-rest"); if (mr) mr.addEventListener("click", () => { showRest = true; render(); });
}

function downloadFile(name, text, mime) { const b = new Blob([text], { type: mime }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = name; a.click(); URL.revokeObjectURL(a.href); }
function exportCsv() {
  const rows = window.__visible || [];
  const head = ["重要度(自社)", "該当度", "補助金名", "補助上限額", "補助率", "締切", "実施機関", "地域", "リンク", "検知日"];
  const cell = (v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
  const body = rows.map((it) => [it.rank, it.score, it.name, it.maxLimit, it.rate, it.deadline, it.organization, it.region, it.url, it.detectedDate].map(cell).join(","));
  downloadFile("subsidies.csv", "﻿" + [head.map(cell).join(","), ...body].join("\r\n"), "text/csv");
}
function toast(btn, msg, orig) { btn.textContent = msg; setTimeout(() => (btn.textContent = orig), 1500); }
// 公式LINEから開いた（編集トークンあり）ときは、絞り込みの変更を自動でプロフィールに保存する。
// →「絞り込みを保存」を押さなくても、運営側が管理シートで各社の関心条件（今後の予定/改善/希望支援など）を把握できる。
let autoSaveTimer = null;
function autoSaveView() {
  if (!EDIT_TOKEN) return;
  const v = currentView();
  try { localStorage.setItem("sw-view", JSON.stringify(v)); } catch {}
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    fetch(SAVE_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t: EDIT_TOKEN, view: v }) }).catch(() => {});
  }, 900);
}
function onChange() { showRest = false; page = PAGE; render(); autoSaveView(); }

// ---- 会社プロフィール（業種セレクタを両パネルに展開） ----
function populateProfile() {
  ["s-industry", "d-industry"].forEach((id) => {
    const sel = $(id);
    if (sel && sel.options.length <= 1) INDUSTRIES_30.forEach((o) => { const op = document.createElement("option"); op.value = o; op.textContent = o; sel.appendChild(op); });
  });
}

function init() {
  ["q", "sort", "save", "copy", "csv", "list", "empty", "chips"].forEach((id) => (els[id] = $(id)));
  els.resultCount = $("result-count"); els.banner = $("persp-banner"); els.scoreboard = $("scoreboard");
  els.tabDetail = $("tab-detail"); els.tabSimple = $("tab-simple");
  els.panelDetail = $("panel-detail"); els.panelSimple = $("panel-simple");
  els.clearAll = $("clear-all"); els.resetDetail = $("reset-detail"); els.editReg = $("edit-reg");
  fetch("data/subsidies.json", { cache: "no-store" }).then((r) => r.json()).then((data) => {
    DATA = data;
    LASTSEEN = (() => { try { return localStorage.getItem("sw-lastseen"); } catch { return null; } })();
    $("last-updated").textContent = "最終更新: " + (data.lastUpdated || "—");
    const newCount = data.items.filter(isRecent).length;
    $("new-summary").textContent = LASTSEEN ? `前回チェック（${LASTSEEN}）以降の新着 ${newCount}件` : `本日分の新着 ${newCount}件`;
    $("sources").textContent = "監視ソース: " + (data.sources || []).join(" / ");
    $("uncovered").textContent = data.uncovered || "";
    try { localStorage.setItem("sw-lastseen", data.lastUpdated); } catch {}
    populateProfile();               // ★業種セレクタを30分類で埋める
    deriveRegionCities();            // ★市区町村リストを実データから生成（カスケード用）
    readState();                     // ★グローバル状態＋ORIG（初期化用）を設定。反映はrender内syncControls

    els.q.addEventListener("input", () => { clearTimeout(searchTimer); QUERY = els.q.value; searchTimer = setTimeout(onChange, 160); });
    els.sort.addEventListener("change", () => { SORT = els.sort.value; onChange(); });
    // 両パネル共通コントロール（s=簡易 / d=詳細）。国は都道府県と独立。都道府県変更で市区町村リセット。
    ["s", "d"].forEach((pfx) => {
      const kuni = $(pfx + "-kuni"); if (kuni) kuni.addEventListener("change", () => { KUNI = kuni.checked; onChange(); });
      const pref = $(pfx + "-pref"); if (pref) pref.addEventListener("change", () => { PREF = normPref(pref.value); CITY = ""; onChange(); });
      const city = $(pfx + "-city"); if (city) city.addEventListener("change", () => { CITY = city.value; onChange(); });
      const ind = $(pfx + "-industry"); if (ind) ind.addEventListener("change", () => { PERSP = ind.value; onChange(); });
    });
    const dsize = $("d-size"); if (dsize) dsize.addEventListener("change", () => { SIZE = dsize.value; onChange(); });

    const gotoControls = () => { const t = document.querySelector(".toolbar"); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" }); };
    els.tabDetail.addEventListener("click", () => { setMode("detail"); gotoControls(); });
    els.tabSimple.addEventListener("click", () => { setMode("simple"); gotoControls(); });
    const da = $("detail-active"); if (da) da.addEventListener("click", (e) => { const c = e.target.closest(".chip"); if (!c) return; removeDetailCond(c.dataset.dk); onChange(); });
    const tp = $("theme-pool"); if (tp) tp.addEventListener("click", (e) => { const c = e.target.closest(".theme-chip"); if (!c) return; toggleTheme(c.dataset.tk); onChange(); });

    els.clearAll.addEventListener("click", () => {
      PERSP = ""; PREF = ""; CITY = ""; KUNI = false; SIZE = ""; PLANS = []; IMPROVES = []; SUPPORTS = []; QUERY = "";
      try { localStorage.removeItem("sw-view"); } catch {} // 保存も消して次回以降も解除状態に
      onChange();
    });
    els.resetDetail.addEventListener("click", () => {
      if (!ORIG) return;
      PERSP = ORIG.persp || ""; PREF = normPref(ORIG.pref || ""); CITY = ORIG.city || ""; KUNI = !!ORIG.kuni; SIZE = ORIG.size || "";
      PLANS = (ORIG.plans || []).slice(); IMPROVES = (ORIG.improves || []).slice(); SUPPORTS = (ORIG.supports || []).slice();
      onChange();
    });
    els.scoreboard.addEventListener("click", (e) => { const b = e.target.closest(".score"); if (!b) return; const g = b.dataset.g; if (g === restGroup(PERSP)) showRest = true; render(); const sec = $("grp-" + g); if (sec) sec.scrollIntoView({ behavior: "smooth", block: "start" }); });
    els.chips.addEventListener("click", (e) => {
      const c = e.target.closest(".chip"); if (!c) return; const k = c.dataset.k;
      if (k === "__all") { PERSP = ""; PREF = ""; CITY = ""; KUNI = false; QUERY = ""; try { localStorage.removeItem("sw-view"); } catch {} }
      else if (k === "v") PERSP = "";
      else if (k === "kuni") KUNI = false;
      else if (k === "pref") { PREF = ""; CITY = ""; }
      else if (k === "city") CITY = "";
      else if (k === "q") QUERY = "";
      onChange();
    });
    els.save.addEventListener("click", () => { saveView(); toast(els.save, "保存しました ✓", "絞り込みを保存"); });
    els.copy.addEventListener("click", () => { try { navigator.clipboard.writeText(location.href); } catch {} toast(els.copy, "コピーしました ✓", "URLをコピー"); });
    els.csv.addEventListener("click", exportCsv);
    render();
  }).catch(() => { els.empty.hidden = false; els.empty.textContent = "データを読み込めませんでした。再読み込みしてください。"; });
}
document.addEventListener("DOMContentLoaded", init);
