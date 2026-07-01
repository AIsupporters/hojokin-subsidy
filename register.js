/* register.js — 会社情報登録フォーム（LINEからトークン付きで開く）。
 * 送信先は LINE webhook Worker の POST /register（トークン→userId照合→プロフィール保存）。
 * 個人情報はこのページからWorkerへ送るだけ。第三者送信・ログ出力はしない。 */
(function () {
  "use strict";
  var WORKER = "https://hojokin-line-webhook.ai-supporters.workers.dev/register";

  // Step1 業種（docx 30分類）
  var INDUSTRIES = [
    "建設・工事業", "製造業", "卸売業", "小売業", "飲食業", "宿泊・観光業", "運送・物流業",
    "IT・システム開発", "Web制作・デザイン", "広告・マーケティング", "通信業", "不動産業",
    "建物管理・清掃業", "金融業", "保険業", "医療業", "介護・福祉業", "教育・研修業", "士業",
    "コンサルティング業", "人材サービス業", "美容・健康業", "自動車関連業", "農業・林業",
    "水産・漁業", "エネルギー・環境業", "娯楽・イベント業", "冠婚葬祭・生活サービス業",
    "貿易・輸出入業", "その他サービス業",
  ];
  // 本サービスの対応エリアは 国＋大阪府・京都府・兵庫県。都道府県は3府県＋「その他」に統一。
  var PREFS = ["大阪府", "京都府", "兵庫県", "その他（上記以外）"];
  var COVERED_PREFS = { "大阪府": 1, "京都府": 1, "兵庫県": 1 };
  var MUNI = {}; // 都道府県→市区町村配列（data/municipalities.json を読み込み）
  var SALES = ["1000万円未満", "1000〜3000万円", "3000〜5000万円", "5000万円〜1億円", "1〜5億円", "5億円以上"];
  var INVEST = ["100万円以下", "100〜500万円", "500〜1000万円", "1000〜3000万円", "3000万円以上"];
  var PLANS = ["新しい設備を購入予定", "車両購入予定", "店舗改装", "工場新設", "IT導入", "AI導入", "ECサイト", "ホームページ制作", "DX化", "人材採用", "人材育成", "海外展開", "新商品開発", "新サービス開発", "脱炭素", "省エネ設備", "事業承継", "M&A"];
  var IMPROVE = ["売上を伸ばしたい", "人手不足", "採用", "資金繰り", "広告", "SNS", "AI活用", "業務効率化", "システム化", "コスト削減"];
  var SUPPORT = ["補助金", "助成金", "融資", "税金相談", "節税", "M&A", "保険", "不動産", "DX支援", "AI導入"];

  function $(id) { return document.getElementById(id); }
  function fillSelect(id, arr, withMonth) {
    var sel = $(id);
    for (var i = 0; i < arr.length; i++) {
      var o = document.createElement("option");
      o.value = arr[i]; o.textContent = arr[i]; sel.appendChild(o);
    }
    if (withMonth) { /* 決算月 1〜12 */ }
  }
  function fillMonths(id) {
    var sel = $(id);
    for (var m = 1; m <= 12; m++) {
      var o = document.createElement("option");
      o.value = String(m); o.textContent = m + "月"; sel.appendChild(o);
    }
  }
  function renderChecks(containerId, arr, name) {
    var box = $(containerId);
    for (var i = 0; i < arr.length; i++) {
      var lab = document.createElement("label");
      lab.className = "rf-chk";
      var cb = document.createElement("input");
      cb.type = "checkbox"; cb.value = arr[i]; cb.name = name;
      var span = document.createElement("span");
      span.textContent = arr[i];
      lab.appendChild(cb); lab.appendChild(span);
      cb.addEventListener("change", function (e) {
        e.target.parentNode.classList.toggle("on", e.target.checked);
      });
      box.appendChild(lab);
    }
  }
  function checkedValues(name) {
    var out = [], els = document.getElementsByName(name);
    for (var i = 0; i < els.length; i++) if (els[i].checked) out.push(els[i].value);
    return out;
  }
  function val(id) { return ($(id).value || "").trim(); }

  // ---- トークン確認（LINEから開かれたか） ----
  function getToken() {
    try { return new URLSearchParams(location.search).get("t") || ""; } catch (e) { return ""; }
  }
  var token = getToken();

  // ---- 初期化 ----
  fillSelect("f-pref", PREFS);
  // 市区町村マスタを読み込み、都道府県に応じてカスケード表示
  function populateCityReg() {
    var pref = val("f-pref");
    var sel = $("f-city"); if (!sel) return;
    var cur = sel.value;
    var cities = (COVERED_PREFS[pref] && MUNI[pref]) ? MUNI[pref] : [];
    var html = '<option value="">' + (cities.length ? "市区町村を選択" : "都道府県を先に選択") + "</option>";
    for (var i = 0; i < cities.length; i++) html += '<option value="' + cities[i] + '">' + cities[i] + "</option>";
    sel.innerHTML = html;
    sel.disabled = cities.length === 0;
    var keep = false; for (var j = 0; j < sel.options.length; j++) if (sel.options[j].value === cur) keep = true;
    sel.value = keep ? cur : "";
  }
  var pf = $("f-pref"); if (pf) pf.addEventListener("change", populateCityReg);
  fetch("data/municipalities.json", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (d) { MUNI = d || {}; populateCityReg(); }).catch(function () {});
  fillSelect("f-industry", INDUSTRIES);
  fillSelect("f-sales", SALES);
  fillSelect("f-invest", INVEST);
  fillMonths("f-fiscal");
  renderChecks("f-plans", PLANS, "plan");
  renderChecks("f-improve", IMPROVE, "improve");
  renderChecks("f-support", SUPPORT, "support");

  // プレビュー用: ローカル(localhost / file://)ではトークン無しでもフォームを表示。
  // 本番(hojokin.ai-supporters.com)はトークン必須（LINE以外からの直開きを案内画面に）。
  var isLocal = location.protocol === "file:" || location.hostname === "" ||
    /^(localhost|127\.0\.0\.1|\[?::1\]?)$/.test(location.hostname);
  if (!token && !isLocal) {
    $("rf-gate").hidden = false;
    $("rf-form").hidden = true;
  } else {
    $("rf-gate").hidden = true;
    $("rf-form").hidden = false;
  }

  // ---- 送信 ----
  function setStatus(msg, cls) {
    var s = $("rf-status"); s.textContent = msg; s.className = "rf-status" + (cls ? " " + cls : "");
  }
  $("rf-form").addEventListener("submit", function (e) {
    e.preventDefault();
    // 必須チェック（STEP1〜2の基本情報のみ必須。STEP3以降＝今後の予定/改善/希望支援/HP/投資額は任意。
    //   雇用保険加入者・前期経常利益・創業年月・決算月も任意）
    var required = [
      ["f-company", "会社名"], ["f-rep", "代表者名"], ["f-email", "メールアドレス"], ["f-tel", "電話番号"],
      ["f-zip", "郵便番号"], ["f-pref", "都道府県"], ["f-addr", "住所"], ["f-industry", "業種"], ["f-emp", "従業員数"],
      ["f-capital", "資本金"], ["f-sales", "年商"],
    ];
    for (var i = 0; i < required.length; i++) {
      if (!val(required[i][0])) { setStatus("「" + required[i][1] + "」を入力してください。", "err"); $(required[i][0]).focus(); return; }
    }
    // 市区町村は対応3府県のときだけ必須（「その他」は市区町村なしで登録可）
    if (COVERED_PREFS[val("f-pref")] && !val("f-city")) { setStatus("「市区町村」を選択してください。", "err"); $("f-city").focus(); return; }
    if (!/.+@.+\..+/.test(val("f-email"))) { setStatus("メールアドレスの形式をご確認ください。", "err"); $("f-email").focus(); return; }
    if (!$("f-consent").checked) { setStatus("プライバシーポリシーへの同意が必要です。", "err"); return; }

    var profile = {
      companyName: val("f-company"), repName: val("f-rep"), email: val("f-email"), tel: val("f-tel"),
      zip: val("f-zip"), prefecture: val("f-pref"), municipality: val("f-city"), address: val("f-addr"), industry: val("f-industry"),
      employees: val("f-emp"), employeesInsured: val("f-emp-ins"), capital: val("f-capital"),
      salesBand: val("f-sales"), prevProfit: val("f-profit"), foundedYm: val("f-founded"), fiscalMonth: val("f-fiscal"),
      plans: checkedValues("plan"), improve: checkedValues("improve"), support: checkedValues("support"),
      hp: val("f-hp"), investBand: val("f-invest"),
      referredByCode: (val("f-invite") || "").toUpperCase(), // 紹介者の招待コード（任意）
    };

    var btn = $("rf-submit");
    btn.disabled = true; setStatus("送信中…", "");
    fetch(WORKER, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ t: token, profile: profile }),
    }).then(function (r) {
      if (!r.ok) return r.text().then(function (t) { throw new Error("(" + r.status + ") " + t.slice(0, 120)); });
      return r.json();
    }).then(function (res) {
      if (res && res.inviteCode) { var el = $("rf-mycode"); if (el) el.textContent = res.inviteCode; }
      $("rf-form").hidden = true; $("rf-done").hidden = false;
      window.scrollTo({ top: 0, behavior: "smooth" });
    }).catch(function (err) {
      btn.disabled = false;
      setStatus("送信に失敗しました。時間をおいて再度お試しください。" + (err && err.message ? " " + err.message : ""), "err");
    });
  });
})();
