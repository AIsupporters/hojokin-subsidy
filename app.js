// 公開Web一覧フロント（静的・ページ内JS）。subsidies.json を読み、「相性の視点」を切り替えて表示。
// ★視点モデル: 既定=未設定（相性を出さない＝固定の誤解を避ける）／"jisha"=AIサポーターズ自社（既存のエンジン採点S/A/B/Cを相性として使用）／業種=キーワード判定の相性(高/中/対象外・💰0円)。
// バッジも本文の相性テキストも視点に追従。視点はlocalStorageに登録（記憶）。データ値は素通し（捏造なし）。
"use strict";

const RANK_LIST = ["S", "A", "B", "C"];
const REL_LIST = ["高", "中", "対象外"];
const PAGE = 40;
// 業種一覧（登録フォーム register.js と同じ30分類）
const INDUSTRIES_30 = ["建設・工事業", "製造業", "卸売業", "小売業", "飲食業", "宿泊・観光業", "運送・物流業", "IT・システム開発", "Web制作・デザイン", "広告・マーケティング", "通信業", "不動産業", "建物管理・清掃業", "金融業", "保険業", "医療業", "介護・福祉業", "教育・研修業", "士業", "コンサルティング業", "人材サービス業", "美容・健康業", "自動車関連業", "農業・林業", "水産・漁業", "エネルギー・環境業", "娯楽・イベント業", "冠婚葬祭・生活サービス業", "貿易・輸出入業", "その他サービス業"];
// 業種＝キーワード判定（目安・本文テキストの部分一致）。src/relevance.mjs の INDUSTRY_MAP_30 と一致。
const INDUSTRY_MAP = {
  "建設・工事業": ["建設", "工事", "建築", "土木", "電気", "水道", "内装", "リフォーム"],
  "製造業": ["製造", "ものづくり", "工場", "機械", "食品", "金属", "化学", "印刷", "生産"],
  "卸売業": ["卸", "商社", "卸売"],
  "小売業": ["小売", "店舗", "EC", "販売", "商店", "スーパー"],
  "飲食業": ["飲食", "レストラン", "居酒屋", "カフェ", "飲食店"],
  "宿泊・観光業": ["宿泊", "観光", "ホテル", "旅館", "旅行"],
  "運送・物流業": ["運送", "物流", "配送", "倉庫", "運輸", "トラック"],
  "IT・システム開発": ["IT", "システム", "ソフト", "SaaS", "アプリ", "デジタル", "DX", "情報通信", "AI"],
  "Web制作・デザイン": ["Web", "デザイン", "制作", "動画", "クリエイティブ", "ホームページ"],
  "広告・マーケティング": ["広告", "マーケティング", "SNS", "PR", "販促", "集客"],
  "通信業": ["通信", "インターネット", "ネットワーク"],
  "不動産業": ["不動産", "賃貸", "仲介", "住宅"],
  "建物管理・清掃業": ["管理", "清掃", "メンテナンス", "クリーニング"],
  "金融業": ["金融", "銀行", "証券", "リース", "ファイナンス"],
  "保険業": ["保険"],
  "医療業": ["医療", "病院", "クリニック", "歯科", "薬局", "診療"],
  "介護・福祉業": ["介護", "福祉", "障害", "高齢者", "保育"],
  "教育・研修業": ["教育", "学校", "塾", "スクール", "研修", "学習"],
  "士業": ["士業", "税理士", "行政書士", "社労士", "司法書士", "弁護士", "会計"],
  "コンサルティング業": ["コンサル", "経営", "支援"],
  "人材サービス業": ["人材", "派遣", "採用", "紹介", "求人"],
  "美容・健康業": ["美容", "エステ", "ネイル", "整体", "ジム", "健康", "理容"],
  "自動車関連業": ["自動車", "整備", "車両", "カー", "鈑金"],
  "農業・林業": ["農", "林業", "園芸", "農業"],
  "水産・漁業": ["水産", "漁", "養殖"],
  "エネルギー・環境業": ["エネルギー", "電力", "ガス", "太陽光", "再エネ", "環境", "リサイクル", "脱炭素", "省エネ"],
  "娯楽・イベント業": ["イベント", "スポーツ", "ゲーム", "娯楽", "エンタメ"],
  "冠婚葬祭・生活サービス業": ["冠婚葬祭", "ブライダル", "葬祭", "写真", "ペット"],
  "貿易・輸出入業": ["貿易", "輸出", "輸入", "海外", "越境"],
  "その他サービス業": ["サービス"],
};
// 「今後の予定」→キーワード（登録フォームの予定と一致）。URLの plans= で渡る。
const PLAN_MAP = {
  "新しい設備を購入予定": ["設備", "導入", "ものづくり", "省力化", "設備投資"], "車両購入予定": ["車両", "自動車", "EV", "トラック"],
  "店舗改装": ["店舗", "改装", "リニューアル", "内装"], "工場新設": ["工場", "新設", "設備投資", "生産"],
  "IT導入": ["IT導入", "IT", "デジタル", "システム", "DX"], "AI導入": ["AI", "人工知能", "DX"],
  "ECサイト": ["EC", "ネットショップ", "オンライン", "越境EC", "販路"], "ホームページ制作": ["ホームページ", "Web", "サイト", "販路"],
  "DX化": ["DX", "デジタル", "効率化", "デジタル化"], "人材採用": ["採用", "雇用", "人材", "求人"],
  "人材育成": ["育成", "研修", "能力開発", "スキル", "人材開発"], "海外展開": ["海外", "輸出", "越境", "グローバル", "展示会"],
  "新商品開発": ["新商品", "商品開発", "製品開発", "研究開発"], "新サービス開発": ["新サービス", "サービス開発", "新事業", "新分野"],
  "脱炭素": ["脱炭素", "カーボン", "CO2", "再エネ", "省エネ"], "省エネ設備": ["省エネ", "省エネルギー", "エネルギー", "脱炭素"],
  "事業承継": ["事業承継", "承継", "後継"], "M&A": ["M&A", "買収", "譲渡", "統合"],
};
// 「改善したいこと」→キーワード（登録フォームの improve と一致）。
const IMPROVE_MAP = {
  "売上を伸ばしたい": ["販路", "売上", "集客", "EC", "販売", "マーケティング"], "人手不足": ["省力化", "人手不足", "自動化", "効率化", "人材"],
  "採用": ["採用", "雇用", "人材", "求人"], "資金繰り": ["資金", "融資", "運転資金"], "広告": ["広告", "販促", "PR", "集客"],
  "SNS": ["SNS", "デジタル", "マーケティング"], "AI活用": ["AI", "DX", "デジタル"], "業務効率化": ["効率化", "省力化", "生産性", "IT", "DX"],
  "システム化": ["システム", "IT", "デジタル", "DX"], "コスト削減": ["省エネ", "効率化", "コスト", "省力化"],
};
// 「希望する支援」→キーワード（補助金/助成金は全件対象なので無指定）。
const SUPPORT_MAP = {
  "補助金": [], "助成金": [], "融資": ["融資", "資金"], "税金相談": ["税"], "節税": ["税", "節税"],
  "M&A": ["M&A", "事業承継", "承継", "譲渡"], "保険": ["保険"], "不動産": ["不動産"], "DX支援": ["DX", "デジタル"], "AI導入": ["AI"],
};
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

// ---- 相性（視点に応じて算出） ----
function relevanceFor(it, persp) {
  if (persp === "jisha") return { kind: "jisha", level: it.rank };
  const detail = MODE === "detail";
  const hasInd = !!INDUSTRY_MAP[persp];
  const hasTheme = detail && (PLANS.length || IMPROVES.length || SUPPORTS.length);
  const small = detail && (SIZE === "s1_5" || SIZE === "s6_20"); // 小規模向け制度の優先
  if (!hasInd && !hasTheme && !small) return null; // 条件なし＝未設定
  const hay = it.name + " " + it.reason + " " + it.requirements + " " + it.rate + " " + it.organization;
  // 業種の相性
  let matched = [];
  let indLevel = null;
  if (hasInd) { matched = INDUSTRY_MAP[persp].filter((k) => hay.includes(k)); indLevel = matched.length >= 2 ? "高" : matched.length === 1 ? "中" : "対象外"; }
  // テーマ（今後の予定＋改善したいこと＋希望する支援）の相性（1つでも合致＝高）
  let themeMatched = [];
  let themeLevel = null;
  if (hasTheme) {
    const themes = PLANS.map((p) => [p, PLAN_MAP[p]]).concat(IMPROVES.map((m) => [m, IMPROVE_MAP[m]])).concat(SUPPORTS.map((s) => [s, SUPPORT_MAP[s]]));
    for (const [name, kws] of themes) if (kws && kws.length && kws.some((k) => hay.includes(k))) themeMatched.push(name);
    themeLevel = themeMatched.length >= 1 ? "高" : "対象外";
  }
  // 小規模事業者向けの主要制度は、小規模の会社に優先表示
  const smallHit = small && /小規模事業者/.test(hay);
  const rank = { "高": 2, "中": 1, "対象外": 0 };
  const level = [indLevel, themeLevel, smallHit ? "高" : null].filter(Boolean).reduce((a, b) => (rank[b] > rank[a] ? b : a), "対象外");
  return { kind: "industry", level, matched, themeMatched, smallHit };
}
function groupsFor(persp) {
  if (persp === "jisha") return RANK_LIST;
  const detail = MODE === "detail";
  if (INDUSTRY_MAP[persp] || (detail && (PLANS.length || IMPROVES.length || SUPPORTS.length || SIZE === "s1_5" || SIZE === "s6_20"))) return REL_LIST;
  return null;
}
function restGroup(persp) { return persp === "jisha" ? "C" : "対象外"; }

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
const arrCsv = (str, map) => String(str || "").split(",").map((s) => s.trim()).filter((s) => map[s]);

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
  const bits = [];
  if (persp && INDUSTRY_MAP[persp]) bits.push(rel.matched && rel.matched.length ? `業種該当：${esc(rel.matched.join("・"))}` : "業種キーワードなし");
  if (rel.themeMatched && rel.themeMatched.length) bits.push(`ご要望に合致：${esc(rel.themeMatched.join("・"))}`);
  if (rel.smallHit) bits.push("小規模事業者向け制度");
  const cls = rel.level === "高" ? "high" : rel.level === "中" ? "mid" : "low";
  const label = persp && INDUSTRY_MAP[persp] ? `「${esc(persp)}」との相性` : "あなたの登録内容との相性";
  return `<p class="reason rel-${cls}">${label}：<b>${esc(rel.level)}</b> ／ ${bits.join(" ／ ") || "該当なし"}<span class="rel-note">（目安）</span></p>`;
}
function badge(persp, rel) {
  if (!rel) return `<span class="badge none" aria-hidden="true">·</span>`;
  if (rel.kind === "jisha") return `<span class="badge ${esc(rel.level)}" aria-label="自社該当度${esc(rel.level)}">${esc(rel.level)}</span>`;
  const cls = rel.level === "高" ? "rel-high" : rel.level === "中" ? "rel-mid" : "rel-low";
  const txt = rel.level === "対象外" ? "—" : rel.level;
  return `<span class="badge ${cls}" aria-label="相性${esc(rel.level)}">${txt}</span>`;
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

const GROUP_LABEL = { S: "重要度 S（自社該当度）", A: "重要度 A", B: "重要度 B", C: "重要度 C", "高": "相性 高", "中": "相性 中", "対象外": "対象外（キーワード不一致）" };

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
  const cls = (g) => persp === "jisha" ? g.toLowerCase() : (g === "高" ? "rh" : g === "中" ? "rm" : "rl");
  sb.innerHTML = groups.map((g) => `<button class="score ${cls(g)}" data-g="${esc(g)}"><span class="dot"></span>${esc(g)} <b>${(buckets[g] || []).length}</b></button>`).join("");
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
  for (const g of groups) {
    let arr = buckets[g]; if (!arr.length) continue;
    arr = arr.map((x) => x.it); const sorted = sortWithin(arr, sort);
    const pairs = sorted.map((it) => ({ it, rel: relevanceFor(it, persp) }));
    let view = pairs, more = "";
    if (g === rest && !showRest) { view = pairs.slice(0, 8); if (pairs.length > 8) more = `<button class="more" id="more-rest">${rest === "C" ? "重要度C" : "対象外"} を${pairs.length}件表示</button>`; }
    html += `<section class="group" id="grp-${esc(g)}"><h2 class="group-head g-${g === "高" ? "rh" : g === "中" ? "rm" : g === "対象外" ? "rl" : g.toLowerCase()}"><span class="gdot"></span>${esc(GROUP_LABEL[g] || g)} <span class="gcount">${pairs.length}件</span></h2><ul class="cards">${view.map((x) => card(x.it, persp, x.rel)).join("")}</ul>${more}</section>`;
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
function onChange() { showRest = false; page = PAGE; render(); }

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

    els.tabDetail.addEventListener("click", () => setMode("detail"));
    els.tabSimple.addEventListener("click", () => setMode("simple"));
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
