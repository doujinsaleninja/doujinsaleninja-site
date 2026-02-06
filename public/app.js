const yen = (n) => new Intl.NumberFormat("ja-JP").format(n);

function daysLeft(iso, lang) {
  const end = new Date(iso).getTime();
  const now = Date.now();
  if (Number.isNaN(end)) return null;
  const diff = end - now;
  const hours = diff / 3600000;

  if (hours < 0) return lang === "en" ? "Ended" : "終了";
  if (hours < 24) return lang === "en" ? `~${Math.ceil(hours)}h left` : `残り約${Math.ceil(hours)}時間`;
  return lang === "en" ? `~${Math.ceil(hours / 24)}d left` : `残り約${Math.ceil(hours / 24)}日`;
}

function pickTitle(x, lang) {
  return lang === "en" ? (x.title_en || x.title_ja || "(no title)") : (x.title_ja || x.title_en || "(no title)");
}

function renderItem(x, opts) {
  const { lang, mode } = opts; // mode: "all" | "r18only" | "safe"
  const r18 = x.rating === "r18";

  // フィルタ
  if (mode === "r18only" && !r18) return null;
  if (mode === "safe" && r18) return null;

  const left = daysLeft(x.sale_ends_at, lang);
  const discount = (x.discount_percent ?? 0);
  const points = (x.points_percent ?? 0);
  const price = (x.price_jpy ?? 0);

  const storeLabel = x.store || "-";
  const ratingLabel = r18 ? (lang === "en" ? "R-18" : "R-18") : (lang === "en" ? "All ages" : "全年齢");
  const endsLabel = lang === "en" ? "Ends" : "終了";
  const linkLabel = lang === "en" ? "Open store →" : "ストアで見る →";

  // R-18ページは「露出抑制」: タイトルを伏せたいならここで変更
  const title = (mode === "r18only")
    ? pickTitle(x, lang) // そのまま表示
    : pickTitle(x, lang);

  const el = document.createElement("div");
  el.className = "card";
  el.innerHTML = `
    <div class="row">
      <span class="badge">${storeLabel}</span>
      ${r18 ? `<span class="badge r18">R-18</span>` : `<span class="badge">${ratingLabel}</span>`}
      ${left ? `<span class="badge">${left}</span>` : ``}
    </div>
    <h3 style="margin:10px 0 6px">${title}</h3>
    <div class="kpi row">
      <span class="price">¥${yen(price)}</span>
      <span>${lang === "en" ? "Off" : "割引"} ${discount}%</span>
      <span>${lang === "en" ? "Points" : "還元"} ${points}%</span>
      <span class="muted">${endsLabel}: ${x.sale_ends_at || "-"}</span>
    </div>
    <div style="margin-top:10px">
      <a href="${x.url}" target="_blank" rel="noopener">${linkLabel}</a>
    </div>
  `;
  return el;
}

async function runApp(opts) {
  const status = document.getElementById("status");
  const list = document.getElementById("list");

  try {
    const res = await fetch("/data/sales.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`fetch failed: ${res.status} ${res.statusText}`);
    const data = await res.json();
    const items = Array.isArray(data.items) ? data.items : [];

    list.innerHTML = "";
    let shown = 0;
    for (const x of items) {
      const card = renderItem(x, opts);
      if (card) { list.appendChild(card); shown++; }
    }

    const msg = opts.lang === "en"
      ? `Loaded: ${shown} items (generated_at: ${data.generated_at || "-"})`
      : `読み込み完了：${shown}件（generated_at: ${data.generated_at || "-"})`;

    status.textContent = msg;

    if (shown === 0) {
      const empty = document.createElement("div");
      empty.className = "muted";
      empty.textContent = opts.lang === "en"
        ? "No items to show. Check data/sales.json or filters."
        : "表示できる items がありません。data/sales.json かフィルタ設定を確認してください。";
      list.appendChild(empty);
    }
  } catch (e) {
    status.textContent = opts.lang === "en" ? "Load failed" : "読み込み失敗";
    const err = document.createElement("div");
    err.className = "error";
    err.textContent = String(e);
    list.appendChild(err);
  }
}

window.DSN = { runApp };
