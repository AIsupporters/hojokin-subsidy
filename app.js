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
let PLANS = [];      // 自社の「今後の予定」（URL plans=）
let IMPROVES = [];   // 自社の「改善したいこと」（URL improve=）
let SUPPORTS = [];   // 自社の「希望する支援」（URL support=）
let SIZE = "";       // 自社の規模ID（URL size=・小規模向け制度の優先に使用）
let MODE = "simple"; // "detail"=詳細検索(自社登録内容) / "simple"=簡易検索(業種×地域)
let ORIG = null;     // 開いたときの登録内容スナップショット（「絞り込み状態を初期化」で復元）
let EDIT_TOKEN = ""; // 登録情報を編集する用トークン（URL edit=）

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
function readState() {
  const p = new URLSearchParams(location.search);
  const ls = savedView();
  const fromLine = p.has("ind") || p.has("plans") || p.has("improve") || p.has("support") || p.has("size");
  const arrOf = (key, map, saved) => p.has(key) ? p.get(key).split(",").map((s) => s.trim()).filter((s) => map[s]) : (fromLine ? [] : (Array.isArray(saved) ? saved.filter((x) => map[x]) : []));
  // 業種: ?v 優先 → ?ind（公式LINE）→ 保存
  let persp = p.has("v") ? p.get("v") : (p.has("ind") ? p.get("ind") : (fromLine ? "" : (ls.persp || "")));
  if (persp && persp !== "jisha" && !INDUSTRY_MAP[persp]) persp = "";
  // 詳細条件（URL優先→なければ保存から復元）
  PLANS = arrOf("plans", PLAN_MAP, ls.plans);
  IMPROVES = arrOf("improve", IMPROVE_MAP, ls.improves);
  SUPPORTS = arrOf("support", SUPPORT_MAP, ls.supports);
  SIZE = p.has("size") ? p.get("size") : (fromLine ? "" : (ls.size || ""));
  // モード: mode= 優先 → LINE由来なら詳細 → 保存 → 簡易
  MODE = p.has("mode") ? (p.get("mode") === "detail" ? "detail" : "simple") : (fromLine ? "detail" : (ls.mode === "detail" ? "detail" : "simple"));
  if (p.has("edit")) EDIT_TOKEN = p.get("edit");
  const category = p.has("category") ? p.get("category") : (p.has("region") ? p.get("region") : (fromLine ? "" : (ls.category || "")));
  const q = p.has("q") ? p.get("q") : (fromLine ? "" : (ls.q || ""));
  const sort = p.has("sort") ? p.get("sort") : (ls.sort || "deadline");
  return { q, category, sort, perspective: persp };
}
function applyState(s) { els.q.value = s.q; els.category.value = s.category; els.sort.value = s.sort; els.perspective.value = s.perspective; }
function currentState() { return { q: els.q.value.trim(), category: els.category.value, sort: els.sort.value, perspective: els.perspective.value }; }
function saveView() {
  const v = { mode: MODE, q: els.q.value.trim(), category: els.category.value, sort: els.sort.value, persp: els.perspective.value, plans: PLANS, improves: IMPROVES, supports: SUPPORTS, size: SIZE };
  try { localStorage.setItem("sw-view", JSON.stringify(v)); } catch {}
}
function syncUrl(s) {
  const p = new URLSearchParams();
  if (MODE === "detail") p.set("mode", "detail");
  if (s.q && MODE === "simple") p.set("q", s.q);
  if (s.category) p.set("category", s.category);
  if (s.sort && s.sort !== "deadline") p.set("sort", s.sort);
  if (s.perspective) p.set("v", s.perspective);
  if (PLANS.length) p.set("plans", PLANS.join(","));
  if (IMPROVES.length) p.set("improve", IMPROVES.join(","));
  if (SUPPORTS.length) p.set("support", SUPPORTS.join(","));
  if (SIZE) p.set("size", SIZE);
  const qs = p.toString();
  history.replaceState(null, "", qs ? "?" + qs : location.pathname);
}

function baseFilter(s) {
  const words = (MODE === "simple" ? s.q : "").toLowerCase().split(/\s+/).filter(Boolean);
  return DATA.items.filter((it) => {
    if (s.category && it.category !== s.category) return false;
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
  if (MODE === "detail") { b.innerHTML = ""; b.style.display = "none"; return; } // 詳細はパネル内で説明済み（重複バナー削除）
  b.style.display = "";
  const persp = els.perspective.value, cat = els.category.value;
  if (!persp && !cat) { b.className = "persp-banner unset"; b.innerHTML = `🔎 <b>簡易検索</b>：上の「業種」「地域」を選ぶと絞り込めます。<span class="rel-note">（公式LINE「補助金の一覧」からは登録内容で自動絞り込み）</span>`; return; }
  const parts = []; if (persp) parts.push(`業種「${esc(persp)}」`); if (cat) parts.push(`地域「${esc(cat)}」`);
  b.className = "persp-banner set"; b.innerHTML = `🔎 <b>簡易検索</b>：${parts.join(" ／ ")}で絞り込み中`;
}

// 詳細検索の条件チップ（×で個別に外せる）
function renderDetailConds() {
  const box = els.detailConds; if (!box) return;
  const chips = [];
  const persp = els.perspective.value, cat = els.category.value;
  if (persp && INDUSTRY_MAP[persp]) chips.push(["persp", `業種：${persp}`]);
  if (cat) chips.push(["category", `地域：${cat}`]);
  if (SIZE && SIZE_LABELS[SIZE]) chips.push(["size", `規模：${SIZE_LABELS[SIZE]}`]);
  PLANS.forEach((p) => chips.push(["plan:" + p, `予定：${p}`]));
  IMPROVES.forEach((m) => chips.push(["improve:" + m, `改善：${m}`]));
  SUPPORTS.forEach((s) => chips.push(["support:" + s, `希望：${s}`]));
  if (!chips.length) { box.innerHTML = `<p class="detail-empty">絞り込み条件がありません。公式LINEの「補助金の一覧」から開くと、登録内容で自動的に絞り込まれます。</p>`; return; }
  box.innerHTML = chips.map(([k, l]) => `<button class="chip" data-dk="${attr(k)}">${esc(l)}</button>`).join("");
}
function removeDetailCond(k) {
  if (k === "persp") els.perspective.value = "";
  else if (k === "category") els.category.value = "";
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

function renderChips(s) {
  const chips = [];
  if (s.perspective) chips.push(["v", `業種：${s.perspective === "jisha" ? "自社" : s.perspective}`]);
  if (s.category) chips.push(["category", `地域：${s.category}`]);
  if (s.q) chips.push(["q", `「${s.q}」`]);
  els.chips.innerHTML = chips.map(([k, l]) => `<button class="chip" data-k="${k}">${esc(l)}</button>`).join("") + (chips.length ? `<button class="chip clear" data-k="__all">すべて解除</button>` : "");
}

function render() {
  const s = currentState();
  syncUrl(s);
  // タブ・パネルの表示切替
  els.tabDetail.setAttribute("aria-selected", MODE === "detail");
  els.tabSimple.setAttribute("aria-selected", MODE === "simple");
  els.panelDetail.hidden = MODE !== "detail";
  els.panelSimple.hidden = MODE !== "simple";
  const isDetail = MODE === "detail";
  if (els.resetDetail) els.resetDetail.hidden = !isDetail;
  if (els.editReg) { els.editReg.hidden = !isDetail; els.editReg.href = EDIT_TOKEN ? ("register.html?t=" + encodeURIComponent(EDIT_TOKEN)) : "register.html"; }
  renderBanner();
  if (isDetail) { renderDetailConds(); els.chips.innerHTML = ""; }
  else renderChips(s);
  const base = baseFilter(s);
  window.__visible = base;
  els.resultCount.textContent = `${base.length} 件${DATA.total ? ` / 全 ${DATA.total} 件` : ""}`;
  els.empty.hidden = base.length > 0;
  if (!base.length) { els.list.innerHTML = ""; els.empty.textContent = "この条件に合う補助金はありません。条件をゆるめてください。"; renderScoreboard(s.perspective, {}, 0); return; }

  const groups = groupsFor(s.perspective);
  if (!groups) {
    // 未設定: フラット・締切順・ページング・相性なし
    renderScoreboard("", {}, DATA.total);
    const arr = sortWithin(base, s.sort);
    const shown = arr.slice(0, page);
    els.list.innerHTML = `<ul class="cards">${shown.map((it) => card(it, "", null)).join("")}</ul>` + (arr.length > page ? `<button class="more" id="more-flat">残り ${arr.length - page} 件を表示</button>` : "");
    const m = $("more-flat"); if (m) m.addEventListener("click", () => { page += PAGE; render(); });
    return;
  }
  // 視点あり: 相性でグルーピング
  const buckets = {}; groups.forEach((g) => (buckets[g] = []));
  for (const it of base) { const rel = relevanceFor(it, s.perspective); (buckets[rel.level] || buckets[restGroup(s.perspective)]).push({ it, rel }); }
  renderScoreboard(s.perspective, buckets, base.length);
  const rest = restGroup(s.perspective);
  let html = "";
  for (const g of groups) {
    let arr = buckets[g]; if (!arr.length) continue;
    arr = arr.map((x) => x.it); const sorted = sortWithin(arr, s.sort);
    const pairs = sorted.map((it) => ({ it, rel: relevanceFor(it, s.perspective) }));
    let view = pairs, more = "";
    if (g === rest && !showRest) { view = pairs.slice(0, 8); if (pairs.length > 8) more = `<button class="more" id="more-rest">${rest === "C" ? "重要度C" : "対象外"} を${pairs.length}件表示</button>`; }
    html += `<section class="group" id="grp-${esc(g)}"><h2 class="group-head g-${g === "高" ? "rh" : g === "中" ? "rm" : g === "対象外" ? "rl" : g.toLowerCase()}"><span class="gdot"></span>${esc(GROUP_LABEL[g] || g)} <span class="gcount">${pairs.length}件</span></h2><ul class="cards">${view.map((x) => card(x.it, s.perspective, x.rel)).join("")}</ul>${more}</section>`;
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

// ---- 会社プロフィール & 登録（業種×規模で出し分け・メール送信は後日。今は入力保存まで） ----
function populateProfile() {
  const sel = els.perspective; // 視点＝簡易検索の業種セレクタ（30分類）
  if (sel && sel.options.length <= 1) INDUSTRIES_30.forEach((o) => { const op = document.createElement("option"); op.value = o; op.textContent = o; sel.appendChild(op); });
}

function init() {
  ["q", "category", "perspective", "sort", "save", "copy", "csv", "list", "empty", "chips"].forEach((id) => (els[id] = $(id)));
  els.resultCount = $("result-count"); els.banner = $("persp-banner"); els.scoreboard = $("scoreboard");
  els.tabDetail = $("tab-detail"); els.tabSimple = $("tab-simple");
  els.panelDetail = $("panel-detail"); els.panelSimple = $("panel-simple");
  els.detailConds = $("detail-conds"); els.clearAll = $("clear-all");
  els.resetDetail = $("reset-detail"); els.editReg = $("edit-reg");
  fetch("data/subsidies.json", { cache: "no-store" }).then((r) => r.json()).then((data) => {
    DATA = data;
    LASTSEEN = (() => { try { return localStorage.getItem("sw-lastseen"); } catch { return null; } })();
    $("last-updated").textContent = "最終更新: " + (data.lastUpdated || "—");
    const newCount = data.items.filter(isRecent).length;
    $("new-summary").textContent = LASTSEEN ? `前回チェック（${LASTSEEN}）以降の新着 ${newCount}件` : `本日分の新着 ${newCount}件`;
    $("sources").textContent = "監視ソース: " + (data.sources || []).join(" / ");
    $("uncovered").textContent = data.uncovered || "";
    try { localStorage.setItem("sw-lastseen", data.lastUpdated); } catch {}
    populateProfile();               // ★セレクタを30分類で埋めてから状態反映（順序重要）
    applyState(readState());
    // 開いた時点の登録内容を保存（「絞り込み状態を初期化」で復元）
    ORIG = { persp: els.perspective.value, category: els.category.value, size: SIZE, plans: PLANS.slice(), improves: IMPROVES.slice(), supports: SUPPORTS.slice() };
    els.q.addEventListener("input", () => { clearTimeout(searchTimer); searchTimer = setTimeout(onChange, 160); });
    ["category", "perspective", "sort"].forEach((id) => els[id].addEventListener("change", onChange));
    els.tabDetail.addEventListener("click", () => setMode("detail"));
    els.tabSimple.addEventListener("click", () => setMode("simple"));
    els.detailConds.addEventListener("click", (e) => { const c = e.target.closest(".chip"); if (!c) return; removeDetailCond(c.dataset.dk); onChange(); });
    els.clearAll.addEventListener("click", () => {
      if (MODE === "detail") { els.perspective.value = ""; els.category.value = ""; SIZE = ""; PLANS = []; IMPROVES = []; SUPPORTS = []; }
      else { els.q.value = ""; els.category.value = ""; els.perspective.value = ""; }
      onChange();
    });
    els.resetDetail.addEventListener("click", () => {
      if (!ORIG) return;
      els.perspective.value = ORIG.persp; els.category.value = ORIG.category; SIZE = ORIG.size;
      PLANS = ORIG.plans.slice(); IMPROVES = ORIG.improves.slice(); SUPPORTS = ORIG.supports.slice();
      onChange();
    });
    els.scoreboard.addEventListener("click", (e) => { const b = e.target.closest(".score"); if (!b) return; const g = b.dataset.g; if (g === restGroup(els.perspective.value)) showRest = true; render(); const sec = $("grp-" + g); if (sec) sec.scrollIntoView({ behavior: "smooth", block: "start" }); });
    els.chips.addEventListener("click", (e) => {
      const c = e.target.closest(".chip"); if (!c) return; const k = c.dataset.k;
      if (k === "__all") { els.q.value = ""; els.category.value = ""; els.perspective.value = ""; }
      else if (k === "v") els.perspective.value = "";
      else if (k === "category") els.category.value = "";
      else if (k === "q") els.q.value = "";
      onChange();
    });
    els.save.addEventListener("click", () => { saveView(); toast(els.save, "保存しました ✓", "絞り込みを保存"); });
    els.copy.addEventListener("click", () => { try { navigator.clipboard.writeText(location.href); } catch {} toast(els.copy, "コピーしました ✓", "URLをコピー"); });
    els.csv.addEventListener("click", exportCsv);
    render();
  }).catch(() => { els.empty.hidden = false; els.empty.textContent = "データを読み込めませんでした。再読み込みしてください。"; });
}
document.addEventListener("DOMContentLoaded", init);
