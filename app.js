// 公開Web一覧フロント（静的・ページ内JS）。subsidies.json を読み、「相性の視点」を切り替えて表示。
// ★視点モデル: 既定=未設定（相性を出さない＝固定の誤解を避ける）／"jisha"=AIサポーターズ自社（既存のエンジン採点S/A/B/Cを相性として使用）／業種=キーワード判定の相性(高/中/対象外・💰0円)。
// バッジも本文の相性テキストも視点に追従。視点はlocalStorageに登録（記憶）。データ値は素通し（捏造なし）。
"use strict";

const RANK_LIST = ["S", "A", "B", "C"];
const REL_LIST = ["高", "中", "対象外"];
const PAGE = 40;
// 業種＝キーワード判定（目安）。dataに業種フィールドが無いため本文テキストの部分一致。
const INDUSTRY_MAP = {
  "製造・ものづくり": ["ものづくり", "製造", "設備", "機械", "工場", "生産"],
  "IT・DX・AI": ["IT", "デジタル", "DX", "ソフト", "システム", "AI", "情報通信"],
  "雇用・労務・人材": ["雇用", "労務", "人材", "働き方", "賃金", "賃上げ", "処遇", "育成", "研修"],
  "創業・起業": ["創業", "起業", "スタートアップ", "開業"],
  "省力化・自動化": ["省力化", "自動化", "ロボット", "効率化"],
  "環境・脱炭素・省エネ": ["環境", "脱炭素", "省エネ", "カーボン", "再エネ", "CO2", "二酸化炭素"],
  "観光・飲食・小売": ["観光", "飲食", "小売", "宿泊", "商店", "サービス業"],
  "医療・介護・福祉": ["医療", "介護", "福祉", "保育", "ヘルス"],
  "農林・水産": ["農", "林業", "水産", "漁"],
};

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
  if (INDUSTRY_MAP[persp]) {
    const kws = INDUSTRY_MAP[persp];
    const hay = it.name + " " + it.reason + " " + it.requirements + " " + it.rate + " " + it.organization;
    const matched = kws.filter((k) => hay.includes(k));
    const level = matched.length >= 2 ? "高" : matched.length === 1 ? "中" : "対象外";
    return { kind: "industry", level, matched };
  }
  return null; // 未設定
}
function groupsFor(persp) {
  if (persp === "jisha") return RANK_LIST;
  if (INDUSTRY_MAP[persp]) return REL_LIST;
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
function readState() {
  const p = new URLSearchParams(location.search);
  const ls = (() => { try { return JSON.parse(localStorage.getItem("sw-view") || "{}"); } catch { return {}; } })();
  const get = (k, d) => (p.has(k) ? p.get(k) : (ls[k] != null ? ls[k] : d));
  let persp = p.has("v") ? p.get("v") : (localStorage.getItem("sw-perspective") || "");
  if (persp !== "" && persp !== "jisha" && !INDUSTRY_MAP[persp]) persp = "";
  return { q: get("q", ""), category: get("category", ""), sort: get("sort", "deadline"), newonly: String(get("newonly", "")) === "1", perspective: persp };
}
function applyState(s) { els.q.value = s.q; els.category.value = s.category; els.sort.value = s.sort; els.newonly.checked = s.newonly; els.perspective.value = s.perspective; }
function currentState() { return { q: els.q.value.trim(), category: els.category.value, sort: els.sort.value, newonly: els.newonly.checked, perspective: els.perspective.value }; }
function syncUrl(s) {
  const p = new URLSearchParams();
  if (s.q) p.set("q", s.q);
  if (s.category) p.set("category", s.category);
  if (s.sort && s.sort !== "deadline") p.set("sort", s.sort);
  if (s.newonly) p.set("newonly", "1");
  if (s.perspective) p.set("v", s.perspective);
  const qs = p.toString();
  history.replaceState(null, "", qs ? "?" + qs : location.pathname);
}

function baseFilter(s) {
  const words = s.q.toLowerCase().split(/\s+/).filter(Boolean);
  return DATA.items.filter((it) => {
    if (s.category && it.category !== s.category) return false;
    if (s.newonly && !isRecent(it)) return false;
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
  // industry: 相性テキストを本文に出す（視点に追従）
  const detail = rel.matched.length ? `該当：${esc(rel.matched.join("・"))}` : "該当キーワードなし";
  return `<p class="reason rel-${rel.level === "高" ? "high" : rel.level === "中" ? "mid" : "low"}">「${esc(persp)}」との相性：<b>${rel.level}</b> ／ ${detail}<span class="rel-note">（キーワード判定の目安）</span></p>`;
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
  const catCls = it.category === "国" ? "kuni" : it.category === "大阪" ? "osaka" : "";
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

function renderBanner(persp) {
  const b = els.banner;
  if (!persp) {
    b.className = "persp-banner unset";
    b.innerHTML = `🔎 <b>視点が未設定です。</b>上の「視点」で<b>あなたの業種</b>を選ぶと、各補助金に「御社との相性」が表示されます（選択は記憶されます）。`;
    return;
  }
  const label = persp === "jisha" ? "AIサポーターズ（自社の精密採点）" : `${persp}（キーワード判定の目安）`;
  b.className = "persp-banner set";
  b.innerHTML = `相性の視点：<b>${esc(label)}</b> <button type="button" class="link-btn" id="persp-clear">解除</button>`;
  const c = $("persp-clear");
  if (c) c.addEventListener("click", () => { els.perspective.value = ""; onChange(); });
}

function renderScoreboard(persp, buckets, total) {
  const sb = els.scoreboard;
  if (!persp) {
    sb.innerHTML = `<div class="score-msg">全 <b>${total}</b> 件 ／ <span class="muted">業種を選んで相性を見る</span></div>`;
    return;
  }
  const groups = groupsFor(persp);
  const cls = (g) => persp === "jisha" ? g.toLowerCase() : (g === "高" ? "rh" : g === "中" ? "rm" : "rl");
  sb.innerHTML = groups.map((g) => `<button class="score ${cls(g)}" data-g="${esc(g)}"><span class="dot"></span>${esc(g)} <b>${(buckets[g] || []).length}</b></button>`).join("");
}

function renderChips(s) {
  const chips = [];
  if (s.perspective) chips.push(["v", `視点：${s.perspective === "jisha" ? "自社" : s.perspective}`]);
  if (s.category) chips.push(["category", `地域：${s.category}`]);
  if (s.q) chips.push(["q", `「${s.q}」`]);
  if (s.newonly) chips.push(["newonly", "新着のみ"]);
  els.chips.innerHTML = chips.map(([k, l]) => `<button class="chip" data-k="${k}">${esc(l)}</button>`).join("") + (chips.length ? `<button class="chip clear" data-k="__all">すべて解除</button>` : "");
}

function render() {
  const s = currentState();
  try { localStorage.setItem("sw-perspective", s.perspective); } catch {}
  syncUrl(s);
  renderBanner(s.perspective);
  renderChips(s);
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
function exportIcs() {
  const rows = (window.__visible || []).filter((it) => isISO(it.deadline));
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//subsidy-watch//JP"];
  for (const it of rows) lines.push("BEGIN:VEVENT", `DTSTART;VALUE=DATE:${it.deadline.replace(/-/g, "")}`, `SUMMARY:【締切】${String(it.name).replace(/\r?\n/g, " ")}`, `DESCRIPTION:${String(it.url || "").replace(/\r?\n/g, " ")}`, "END:VEVENT");
  lines.push("END:VCALENDAR");
  downloadFile("subsidy-deadlines.ics", lines.join("\r\n"), "text/calendar");
}
function toast(btn, msg, orig) { btn.textContent = msg; setTimeout(() => (btn.textContent = orig), 1500); }
function onChange() { showRest = false; page = PAGE; render(); }

// ---- 会社プロフィール & 登録（業種×規模で出し分け・メール送信は後日。今は入力保存まで） ----
function statusCls(st) { if (st === "要確認") return "warn"; if (st === "非該当" || (st && st.indexOf("非該当") === 0)) return "no"; if (st && st.indexOf("該当") >= 0) return "ok"; return "warn"; }
function populateProfile() {
  if (!window.ELIGIBILITY) return;
  const ind = $("pp-industry"), sz = $("pp-size");
  if (ind && ind.options.length <= 1) ELIGIBILITY.INDUSTRY_OPTIONS.forEach((o) => { const op = document.createElement("option"); op.value = o; op.textContent = o; ind.appendChild(op); });
  if (sz && sz.options.length <= 1) ELIGIBILITY.SIZE_OPTIONS.forEach((o) => { const op = document.createElement("option"); op.value = o.id; op.textContent = o.label; sz.appendChild(op); });
}
function renderEligibility() {
  const box = $("pp-result"); if (!box || !window.ELIGIBILITY) return;
  const industry = $("pp-industry").value, sizeId = $("pp-size").value;
  if (!industry || !sizeId) { box.className = "pp-result empty"; box.innerHTML = `<p class="pp-hint">業種と従業員規模を選ぶと、あなたの会社向けの判定（小規模/中小の目安・補助上限帯）が表示されます。</p>`; return; }
  const r = ELIGIBILITY.assess(industry, sizeId);
  const judge = (label, j) => `<div class="pp-judge ${statusCls(j.status)}"><span class="pp-j-label">${esc(label)}</span><span class="pp-j-val">${esc(j.status)}</span><span class="pp-j-text">${esc(j.text)}</span></div>`;
  const ceil = r.ceilings.map((c) => `<li><div class="pp-c-top"><span class="pp-c-name">${esc(c.name)}</span><span class="pp-c-band">${esc(c.band)}</span></div><span class="pp-c-rate">${esc(c.rate)}</span>${c.note ? `<span class="pp-c-note">${esc(c.note)}</span>` : ""}</li>`).join("");
  const gated = r.gated.map((g) => `<li><div class="pp-c-top"><span class="pp-c-name">${esc(g.name)}</span></div><span class="pp-c-note">${esc(g.note)}</span></li>`).join("");
  box.className = "pp-result filled";
  box.innerHTML =
    `<div class="pp-judges">${judge("小規模事業者", r.shoukibo)}${judge("中小企業", r.chusho)}</div>` +
    `<div class="pp-ceil"><h3>あなたの規模での補助上限の目安</h3><ul class="pp-ceil-list">${ceil}${gated}</ul></div>` +
    `<p class="pp-caveat">${r.caveats.map(esc).join("<br>")}</p>` +
    `<p class="pp-cta-line">下の一覧は「${esc(industry)}」で絞り込み中。<button type="button" class="link-btn" id="pp-open-reg">この内容で登録して新着を受け取る →</button></p>`;
  const ob = $("pp-open-reg"); if (ob) ob.addEventListener("click", () => { const d = $("pp-register"); if (d) { d.open = true; d.scrollIntoView({ behavior: "smooth", block: "center" }); } });
}
function syncIndustryToList(industry) { if (industry && INDUSTRY_MAP[industry]) { els.perspective.value = industry; onChange(); } }
function focusField(el) { if (!el) return; el.scrollIntoView({ behavior: "smooth", block: "center" }); try { el.focus({ preventScroll: true }); } catch { try { el.focus(); } catch {} } }
function markPpError(on) { ["pp-industry", "pp-size"].forEach((id) => { const f = $(id); if (f && f.parentElement) f.parentElement.classList.toggle("error", !!on && !f.value); }); }
function updatePicknote() {
  const el = $("reg-picknote"); if (!el) return;
  const ind = $("pp-industry").value, sz = $("pp-size"); const szText = sz && sz.value ? sz.options[sz.selectedIndex].text : "";
  if (ind && szText) { el.className = "reg-picknote ok"; el.textContent = "登録内容 — 業種：" + ind + " ／ 従業員規模：" + szText; }
  else { el.className = "reg-picknote warn"; el.textContent = "業種・従業員規模が未選択です。上の選択欄でお選びください。"; }
}
function submitRegistration(e) {
  e.preventDefault();
  const email = $("reg-email").value.trim(), company = $("reg-company").value.trim();
  const industry = $("pp-industry").value, sizeId = $("pp-size").value;
  const c1 = $("reg-consent1").checked, c2 = $("reg-consent2").checked;
  const st = $("reg-status");
  const fail = (m, focusEl) => { st.className = "reg-status err"; st.textContent = m; if (focusEl) focusField(focusEl); else { st.setAttribute("tabindex", "-1"); try { st.focus(); } catch {} } };
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("メールアドレスをご確認ください。", $("reg-email"));
  if (!company || company.length > 200) return fail("会社名・屋号をご入力ください（200文字以内）。", $("reg-company"));
  if (!industry || !sizeId) { markPpError(true); updatePicknote(); return fail("上の「業種」「従業員規模」をお選びください。", !industry ? $("pp-industry") : $("pp-size")); }
  if (!c1) return fail("メール受信の同意（必須）にチェックしてください。", $("reg-consent1"));
  markPpError(false);
  const rec = { email, company, industry, size: sizeId, consentNotify: c1, consentSales: c2, ts: todayStr(), source: "補助金調べるくん登録" };
  let ok = false;
  try {
    let a = JSON.parse(localStorage.getItem("sw-registrations") || "[]");
    a = (Array.isArray(a) ? a : []).filter((x) => x && x.email !== email); // 同一メールは最新で置換
    a.push(rec); if (a.length > 50) a = a.slice(-50);                       // 蓄積上限
    localStorage.setItem("sw-registrations", JSON.stringify(a)); ok = true;
  } catch {}
  if (!ok) return fail("お使いのブラウザで保存できませんでした（容量超過やプライベートモード等）。お手数ですが時間をおいて再度お試しください。");
  st.className = "reg-status ok";
  st.textContent = "ご入力ありがとうございます。メールでの新着通知は現在準備中で、受付開始までお待ちください（この時点ではまだ送信は行われません）。";
  st.setAttribute("tabindex", "-1"); try { st.focus(); } catch {}
  $("reg-email").value = ""; $("reg-company").value = ""; $("reg-consent1").checked = false; $("reg-consent2").checked = false;
}

function init() {
  ["q", "category", "perspective", "sort", "newonly", "save", "copy", "csv", "ics", "list", "empty", "chips"].forEach((id) => (els[id] = $(id)));
  els.resultCount = $("result-count"); els.banner = $("persp-banner"); els.scoreboard = $("scoreboard");
  fetch("data/subsidies.json", { cache: "no-store" }).then((r) => r.json()).then((data) => {
    DATA = data;
    LASTSEEN = (() => { try { return localStorage.getItem("sw-lastseen"); } catch { return null; } })();
    $("last-updated").textContent = "最終更新: " + (data.lastUpdated || "—");
    const newCount = data.items.filter(isRecent).length;
    $("new-summary").textContent = LASTSEEN ? `前回チェック（${LASTSEEN}）以降の新着 ${newCount}件` : `本日分の新着 ${newCount}件`;
    $("sources").textContent = "監視ソース: " + (data.sources || []).join(" / ");
    $("uncovered").textContent = data.uncovered || "";
    try { localStorage.setItem("sw-lastseen", data.lastUpdated); } catch {}
    applyState(readState());
    els.q.addEventListener("input", () => { clearTimeout(searchTimer); searchTimer = setTimeout(onChange, 160); });
    ["category", "perspective", "sort", "newonly"].forEach((id) => els[id].addEventListener("change", onChange));
    els.scoreboard.addEventListener("click", (e) => { const b = e.target.closest(".score"); if (!b) return; const g = b.dataset.g; if (g === restGroup(els.perspective.value)) showRest = true; render(); const sec = $("grp-" + g); if (sec) sec.scrollIntoView({ behavior: "smooth", block: "start" }); });
    els.chips.addEventListener("click", (e) => {
      const c = e.target.closest(".chip"); if (!c) return; const k = c.dataset.k;
      if (k === "__all") { els.q.value = ""; els.category.value = ""; els.newonly.checked = false; els.perspective.value = ""; }
      else if (k === "v") els.perspective.value = "";
      else if (k === "category") els.category.value = "";
      else if (k === "q") els.q.value = "";
      else if (k === "newonly") els.newonly.checked = false;
      onChange();
    });
    els.save.addEventListener("click", () => { try { localStorage.setItem("sw-view", JSON.stringify(currentState())); } catch {} toast(els.save, "保存しました ✓", "絞り込みを保存"); });
    els.copy.addEventListener("click", () => { try { navigator.clipboard.writeText(location.href); } catch {} toast(els.copy, "コピーしました ✓", "URLをコピー"); });
    els.csv.addEventListener("click", exportCsv);
    els.ics.addEventListener("click", exportIcs);
    // 会社プロフィール & 登録（業種×規模の出し分け・登録）
    populateProfile();
    const pi = $("pp-industry"), ps = $("pp-size"), rf = $("reg-form"), reg = $("pp-register");
    if (pi && INDUSTRY_MAP[els.perspective.value]) pi.value = els.perspective.value;
    if (pi) pi.addEventListener("change", () => { markPpError(false); renderEligibility(); updatePicknote(); syncIndustryToList(pi.value); });
    if (ps) ps.addEventListener("change", () => { markPpError(false); renderEligibility(); updatePicknote(); });
    els.perspective.addEventListener("change", () => { if (pi) { pi.value = INDUSTRY_MAP[els.perspective.value] ? els.perspective.value : ""; renderEligibility(); updatePicknote(); } });
    if (rf) rf.addEventListener("submit", submitRegistration);
    if (reg) reg.addEventListener("toggle", () => { if (reg.open) updatePicknote(); });
    renderEligibility(); updatePicknote();
    render();
  }).catch(() => { els.empty.hidden = false; els.empty.textContent = "データを読み込めませんでした。再読み込みしてください。"; });
}
document.addEventListener("DOMContentLoaded", init);
