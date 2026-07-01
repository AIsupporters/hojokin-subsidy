/* eligibility.js — 業種×従業員規模から「補助上限帯」と「小規模/中小の該当目安」を返す。
 * 値は確定一次情報のみ（中小企業庁の定義／各補助金の公募要領で確認済の規模区分）。創作なし。
 * 不確実なもの（業種だけでは中小ラインが決まらない等）は必ず status:'要確認' で正直に返す。
 * 出力は「申請適否の助言」ではなく機械的な目安（UI側でも明記）。
 * ブラウザ: window.ELIGIBILITY / Node(テスト): module.exports の両対応（DOM非依存・純粋）。
 */
(function (root) {
  "use strict";

  // 従業員規模レンジ（主要4補助金の境界 5/20/50/100 の最大公約数）
  var SIZE_OPTIONS = [
    { id: "s1_5", label: "1〜5人（個人事業主・フリーランス含む）", max: 5 },
    { id: "s6_20", label: "6〜20人", max: 20 },
    { id: "s21_50", label: "21〜50人", max: 50 },
    { id: "s51_100", label: "51〜100人", max: 100 },
    { id: "s101", label: "101人以上", max: Infinity },
  ];

  var INDUSTRY_OPTIONS = [
    "製造・ものづくり", "IT・DX・AI", "雇用・労務・人材", "創業・起業",
    "省力化・自動化", "環境・脱炭素・省エネ", "観光・飲食・小売", "医療・介護・福祉", "農林・水産",
  ];

  // 業種大分類 → 中小企業基本法の区分（中小ライン/小規模ライン）。
  // 9大分類は「補助金テーマ軸」で法の4区分に一意に落ちないため、曖昧なものは type:'unknown'/'mixed' とし要確認に倒す。
  // small=小規模事業者の従業員上限 / mid=中小企業者の従業員上限（いずれも「以下」）。
  var LAW = {
    manufacturing: { small: 20, mid: 300 }, // 製造業・建設業・運輸業 その他
    service: { small: 5, mid: 100 },         // サービス業
    retail: { small: 5, mid: 50 },           // 小売業
    wholesale: { small: 5, mid: 100 },       // 卸売業
  };
  // 業種→法区分の対応（caveat: 推定。実際の日本標準産業分類で異なり得る）
  var INDUSTRY_LAW = {
    "製造・ものづくり": { type: "manufacturing" },
    "医療・介護・福祉": { type: "service" },
    "IT・DX・AI": { type: "service", caveat: "ソフトウェア業・情報処理サービス業はサービス業区分（中小100人）。" },
    "観光・飲食・小売": { type: "mixed", members: ["retail", "service"], caveat: "小売業（中小50人）と飲食=サービス業（中小100人）が混在。狭い側（小売）で保守的に判定。" },
    "農林・水産": { type: "unknown", caveat: "農林水産業は中小企業基本法の区分が一意でなく（直接対象外の面もあり）、補助金ごとに対象範囲が別建て。実際の業態で要確認。" },
    // 以下はテーマであって業種ではない＝法区分が一意に決まらない
    "雇用・労務・人材": { type: "unknown" },
    "創業・起業": { type: "unknown" },
    "省力化・自動化": { type: "unknown" },
    "環境・脱炭素・省エネ": { type: "unknown" },
    // 登録フォーム register.js の30分類 → 中小企業基本法の区分（推定・要確認は caveat）
    "建設・工事業": { type: "manufacturing" },
    "製造業": { type: "manufacturing" },
    "卸売業": { type: "wholesale" },
    "小売業": { type: "retail" },
    "飲食業": { type: "service", caveat: "飲食業はサービス業区分（中小は従業員100人）。" },
    "宿泊・観光業": { type: "service" },
    "運送・物流業": { type: "manufacturing", caveat: "運輸業は製造業その他の区分（中小は従業員300人）。" },
    "IT・システム開発": { type: "service", caveat: "ソフトウェア業・情報処理サービス業はサービス業区分（中小100人）。" },
    "Web制作・デザイン": { type: "service" },
    "広告・マーケティング": { type: "service" },
    "通信業": { type: "service" },
    "不動産業": { type: "service", caveat: "不動産業は業態により区分が異なる場合あり。要確認。" },
    "建物管理・清掃業": { type: "service" },
    "金融業": { type: "service", caveat: "金融・保険業は中小企業基本法の対象範囲が別建ての場合あり。要確認。" },
    "保険業": { type: "service", caveat: "金融・保険業は中小企業基本法の対象範囲が別建ての場合あり。要確認。" },
    "医療業": { type: "service" },
    "介護・福祉業": { type: "service" },
    "教育・研修業": { type: "service" },
    "士業": { type: "service" },
    "コンサルティング業": { type: "service" },
    "人材サービス業": { type: "service" },
    "美容・健康業": { type: "service" },
    "自動車関連業": { type: "service", caveat: "販売は小売、整備はサービス業。実態で要確認。" },
    "農業・林業": { type: "unknown", caveat: "農林業は中小企業基本法の区分が一意でなく、補助金ごとに対象範囲が別建て。" },
    "水産・漁業": { type: "unknown", caveat: "水産業は中小企業基本法の区分が一意でなく、補助金ごとに対象範囲が別建て。" },
    "エネルギー・環境業": { type: "manufacturing", caveat: "業態により区分が異なる。要確認。" },
    "娯楽・イベント業": { type: "service" },
    "冠婚葬祭・生活サービス業": { type: "service" },
    "貿易・輸出入業": { type: "wholesale", caveat: "商社・卸売は卸売業区分（中小100人）。" },
    "その他サービス業": { type: "service" },
  };

  // 規模で補助上限が変わる補助金（公募要領の確定値・_enrich-review.md と整合）
  // 上限は通常時／（括弧）は賃上げ特例等の引上げ後。
  var CEILING_TABLES = [
    {
      // 出典: 中小機構 shoryokuka.smrj.go.jp/ippan/（従業員規模別 通常上限／大幅賃上げ特例時の上限）
      name: "中小企業省力化投資補助金〈一般型〉",
      rate: "補助率 1/2（小規模事業者・再生事業者は 2/3）",
      note: "（特例）は大幅賃上げ要件達成時の上限。最新の公募回・要件は公式公募要領で要確認。",
      bands: { s1_5: "750万円（特例1,000万円）", s6_20: "1,500万円（特例2,000万円）", s21_50: "3,000万円（特例4,000万円）", s51_100: "5,000万円（特例6,500万円）", s101: "8,000万円（特例1億円）" },
    },
    {
      name: "中小企業新事業進出補助金",
      rate: "補助率 1/2（賃金引上げ特例で 2/3）",
      note: "（括弧）は賃上げ特例適用時の上限。回次・締切は公式公募要領で要確認。",
      bands: {
        s1_5: "2,500万円（特例3,000万円）", s6_20: "2,500万円（特例3,000万円）",
        s21_50: "4,000万円（特例5,000万円）", s51_100: "5,500万円（特例7,000万円）", s101: "7,000万円（特例9,000万円）",
      },
    },
  ];

  function sizeById(id) { for (var i = 0; i < SIZE_OPTIONS.length; i++) if (SIZE_OPTIONS[i].id === id) return SIZE_OPTIONS[i]; return null; }

  // 小規模事業者の該当目安
  function assessShoukibo(law, size) {
    if (!law || !size) return { status: "要確認", text: "業種・規模の入力が必要です。" };
    // 1〜5人は全業種で小規模（5人以下は商業・サービスの5人ライン、製造の20人ラインの双方を満たす）
    if (size.max <= 5) return { status: "該当", text: "小規模事業者に該当します（全業種で従業員5人以下）。" };
    // 21人以上は業種に関わらず小規模ではない（小規模ラインは最大でも20人＝製造業その他）
    if (size.max > 20) return { status: "非該当", text: "従業員21人以上は小規模事業者ではありません（中小企業向けが中心）。" };
    // ここから 6〜20人帯のみ（業種で割れる）
    if (law.type === "unknown") return { status: "要確認", text: "選んだ区分は業種が一意に定まらないため、小規模該当（製造業等は20人以下／商業・サービスは5人以下）は実際の業種で判定が必要です。" };
    if (law.type === "mixed") return { status: "要確認", text: "小売業・飲食(サービス業)は従業員5人超で小規模対象外。製造業等なら20人以下まで小規模。実際の業種で判定。" };
    var small = LAW[law.type].small;
    if (small >= 20) return { status: "該当", text: "製造業・建設業・運輸業など（従業員20人以下）は小規模事業者に該当します。" };
    return { status: "非該当", text: "商業・サービス業（小規模ライン5人以下）は従業員6人以上で対象外です。" };
  }

  // 中小企業者の該当目安（上位帯は業種別ライン＋資本金で確定するため要確認に倒す）
  function assessChusho(law, size, industry) {
    if (!law || !size) return { status: "要確認", text: "業種・規模の入力が必要です。" };
    if (law.type === "unknown") return { status: "要確認", text: "業種が一意に定まらないため、中小該当は実際の業種・資本金で判定が必要です。" };
    if (size.max <= 50) return { status: "該当の可能性が高い", text: "従業員50人以下は多くの場合 中小企業者に該当します。中小判定は資本金または従業員数のいずれかで、資本金が業種上限（製造業3億・卸売1億・小売/サービス5千万円）超なら非該当＝資本金で要確認。" };
    if (law.type === "mixed") return { status: "要確認", text: "小売業は従業員50人超で中小ラインを超えます（飲食=サービス業は100人）。資本金または実際の業種で判定。" };
    var mid = LAW[law.type].mid;
    if (size.max <= mid) return { status: "該当の可能性が高い", text: "選んだ業種区分の中小ライン（" + mid + "人）以内です（資本金要件は別途）。" };
    // 101人以上で製造業(300)等はレンジ内に中小/非中小が混在
    if (size.id === "s101" && mid >= 300) return { status: "要確認", text: "製造業等は300人以下なら中小ですが、101人以上のレンジでは実数（〜300/301〜）と資本金で確定判定が必要です。" };
    return { status: "要確認", text: "中小ライン（" + mid + "人）を超える可能性があります。資本金（または実際の従業員数）で確定判定してください。" };
  }

  function ceilingsFor(sizeId) {
    return CEILING_TABLES.map(function (t) {
      return { name: t.name, band: t.bands[sizeId] || "—", rate: t.rate, note: t.note };
    });
  }

  // 小規模ゲートの補助金（規模では変わらないが小規模該当が条件）
  function gatedFor(shoukiboStatus) {
    if (shoukiboStatus === "該当" || shoukiboStatus === "要確認") {
      return [{
        name: "小規模事業者持続化補助金",
        note: "小規模事業者が対象。一般型〈通常枠〉上限50万円（インボイス特例+50万・賃金引上げ特例+150万で最大250万円／賃金引上げ特例の赤字事業者は補助率3/4）。創業型 上限200万円・補助率2/3（インボイス特例+50万で最大250万円）。",
      }];
    }
    return [];
  }

  function assess(industry, sizeId) {
    var size = sizeById(sizeId);
    var ind = INDUSTRY_LAW[industry] || null;
    var law = ind ? (ind.type === "mixed" ? { type: "mixed", caveat: ind.caveat } : { type: ind.type, caveat: ind.caveat }) : null;
    var shoukibo = assessShoukibo(law, size);
    var chusho = assessChusho(law, size, industry);
    var caveats = [];
    if (ind && ind.caveat) caveats.push(ind.caveat);
    caveats.push("規模はレンジ選択のため、境界付近（特に6〜20人）は実際の従業員数で結論が変わる場合があります。");
    caveats.push("補助上限・補助率・締切・対象要件は必ず各制度の公式公募要領でご確認ください。表示は機械的な目安で、申請の可否・採択を保証しません。");
    return {
      industry: industry || null,
      size: size ? size.label : null,
      shoukibo: shoukibo,
      chusho: chusho,
      ceilings: size ? ceilingsFor(size.id) : [],
      gated: gatedFor(shoukibo.status),
      caveats: caveats,
    };
  }

  var api = { SIZE_OPTIONS: SIZE_OPTIONS, INDUSTRY_OPTIONS: INDUSTRY_OPTIONS, assess: assess, sizeById: sizeById };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.ELIGIBILITY = api;
})(typeof window !== "undefined" ? window : null);
