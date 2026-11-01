window.__ModuleLoader__.load({
	id: "@local/usage-overview",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		const react = require("react");
		const primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		const h = react.createElement;

		/** Host route serving the aggregated Platform usage. */
		const ROUTE = "/usage-overview/summary";

		/** Only the Platform usage destination is taken over; /top_up and / stay native. */
		const USAGE_HOSTS = new Set(["platform.deepseek.com"]);

		/**
		 * The shared Modal is `width: min(380px, 100%)` with `overflow: hidden`, so a
		 * wider panel would be clipped. These class names are ours and double up on
		 * the selector so they outrank that single-class default without
		 * `!important`; the content scrolls so a short window cannot clip either.
		 */
		const MODAL_CLASS = "dsh-usage-overview-modal";
		const CONTENT_CLASS = "dsh-usage-overview-content";
		const STYLE_ID = "dsh-usage-overview-style";

		/*
		 * A soft, quiet system: each block is one rounded rectangle (20px), and
		 * surfaces are steps in lightness — no 1px frames, no shadows, no
		 * gradients. Colour is confined to the data: the last seven days of the
		 * chart carry the one hue, everything else is ink on stepped greys.
		 * Every colour is mixed from the host ink and ground, so the panel follows
		 * the app's light and dark themes without a switch here.
		 */
		const STYLE_TEXT =
			`.${MODAL_CLASS}.${MODAL_CLASS}{width:min(1000px,100%);max-height:100%;}` +
			`.${CONTENT_CLASS}.${CONTENT_CLASS}{min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:0;}` +
			`@supports (height:100dvh){.${MODAL_CLASS}.${MODAL_CLASS}{max-height:calc(100dvh - 48px);}}` +
			[
				".uo-root{--uo-ink:var(--dsw-alias-label-primary,#f5f5f7);" +
					"--uo-muted:var(--dsw-alias-label-secondary,#b8b8bd);" +
					"--uo-faint:color-mix(in srgb,var(--dsw-alias-label-tertiary,#a8a8ae) 86%,var(--dsw-alias-label-primary,#f5f5f7));" +
					"--uo-ground:var(--dsw-alias-bg-layer-1,#1c1c1e);" +
					"--uo-card:color-mix(in srgb,var(--uo-ink) 7%,var(--uo-ground));" +
					"--uo-nested:color-mix(in srgb,var(--uo-ink) 8%,var(--uo-card));" +
					"--uo-hover:color-mix(in srgb,var(--uo-ink) 6%,transparent);" +
					"--uo-rule:color-mix(in srgb,var(--uo-ink) 9%,transparent);" +
					"--uo-accent:#4d6bfe;--uo-heat:#4d6bfe;" +
					"--uo-bar:color-mix(in srgb,var(--uo-ink) 18%,transparent);" +
					"--uo-bar-hover:color-mix(in srgb,var(--uo-ink) 30%,transparent);" +
					"--uo-r-card:20px;--uo-r-control:10px;" +
					"color:var(--uo-ink);font-family:inherit;font-size:13px;line-height:1.45;" +
					"padding:12px 24px 24px;box-sizing:border-box;-webkit-font-smoothing:antialiased;}" +
				".uo-root *{box-sizing:border-box;}" +
				".uo-num{font-variant-numeric:tabular-nums;}" +
				/* ---- hero: the balance, nothing competing with it ---- */
				".uo-hero{background:var(--uo-card);border-radius:var(--uo-r-card);padding:14px 20px;" +
					"display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;}" +
				".uo-hero-label{display:block;font-size:13px;color:var(--uo-muted);}" +
				".uo-hero-value{display:flex;align-items:baseline;gap:8px;margin-top:6px;font-size:32px;" +
					"font-weight:600;letter-spacing:-.03em;line-height:1.1;font-variant-numeric:tabular-nums;overflow-wrap:anywhere;}" +
				".uo-hero-unit{font-size:12px;font-weight:400;color:var(--uo-faint);letter-spacing:0;}" +
				".uo-hero-meta{font-size:12px;color:var(--uo-faint);}" +
				/* ---- three peer tiles: same radius, one gap, no icons ---- */
				".uo-tiles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:14px;}" +
				".uo-tile{background:var(--uo-card);border-radius:var(--uo-r-card);padding:10px 18px;min-width:0;}" +
				".uo-tile-label{display:block;font-size:13px;color:var(--uo-muted);}" +
				".uo-tile-sub{display:block;margin-top:4px;font-size:12px;color:var(--uo-faint);}" +
				".uo-tile-value{display:flex;align-items:baseline;gap:6px;margin-top:4px;font-size:21px;font-weight:600;" +
					"letter-spacing:-.025em;font-variant-numeric:tabular-nums;overflow-wrap:anywhere;}" +
				/* ---- cards ---- */
				".uo-card{background:var(--uo-card);border-radius:var(--uo-r-card);padding:14px 20px;margin-top:12px;}" +
				".uo-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px 16px;flex-wrap:wrap;}" +
				".uo-card-title{margin:0;font-size:15px;font-weight:600;letter-spacing:-.01em;}" +
				".uo-card-meta{margin:3px 0 0;font-size:12px;color:var(--uo-faint);}" +
				".uo-controls{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}" +
				/* segmented control: a track one step above the card, the choice lifted */
				".uo-picker{position:relative;display:inline-flex;align-items:center;}" +
				".uo-pill.uo-picker-trigger{padding:0 26px 0 12px;cursor:pointer;border:0;font:inherit;font-size:12px;font-weight:500;color:var(--uo-ink);height:32px;}" +
				".uo-picker-trigger:disabled{opacity:.55;cursor:default;}" +
				".uo-picker-pop{position:absolute;top:calc(100% + 6px);right:0;z-index:20;min-width:232px;padding:10px;" +
					"background:var(--uo-card);border-radius:14px;box-shadow:0 12px 32px rgba(0,0,0,.32);}" +
				".uo-picker-year{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;font-size:12px;color:var(--uo-muted);}" +
				".uo-icon-btn{width:26px;height:26px;border:0;background:transparent;color:var(--uo-muted);border-radius:8px;cursor:pointer;font-size:15px;line-height:1;}" +
				".uo-icon-btn:hover{background:var(--uo-hover);color:var(--uo-ink);}" +
				".uo-picker-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;}" +
				".uo-picker-month{border:0;background:transparent;color:var(--uo-ink);font:inherit;font-size:12px;height:30px;border-radius:8px;cursor:pointer;}" +
				".uo-picker-month:hover{background:var(--uo-hover);}" +
				".uo-picker-month.uo-selected{background:var(--uo-heat);color:#fff;}" +
				".uo-picker-month:disabled{opacity:.35;cursor:default;}" +
				".uo-pill.uo-select-trigger{padding:0 26px 0 10px;cursor:pointer;border:0;font:inherit;font-size:12px;font-weight:500;color:var(--uo-ink);height:32px;gap:6px;}" +
				".uo-select-prefix{color:var(--uo-muted);font-weight:400;}" +
				".uo-select-pop{min-width:190px;padding:6px;}" +
				".uo-option{display:flex;width:100%;border:0;background:transparent;color:var(--uo-ink);font:inherit;font-size:12px;" +
					"text-align:left;height:30px;padding:0 10px;border-radius:8px;cursor:pointer;align-items:center;}" +
				".uo-option:hover{background:var(--uo-hover);}" +
				".uo-option.uo-selected{background:var(--uo-heat);color:#fff;}" +
".uo-day-pop{position:absolute;z-index:30;padding:10px 12px;background:var(--uo-card);border-radius:12px;" +
					"box-shadow:0 14px 36px rgba(0,0,0,.38);border:1px solid color-mix(in srgb,var(--uo-ink) 10%,transparent);}" +
				".uo-day-pop-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px;font-size:12px;font-weight:600;}" +
				".uo-day-pop-close{border:0;background:transparent;color:var(--uo-muted);width:22px;height:22px;border-radius:6px;cursor:pointer;display:grid;place-items:center;}" +
				".uo-day-pop-close:hover{background:var(--uo-hover);color:var(--uo-ink);}" +
				".uo-day-pop-row{display:flex;align-items:baseline;justify-content:space-between;gap:16px;padding:3px 0;font-size:12px;color:var(--uo-muted);}" +
				".uo-day-pop-row b{font-size:13px;font-weight:600;color:var(--uo-ink);font-variant-numeric:tabular-nums;}" +
				".uo-month-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px;margin-top:8px;}" +
				".uo-month-cell{min-height:52px;}" +
				".uo-month-cell .uo-cal-day{font-size:11px;}" +
".uo-collapse{display:inline-flex;align-items:center;gap:6px;border:0;background:transparent;color:var(--uo-muted);" +
					"font:inherit;font-size:12px;height:28px;padding:0 8px;border-radius:8px;cursor:pointer;}" +
				".uo-collapse:hover{background:var(--uo-hover);color:var(--uo-ink);}" +
				".uo-chevron{display:inline-block;width:6px;height:6px;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;" +
					"transform:rotate(45deg);margin-top:-3px;transition:transform .15s ease;}" +
				".uo-chevron.uo-up{transform:rotate(-135deg);margin-top:3px;}" +
				".uo-segmented button{border:0;background:transparent;color:var(--uo-muted);font:inherit;font-size:12px;" +
					"line-height:1;font-weight:500;height:26px;padding:0 12px;border-radius:8px;cursor:pointer;white-space:nowrap;}" +
				".uo-segmented button:hover{color:var(--uo-ink);}" +
				".uo-segmented button[aria-pressed=true]{background:color-mix(in srgb,var(--uo-ink) 16%,var(--uo-card));color:var(--uo-ink);}" +
				".uo-segmented button:focus-visible{outline:2px solid var(--uo-accent);outline-offset:1px;}" +
				".uo-pill{position:relative;display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 10px;" +
					"border-radius:var(--uo-r-control);background:var(--uo-nested);color:var(--uo-muted);font-size:12px;}" +
				".uo-pill::after{content:\"\";position:absolute;right:11px;top:50%;width:6px;height:6px;margin-top:-4px;" +
					"border-right:1.5px solid var(--uo-muted);border-bottom:1.5px solid var(--uo-muted);" +
					"transform:rotate(45deg);pointer-events:none;}" +
				".uo-pill select{appearance:none;border:0;background:transparent;color:var(--uo-ink);font:inherit;font-size:12px;" +
					"font-weight:500;height:100%;cursor:pointer;padding:0 18px 0 0;}" +
				".uo-pill select:focus-visible{outline:2px solid var(--uo-accent);outline-offset:1px;}" +
				".uo-text-btn{border:0;background:transparent;color:var(--uo-muted);font:inherit;font-size:12px;font-weight:500;" +
					"height:32px;padding:0 10px;border-radius:var(--uo-r-control);cursor:pointer;}" +
				".uo-text-btn:hover{background:var(--uo-hover);color:var(--uo-ink);}" +
				".uo-text-btn:disabled{opacity:.5;cursor:default;}" +
				".uo-text-btn:focus-visible{outline:2px solid var(--uo-accent);outline-offset:1px;}" +
				/* ---- daily: a month grid where the fill is the spend ---- */
				".uo-daily{position:relative;margin-top:14px;}" +
				".uo-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));background:var(--uo-nested);border-radius:10px;padding:4px 2px;}" +
				".uo-stat{padding:1px 12px;min-width:0;}" +
				
				".uo-stat-label{display:block;font-size:11px;color:var(--uo-faint);}" +
				".uo-stat-value{display:flex;align-items:baseline;gap:6px;margin-top:1px;font-size:16px;font-weight:600;" +
					"letter-spacing:-.02em;font-variant-numeric:tabular-nums;overflow-wrap:anywhere;}" +
				".uo-stat-unit{font-size:12px;font-weight:400;color:var(--uo-faint);letter-spacing:0;}" +
				".uo-cal-legend{display:flex;align-items:center;gap:5px;flex-wrap:wrap;justify-content:flex-end;" +
					"margin:6px 0 4px;font-size:11px;color:var(--uo-faint);}" +
				".uo-swatch{width:8px;height:8px;border-radius:2px;background:color-mix(in srgb,var(--uo-ink) 8%,transparent);}" +
				".uo-swatch.uo-l1{background:color-mix(in srgb,var(--uo-heat) 18%,transparent);}" +
				".uo-swatch.uo-l2{background:color-mix(in srgb,var(--uo-heat) 32%,transparent);}" +
				".uo-swatch.uo-l3{background:color-mix(in srgb,var(--uo-heat) 48%,transparent);}" +
				".uo-swatch.uo-l4{background:color-mix(in srgb,var(--uo-heat) 64%,transparent);}" +
				".uo-ring{width:10px;height:10px;border-radius:3px;outline:1.5px solid color-mix(in srgb,var(--uo-ink) 90%,transparent);outline-offset:-1.5px;margin-left:8px;}" +
				".uo-cal-head{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:3px;margin-bottom:3px;}" +
				".uo-cal-head span{font-size:11px;color:var(--uo-faint);text-align:center;}" +
				".uo-cal-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:3px;}" +
				".uo-cal-cell{position:relative;min-height:36px;border-radius:9px;padding:3px 8px 4px;border:0;font:inherit;color:inherit;" +
					"text-align:left;cursor:pointer;appearance:none;-webkit-appearance:none;" +
					"display:flex;flex-direction:column;justify-content:space-between;gap:4px;" +
					"background:color-mix(in srgb,var(--uo-ink) 6%,transparent);}" +
				".uo-cal-cell.uo-l1{background:color-mix(in srgb,var(--uo-heat) 18%,transparent);}" +
				".uo-cal-cell.uo-l2{background:color-mix(in srgb,var(--uo-heat) 32%,transparent);}" +
				".uo-cal-cell.uo-l3{background:color-mix(in srgb,var(--uo-heat) 48%,transparent);}" +
				".uo-cal-cell.uo-l4{background:color-mix(in srgb,var(--uo-heat) 64%,transparent);}" +
				".uo-cal-cell.uo-today{outline:1.5px solid color-mix(in srgb,var(--uo-ink) 90%,transparent);outline-offset:-1.5px;}" +
				".uo-cal-blank{background:transparent;cursor:default;}" +
				".uo-cal-cell:disabled{cursor:default;}" +
				".uo-cal-future{opacity:.45;}" +
				".uo-cal-day{font-size:11px;color:var(--uo-faint);font-variant-numeric:tabular-nums;line-height:1;}" +
				".uo-cal-body{display:flex;align-items:baseline;justify-content:space-between;gap:8px;min-width:0;}" +
				".uo-cal-amount{font-size:13px;font-weight:600;font-variant-numeric:tabular-nums;letter-spacing:-.01em;white-space:nowrap;}" +
				".uo-cal-tokens{font-size:11px;color:color-mix(in srgb,var(--uo-ink) 78%,transparent);font-variant-numeric:tabular-nums;white-space:nowrap;" +
					"overflow:hidden;text-overflow:ellipsis;}" +
				".uo-cal-quiet .uo-cal-amount,.uo-cal-quiet .uo-cal-tokens{color:var(--uo-faint);font-weight:400;}" +
				".uo-daily-notes{display:flex;justify-content:space-between;gap:8px 16px;flex-wrap:wrap;" +
					"margin-top:8px;font-size:11px;color:var(--uo-faint);}" +
				/* ---- table: hairlines, alignment, no header band, no zebra ---- */
				".uo-table-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:6px;}" +
				".uo-table-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end;}" +
				".uo-root table{width:100%;border-collapse:collapse;}" +
				".uo-root thead th{text-align:left;font-size:12px;font-weight:400;color:var(--uo-faint);" +
					"padding:8px;border-bottom:1px solid var(--uo-rule);}" +
				".uo-root thead th.uo-num,.uo-root tbody td.uo-num,.uo-root tfoot td.uo-num{text-align:right;}" +
				".uo-root tbody td{padding:9px 8px;font-size:13px;border-top:1px solid var(--uo-rule);font-variant-numeric:tabular-nums;}" +
				".uo-root tbody tr:first-child td{border-top:0;}" +
				".uo-root tbody tr:hover td{background:var(--uo-hover);}" +
				".uo-root tbody tr:hover td:first-child{border-radius:10px 0 0 10px;}" +
				".uo-root tbody tr:hover td:last-child{border-radius:0 10px 10px 0;}" +
				".uo-date-tag{color:var(--uo-faint);font-size:12px;margin-left:6px;}" +
				".uo-month-share{display:block;margin-top:2px;font-size:12px;font-weight:400;color:var(--uo-faint);}" +
				".uo-root tfoot td{padding:12px 8px;font-size:14px;font-weight:600;border-top:1px solid var(--uo-rule);" +
					"font-variant-numeric:tabular-nums;}" +
				/* ---- states: a sentence inside the block that failed, a frame kept ---- */
				".uo-state{display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;" +
					"min-height:140px;color:var(--uo-muted);font-size:13px;text-align:center;}" +
				".uo-state button{border:0;background:var(--uo-nested);color:var(--uo-ink);font:inherit;font-size:12px;" +
					"font-weight:500;height:30px;padding:0 14px;border-radius:var(--uo-r-control);cursor:pointer;}" +
				".uo-empty{padding:28px 8px;text-align:center;color:var(--uo-muted);font-size:13px;}" +
				".uo-skeleton{display:block;background:color-mix(in srgb,var(--uo-ink) 10%,transparent);border-radius:6px;}" +
				".uo-skel-value{width:52%;height:28px;margin-top:10px;border-radius:8px;}" +
				".uo-skel-tile{width:60%;height:20px;margin-top:8px;border-radius:6px;}" +
				".uo-skel-chart{height:236px;margin:16px 0 0 46px;border-radius:10px;opacity:.7;}" +
				/* ---- phone: hero full width, tiles stack, table becomes two-line rows ---- */
				"@media (max-width:720px){.uo-month{order:0;}" +
					".uo-root{padding:10px 18px 18px;}" +
					".uo-hero{padding:18px;}.uo-hero-value{font-size:30px;}" +
					".uo-tiles{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;}.uo-tiles .uo-tile:last-child{grid-column:1 / -1;}" +
					".uo-tile{padding:14px 16px;border-radius:18px;}" +
					".uo-card{padding:16px;border-radius:18px;}" +
					".uo-card-head{flex-direction:column;align-items:stretch;}" +
					".uo-controls{width:100%;}.uo-segmented{flex:1 1 auto;}.uo-segmented button{flex:1 1 auto;padding:0 6px;}" +
					".uo-pill{flex:1 1 auto;justify-content:space-between;}" +
					".uo-stats{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 0;padding:10px 2px;}" +
					".uo-stat:nth-child(3){border-left:0;}" +
					".uo-cal-head,.uo-cal-grid{gap:4px;}" +
					".uo-month-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;}" +
					".uo-month-cell{min-height:46px;}" +
					".uo-cal-cell{min-height:48px;border-radius:8px;padding:5px 6px;}" +
					".uo-cal-tokens{display:none;}" +
					".uo-cal-amount{font-size:12px;}" +
					".uo-skel-chart{height:180px;margin-left:46px;}.uo-skel-table{height:132px;margin-top:14px;border-radius:8px;opacity:.7;}" +
					".uo-root thead{display:none;}.uo-root table,.uo-root tbody,.uo-root tfoot,.uo-root tr{display:block;}" +
					".uo-root tbody tr{display:grid;grid-template-columns:1fr auto;gap:2px 12px;padding:11px 2px;border-top:1px solid var(--uo-rule);}" +
					".uo-root tbody tr:first-child{border-top:0;}.uo-root tbody td{border:0;padding:0;font-size:14px;}" +
					".uo-root tbody td.uo-num{text-align:right;}.uo-root tbody tr:hover td{background:transparent;}" +
					".uo-date{order:0;}.uo-cost{order:1;font-weight:500;}" +
					".uo-req{order:2;color:var(--uo-faint);font-size:13px;}.uo-tok{order:3;color:var(--uo-faint);font-size:13px;text-align:right;}" +
					".uo-req::before{content:attr(data-label) \" \";}.uo-tok::before{content:attr(data-label) \" \";}" +
					".uo-root tfoot tr{display:flex;justify-content:space-between;gap:12px;}.uo-root tfoot td{padding:12px 2px;font-size:14px;}" +
					".uo-root tfoot td:not(:first-child){display:none;}}"
			].join("");

		function installStyles() {
			const root = globalThis.document;
			if (root === undefined || typeof root.createElement !== "function" || root.head === undefined) {
				return () => {};
			}
			const existing = typeof root.getElementById === "function" ? root.getElementById(STYLE_ID) : null;
			if (existing !== null && existing !== undefined) existing.remove();
			const element = root.createElement("style");
			element.id = STYLE_ID;
			element.textContent = STYLE_TEXT;
			root.head.appendChild(element);
			return () => {
				element.remove();
			};
		}

		/** `YYYY-MM` of today, in the local zone. */
		function currentMonthKey() {
			const now = new Date();
			// taste-skill-ignore: a month key, not an index number
			return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
		}

		const ZH = {
			title: "用量总览",
			account: "账户余额",
			scope: "全部 API Key",
			since: "累计自 {date} 起",
			lifetime: "累计消费",
			lifetimeTokens: "累计 Tokens",
			lifetimeRequests: "累计 API 请求",
			daily: "每日消耗",
			dailySub: "数据来自开放平台，约 5 分钟延迟",
			recent: "近 7 天",
			earlier: "更早",
			chartLabel: "每日消费金额，{from} 至 {to}，最高 {max}",
			monthly: "每月消耗",
			monthlyMeta: "按月汇总 · 共 {n} 个月",
			month: "月份",
			thisMonth: "本月",
			expand: "展开",
			collapse: "收起",
			monthlyTotal: "合计",
			monthlyUnavailable: "暂时拿不到按月数据",
			monthlyEmpty: "暂无按月数据",
			periodSpend: "当月花费",
			dailyAverage: "日均",
			peakDay: "最高单日",
			totalTokens: "Token 合计",
			heatLegend: "颜色越深 = 花费越高",
			peakSpend: "花费最高",
			peakTokens: "Token 最多",
			tilesMonths: "跨 {n} 个计费月",
			tilesTokens: "输入 + 输出合计",
			tilesRequests: "日均约 {n} 次",
			monthShare: "占累计 {n}%",
			pickMonth: "选择月份",
			prevYear: "上一年",
			nextYear: "下一年",
			dayDetail: "当天明细",
			date: "日期",
			today: "今天",
			requests: "API 请求",
			tokens: "Tokens",
			cost: "消费金额",
			total: "合计",
			keyLabel: "API Key",
			allKeys: "全部 API Key",
			export: "导出",
			loading: "正在读取平台用量…",
			empty: "该时间段暂无用量",
			refresh: "刷新",
			retry: "重试",
			close: "关闭",
			signedOut: "账号授权已失效，请重新登录后再查看",
			forbidden: "请求被拒绝",
			failed: "读取失败"
		};

		const EN = {
			title: "Usage overview",
			account: "Balance",
			scope: "All API keys",
			since: "since {date}",
			lifetime: "Total spend",
			lifetimeTokens: "All-time tokens",
			lifetimeRequests: "All-time API requests",
			daily: "Daily spend",
			dailySub: "From the Platform API; data can lag by about 5 minutes",
			recent: "Last 7 days",
			earlier: "Earlier",
			chartLabel: "Daily spend, {from} to {to}, highest {max}",
			monthly: "Monthly spend",
			monthlyMeta: "By month · {n} months",
			month: "Month",
			thisMonth: "This month",
			expand: "Show",
			collapse: "Hide",
			monthlyTotal: "Total",
			monthlyUnavailable: "Monthly data is unavailable",
			monthlyEmpty: "No monthly data yet",
			periodSpend: "This month",
			dailyAverage: "Daily average",
			peakDay: "Peak day",
			totalTokens: "Total tokens",
			heatLegend: "Darker = higher spend",
			peakSpend: "Peak spend",
			peakTokens: "Most tokens",
			tilesMonths: "Across {n} billing months",
			tilesTokens: "Input + output",
			tilesRequests: "About {n} per day",
			monthShare: "{n}% of total",
			pickMonth: "Pick a month",
			prevYear: "Previous year",
			nextYear: "Next year",
			dayDetail: "Day detail",
			date: "Date",
			today: "Today",
			requests: "API requests",
			tokens: "Tokens",
			cost: "Spend",
			total: "Total",
			keyLabel: "API key",
			allKeys: "All API keys",
			export: "Export",
			loading: "Reading Platform usage…",
			empty: "No usage in this period",
			refresh: "Refresh",
			retry: "Retry",
			close: "Close",
			signedOut: "The account authorization expired — sign in again",
			forbidden: "Request rejected",
			failed: "Could not read usage"
		};

		const zhLocale = String(globalThis.navigator?.language ?? "").toLowerCase().startsWith("zh");
		const text = zhLocale ? ZH : EN;

		// ---- open/close store -------------------------------------------------
		let opened = false;
		const listeners = new Set();

		function setOpened(next) {
			if (opened === next) return;
			opened = next;
			for (const listener of [...listeners]) listener();
		}

		function useOpened() {
			const [local, setLocal] = react.useState(opened);
			react.useEffect(() => {
				const listener = () => setLocal(opened);
				listeners.add(listener);
				listener();
				return () => {
					listeners.delete(listener);
				};
			}, []);
			return local;
		}

		// ---- formatting -------------------------------------------------------
		function integer(value) {
			const n = Number(value ?? 0);
			return Number.isFinite(n) ? n : 0;
		}

		function grouped(value) {
			return integer(value).toLocaleString("en-US");
		}

		function amountOf(list) {
			if (!Array.isArray(list)) return 0;
			return list.reduce((sum, entry) => sum + Number(entry?.amount ?? 0), 0);
		}

		function currencySymbol(currency) {
			return currency === "CNY" ? "¥" : currency === "USD" ? "$" : `${String(currency ?? "")} `;
		}

		function moneyOne(list) {
			if (!Array.isArray(list) || list.length === 0) return "—";
			const first = list[0];
			return `${currencySymbol(first.currency)}${Number(first.amount ?? 0).toFixed(2)}`;
		}

		function moneyCurrency(list) {
			if (!Array.isArray(list) || list.length === 0) return "";
			return String(list[0].currency ?? "");
		}

		function moneyAll(list) {
			if (!Array.isArray(list) || list.length === 0) return "—";
			return list
				.map((entry) => `${currencySymbol(entry.currency)}${Number(entry.amount ?? 0).toFixed(2)}`)
				.join(" · ");
		}

		/** 2026-10-30 → 10/30 */
		function shortDate(date) {
			const value = String(date ?? "");
			return value.length >= 10 ? `${value.slice(5, 7)}/${value.slice(8, 10)}` : value;
		}

		/** 348920 → 34.9万 (zh) / 348.9K (en); the bar is thin, so one decimal is the point. */
		function compactTokens(value) {
			const n = integer(value);
			if (zhLocale && n >= 100000000) return `${(n / 100000000).toFixed(1)}亿`;
			if (zhLocale && n >= 10000) return `${(n / 10000).toFixed(1)}万`;
			if (!zhLocale && n >= 1000000000) return `${(n / 1000000000).toFixed(1)}B`;
			if (!zhLocale && n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
			if (!zhLocale && n >= 1000) return `${(n / 1000).toFixed(1)}K`;
			return grouped(n);
		}

		/** Round ticks whose top sits above the largest value, four steps. */
		function tickValues(max, count = 4) {
			const top = Number.isFinite(max) && max > 0 ? max : 1;
			const raw = top / count;
			const mag = 10 ** Math.floor(Math.log10(raw));
			const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || 10 * mag;
			const out = [];
			for (let v = 0; v <= top + step / 2; v += step) out.push(Number(v.toFixed(10)));
			const ceiling = out[out.length - 1];
			if (ceiling < top) out.push(Number((ceiling + step).toFixed(10)));
			return out;
		}

		function tickLabel(value, ceiling, currency) {
			const symbol = currency === "USD" ? "$" : "¥";
			if (value === 0) return `${symbol}0`;
			return ceiling < 10 ? `${symbol}${value.toFixed(1)}` : `${symbol}${Math.round(value)}`;
		}

		function exportCsv(data, range, keyId) {
			const rows = [[text.date, text.requests, text.tokens, text.cost]];
			for (const day of data?.daily ?? []) {
				rows.push([
					day.date,
					String(integer(day.requests)),
					String(integer(day.tokens)),
					amountOf(day.cost).toFixed(6)
				]);
			}
			rows.push([text.total, String(integer(totals.requests)), String(integer(totals.tokens)), amountOf(data?.cost).toFixed(6)]);
			const csv = rows
				.map((row) => row.map((cell) => (/[",\r\n]/.test(cell) ? `"${cell.split('"').join('""')}"` : cell)).join(","))
				.join("\r\n");
			const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
			const url = URL.createObjectURL(blob);
			const anchor = document.createElement("a");
			anchor.href = url;
			anchor.download = `usage-${range}${keyId === "" ? "" : "-" + keyId.slice(0, 8)}.csv`;
			document.body.appendChild(anchor);
			anchor.click();
			anchor.remove();
			setTimeout(() => URL.revokeObjectURL(url), 1000);
		}

		// ---- components -------------------------------------------------------
		function errorMessage(status, payload) {
			const code = typeof payload?.error === "string" ? payload.error : "";
			if (status === 401 || code === "signed-out") return text.signedOut;
			if (status === 403 || code === "forbidden") return text.forbidden;
			const detail = typeof payload?.message === "string" && payload.message !== "" ? ` (${payload.message})` : "";
			return `${text.failed}${detail}`;
		}

		function Skeleton(props) {
			return h("div", { className: props.className ?? "uo-skeleton" });
		}

		function Hero(props) {
			const ready = props.data !== undefined;
			return h("section", { className: "uo-hero" }, [
				h("div", { key: "left" }, [
					h("span", { key: "l", className: "uo-hero-label" }, text.account),
					ready
						? h("div", { key: "v", className: "uo-hero-value" }, [
							h("span", { key: "n" }, moneyOne(props.data.balance)),
							h("span", { key: "u", className: "uo-hero-unit" }, moneyCurrency(props.data.balance))
						])
						: h("span", { key: "s", className: "uo-skeleton uo-skel-value" })
				]),
				ready
					? h("div", { key: "m", className: "uo-hero-meta" }, [
						text.scope,
						props.since === "" ? "" : ` · ${text.since.replace("{date}", props.since)}`
					].join(""))
					: null
			]);
		}

		function Tile(props) {
			return h("div", { className: "uo-tile" }, [
				h("span", { key: "l", className: "uo-tile-label" }, props.label),
				props.placeholder === true
					? h("span", { key: "s", className: "uo-skeleton uo-skel-tile" })
					: h("div", { key: "v", className: "uo-tile-value" }, props.value),
				props.sub === undefined ? null : h("span", { key: "b", className: "uo-tile-sub" }, props.sub)
			]);
		}

		/** One series, four hairlines, no axis chrome: the last seven days carry the hue. */
		/** Close a popover on an outside click or Escape. */
		function useDismiss(open, ref, close) {
			react.useEffect(() => {
				if (!open) return undefined;
				const onDown = (event) => {
					if (ref.current !== null && !ref.current.contains(event.target)) close();
				};
				const onKey = (event) => {
					if (event.key === "Escape") close();
				};
				document.addEventListener("mousedown", onDown);
				document.addEventListener("keydown", onKey);
				return () => {
					document.removeEventListener("mousedown", onDown);
					document.removeEventListener("keydown", onKey);
				};
			}, [open, ref, close]);
		}

		/** A month grid in a popover: the same gesture as a calendar's month view. */
		function MonthPicker(props) {
			const [open, setOpen] = react.useState(false);
			const [year, setYear] = react.useState(Number(String(props.value).slice(0, 4)));
			const wrap = react.useRef(null);

			react.useEffect(() => {
				setYear(Number(String(props.value).slice(0, 4)));
			}, [props.value]);

			useDismiss(open, wrap, () => { setOpen(false); });

			const min = props.min ?? "";
			const max = props.max ?? currentMonthKey();
			const minYear = min === "" ? year : Number(min.slice(0, 4));
			const maxYear = Number(max.slice(0, 4));
			const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);

			const trigger = h("button", {
				key: "trigger",
				type: "button",
				className: "uo-pill uo-picker-trigger",
				"aria-haspopup": "dialog",
				"aria-expanded": open,
				"aria-label": `${text.pickMonth} ${monthLabel(props.value)}`,
				disabled: props.disabled === true,
				onClick: () => { setOpen((value) => !value); }
			}, monthLabel(props.value));

			if (!open) {
				return h("div", { className: "uo-picker", ref: wrap }, trigger);
			}

			const pop = h("div", { key: "pop", className: "uo-picker-pop", role: "dialog", "aria-label": text.pickMonth }, [
				h("div", { key: "year", className: "uo-picker-year" }, [
					h("button", { key: "p", type: "button", className: "uo-icon-btn", "aria-label": text.prevYear, disabled: year <= minYear, onClick: () => { setYear((value) => value - 1); } }, "‹"),
					h("span", { key: "l" }, zhLocale ? `${year} 年` : String(year)),
					h("button", { key: "n", type: "button", className: "uo-icon-btn", "aria-label": text.nextYear, disabled: year >= maxYear, onClick: () => { setYear((value) => value + 1); } }, "›")
				]),
				h("div", { key: "grid", className: "uo-picker-grid" }, months.map((month) => {
					const index = Number(month.slice(5, 7));
					const label = zhLocale
						? `${index} 月`
						: new Date(Date.UTC(year, index - 1, 1)).toLocaleDateString("en-US", { month: "short" });
					const outside = month > max || (min !== "" && month < min);
					return h("button", {
						key: month,
						type: "button",
						className: `uo-picker-month${month === props.value ? " uo-selected" : ""}`,
						"aria-pressed": month === props.value,
						disabled: outside,
						onClick: () => {
							setOpen(false);
							props.onChange(month);
						}
					}, label);
				}))
			]);

			return h("div", { className: "uo-picker", ref: wrap }, [trigger, pop]);
		}

		/** The key filter as a themed listbox: the native menu ignores the app's theme. */
		function SelectPill(props) {
			const [open, setOpen] = react.useState(false);
			const wrap = react.useRef(null);
			useDismiss(open, wrap, () => { setOpen(false); });
			const options = Array.isArray(props.options) ? props.options : [];
			const current = options.find((option) => option.value === props.value) ?? options[0];

			const trigger = h("button", {
				key: "trigger",
				type: "button",
				className: "uo-pill uo-select-trigger",
				"aria-haspopup": "listbox",
				"aria-expanded": open,
				"aria-label": `${props.prefix}: ${current === undefined ? "" : current.label}`,
				onClick: () => { setOpen((value) => !value); }
			}, [
				h("span", { key: "p", className: "uo-select-prefix" }, props.prefix),
				h("span", { key: "v" }, current === undefined ? "" : current.label)
			]);

			if (!open) return h("div", { className: "uo-picker", ref: wrap }, trigger);

			const pop = h("div", { key: "pop", className: "uo-picker-pop uo-select-pop", role: "listbox" },
				options.map((option) => h("button", {
					key: option.value === "" ? "__all" : option.value,
					type: "button",
					role: "option",
					"aria-selected": option.value === props.value,
					className: `uo-option${option.value === props.value ? " uo-selected" : ""}`,
					onClick: () => {
						setOpen(false);
						props.onChange(option.value);
					}
				}, option.label)));

			return h("div", { className: "uo-picker", ref: wrap }, [trigger, pop]);
		}

		const WEEKDAYS = zhLocale
			? ["一", "二", "三", "四", "五", "六", "日"]
			: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

		/** Local `YYYY-MM-DD` of today, built without a timezone library. */
		function todayIso() {
			const now = new Date();
			// taste-skill-ignore: a date key, not an index number
			return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
		}

		/**
		 * The month the loaded range ends in, laid out Monday-first. Every cell
		 * carries the day's spend and its tokens; the fill is the spend's share of
		 * the busiest day, so the month reads as a heat map, not as a table.
		 */
		function Calendar(props) {
			const rows = Array.isArray(props.rows) ? props.rows : [];
			const currency = props.currency;
			const byDate = new Map(rows.map((row) => [row.date, row]));
			const last = rows.length > 0 ? rows[rows.length - 1].date : "";
			const [yearText, monthText] = String(last).split("-");
			const year = Number(yearText);
			const month = Number(monthText);
			const valid = Number.isFinite(year) && Number.isFinite(month) && month >= 1 && month <= 12;
			const today = todayIso();
			const wrapRef = react.useRef(null);
			const [detail, setDetail] = react.useState(null);

			react.useEffect(() => {
				if (detail === null) return undefined;
				const onDown = (event) => {
					if (wrapRef.current !== null && !wrapRef.current.contains(event.target)) setDetail(null);
				};
				const onKey = (event) => {
					if (event.key === "Escape") setDetail(null);
				};
				document.addEventListener("mousedown", onDown);
				document.addEventListener("keydown", onKey);
				return () => {
					document.removeEventListener("mousedown", onDown);
					document.removeEventListener("keydown", onKey);
				};
			}, [detail]);

			const past = rows.filter((row) => String(row.date) <= today);
			const spend = past.reduce((sum, row) => sum + amountOf(row.cost), 0);
			const tokens = past.reduce((sum, row) => sum + integer(row.tokens), 0);
			const peak = past.reduce((best, row) => (best === null || amountOf(row.cost) > amountOf(best.cost) ? row : best), null);
			const tokenPeak = past.reduce((best, row) => (best === null || integer(row.tokens) > integer(best.tokens) ? row : best), null);
			const top = past.reduce((max, row) => Math.max(max, amountOf(row.cost)), 0);

			const cells = [];
			let daysInMonth = 0;
			if (valid) {
				const first = new Date(Date.UTC(year, month - 1, 1));
				const offset = (first.getUTCDay() + 6) % 7;
				daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
				for (let i = 0; i < offset; i += 1) cells.push(null);
				for (let day = 1; day <= daysInMonth; day += 1) {
					// taste-skill-ignore: a date key, not an index number
					const date = `${yearText}-${monthText}-${String(day).padStart(2, "0")}`;
					cells.push({ day, date, row: byDate.get(date) });
				}
				while (cells.length % 7 !== 0) cells.push(null);
			}

			const now = new Date();
			const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
			const viewingThisMonth = last.slice(0, 7) === currentMonth;
			const elapsed = viewingThisMonth ? now.getDate() : daysInMonth;
			const average = elapsed > 0 ? spend / elapsed : 0;

			const levelOf = (row) => {
				if (row === undefined || top <= 0) return 0;
				const amount = amountOf(row.cost);
				if (amount <= 0) return 0;
				return Math.min(4, Math.max(1, Math.ceil((amount / top) * 4)));
			};

			const stats = h("div", { key: "stats", className: "uo-stats" }, [
				h("div", { key: "a", className: "uo-stat" }, [
					h("span", { key: "l", className: "uo-stat-label" }, text.periodSpend),
					h("div", { key: "v", className: "uo-stat-value" }, moneyAll([{ currency, amount: spend }]))
				]),
				h("div", { key: "b", className: "uo-stat" }, [
					h("span", { key: "l", className: "uo-stat-label" }, text.dailyAverage),
					h("div", { key: "v", className: "uo-stat-value" }, moneyAll([{ currency, amount: average }]))
				]),
				h("div", { key: "c", className: "uo-stat" }, [
					h("span", { key: "l", className: "uo-stat-label" }, text.peakDay),
					h("div", { key: "v", className: "uo-stat-value" }, [
						h("span", { key: "n" }, peak === null ? "—" : moneyOne(peak.cost)),
						peak === null ? null : h("span", { key: "d", className: "uo-stat-unit" }, shortDate(peak.date))
					])
				]),
				h("div", { key: "d", className: "uo-stat" }, [
					h("span", { key: "l", className: "uo-stat-label" }, text.totalTokens),
					h("div", { key: "v", className: "uo-stat-value" }, [
						h("span", { key: "n" }, compactTokens(tokens)),
						h("span", { key: "u", className: "uo-stat-unit" }, text.tokens)
					])
				])
			]);

			const legend = h("div", { key: "legend", className: "uo-cal-legend" }, [
				h("span", { key: "s0", className: "uo-swatch" }),
				h("span", { key: "s1", className: "uo-swatch uo-l1" }),
				h("span", { key: "s2", className: "uo-swatch uo-l2" }),
				h("span", { key: "s3", className: "uo-swatch uo-l3" }),
				h("span", { key: "s4", className: "uo-swatch uo-l4" }),
				h("span", { key: "lt" }, text.heatLegend),
				h("span", { key: "r", className: "uo-ring" }),
				h("span", { key: "rt" }, text.today)
			]);

			const openDetail = (event, date, row) => {
				const wrap = wrapRef.current;
				if (wrap === null || row === undefined) return;
				const wrapRect = wrap.getBoundingClientRect();
				const cellRect = event.currentTarget.getBoundingClientRect();
				const width = Math.min(240, wrapRect.width - 16);
				const left = Math.min(Math.max(cellRect.left - wrapRect.left + cellRect.width / 2 - width / 2, 4), wrapRect.width - width - 4);
				const top = cellRect.top - wrapRect.top;
				const below = top < 160;
				setDetail({
					date,
					row,
					left,
					width,
					top: below ? cellRect.bottom - wrapRect.top + 8 : top - 8,
					below
				});
			};

			const closeIcon = h("svg", { key: "x", width: 10, height: 10, viewBox: "0 0 10 10", "aria-hidden": "true" },
				h("path", { d: "M1.5 1.5l7 7M8.5 1.5l-7 7", stroke: "currentColor", "stroke-width": "1.3", "stroke-linecap": "round" }));

			const pop = detail === null ? null : h("div", {
				key: "pop",
				className: "uo-day-pop",
				role: "dialog",
				"aria-label": `${shortDate(detail.date)} ${text.dayDetail}`,
				style: {
					left: `${detail.left}px`,
					width: `${detail.width}px`,
					top: `${detail.top}px`,
					transform: detail.below ? "none" : "translateY(-100%)"
				}
			}, [
				h("div", { key: "head", className: "uo-day-pop-head" }, [
					h("span", { key: "d" }, `${monthLabel(detail.date.slice(0, 7))}${Number(detail.date.slice(8, 10))}日`),
					h("button", { key: "c", type: "button", className: "uo-day-pop-close", "aria-label": text.close, onClick: () => { setDetail(null); } }, closeIcon)
				]),
				h("div", { key: "spend", className: "uo-day-pop-row" }, [
					h("span", { key: "l" }, text.cost),
					h("b", { key: "v" }, detail.row !== undefined && amountOf(detail.row.cost) > 0 ? moneyOne(detail.row.cost) : `${currencySymbol(currency)}0.00`)
				]),
				h("div", { key: "tokens", className: "uo-day-pop-row" }, [
					h("span", { key: "l" }, text.tokens),
					h("b", { key: "v" }, grouped(detail.row?.tokens))
				]),
				h("div", { key: "requests", className: "uo-day-pop-row" }, [
					h("span", { key: "l" }, text.requests),
					h("b", { key: "v" }, grouped(detail.row?.requests))
				])
			]);

			const head = h("div", { key: "head", className: "uo-cal-head" },
				WEEKDAYS.map((label) => h("span", { key: label }, label)));

			const grid = h("div", { key: "grid", className: "uo-cal-grid" },
				cells.map((cell, index) => {
					if (cell === null) return h("div", { key: `blank-${index}`, className: "uo-cal-cell uo-cal-blank", "aria-hidden": "true" });
					const future = cell.date > today;
					const hasData = cell.row !== undefined && !future;
					const level = hasData ? levelOf(cell.row) : 0;
					const isToday = cell.date === today;
					const amount = hasData ? amountOf(cell.row.cost) : 0;
					const tokensHere = hasData ? integer(cell.row.tokens) : 0;
					const quiet = !hasData || (amount === 0 && tokensHere === 0);
					return h("button", {
						key: cell.date,
						type: "button",
						className: `uo-cal-cell${level > 0 ? ` uo-l${level}` : ""}${isToday ? " uo-today" : ""}${quiet ? " uo-cal-quiet" : ""}${future ? " uo-cal-future" : ""}`,
						disabled: !hasData,
						"aria-label": hasData
							? `${shortDate(cell.date)} ${text.cost} ${moneyOne(cell.row.cost)} ${text.tokens} ${grouped(tokensHere)} ${text.requests} ${grouped(cell.row.requests)}`
							: shortDate(cell.date),
						onClick: (event) => { openDetail(event, cell.date, cell.row); }
					}, [
						h("span", { key: "d", className: "uo-cal-day" }, String(cell.day).padStart(2, "0")),
						h("div", { key: "b", className: "uo-cal-body" }, hasData
							? [
								tokensHere > 0 ? h("span", { key: "t", className: "uo-cal-tokens" }, compactTokens(tokensHere)) : null,
								h("span", { key: "a", className: "uo-cal-amount" }, amount > 0 ? moneyOne(cell.row.cost) : `${currencySymbol(currency)}0.00`)
							]
							: h("span", { key: "a", className: "uo-cal-amount" }, "—"))
					]);
				}));

			const notes = h("div", { key: "notes", className: "uo-daily-notes" }, [
				h("span", { key: "a" }, peak === null
					? text.peakSpend + " —"
					: `${text.peakSpend} ${shortDate(peak.date)} · ${moneyOne(peak.cost)} (${compactTokens(peak.tokens)})`),
				h("span", { key: "b" }, tokenPeak === null || integer(tokenPeak.tokens) === 0
					? text.peakTokens + " —"
					: `${text.peakTokens} ${shortDate(tokenPeak.date)} · ${compactTokens(tokenPeak.tokens)}`)
			]);

			return h("div", { className: "uo-daily", ref: wrapRef }, [stats, legend, head, grid, pop, notes]);
		}

		function monthLabel(month) {
			const [year, index] = String(month ?? "").split("-");
			const n = Number(index);
			if (!Number.isFinite(n) || n < 1 || n > 12) return String(month ?? "");
			return zhLocale
				? `${year}年${n}月`
				: new Date(Date.UTC(Number(year), n - 1, 1)).toLocaleDateString("en-US", { month: "short", year: "numeric" });
		}

		/** One row per month: spend and tokens, newest first, totals summed from the rows. */
		/** Months as a grid of cells, the same shape as the daily calendar. */
		function MonthlyGrid(props) {
			const rows = Array.isArray(props.rows) ? props.rows : [];
			const currency = props.currency;
			const top = rows.reduce((max, row) => Math.max(max, amountOf(row.cost)), 0);
			const current = currentMonthKey();

			return h("div", { className: "uo-month-grid" }, rows.map((row) => {
				const amount = amountOf(row.cost);
				const tokens = integer(row.tokens);
				const level = top > 0 && amount > 0 ? Math.min(4, Math.max(1, Math.ceil((amount / top) * 4))) : 0;
				const quiet = amount <= 0 && tokens === 0;
				const isCurrent = row.month === current;
				return h("button", {
					key: row.month,
					type: "button",
					className: `uo-cal-cell uo-month-cell${level > 0 ? ` uo-l${level}` : ""}${isCurrent ? " uo-today" : ""}${quiet ? " uo-cal-quiet" : ""}`,
					"aria-label": `${monthLabel(row.month)} ${text.cost} ${moneyOne(row.cost)} ${text.tokens} ${grouped(tokens)}`,
					title: `${monthLabel(row.month)} · ${moneyOne(row.cost)} · ${compactTokens(tokens)}`,
					onClick: () => { if (typeof props.onSelect === "function") props.onSelect(row.month); }
				}, [
					h("span", { key: "m", className: "uo-cal-day" }, monthLabel(row.month)),
					h("div", { key: "b", className: "uo-cal-body" }, [
						tokens > 0 ? h("span", { key: "t", className: "uo-cal-tokens" }, compactTokens(tokens)) : null,
						h("span", { key: "a", className: "uo-cal-amount" }, amount > 0 ? moneyOne(row.cost) : `${currencySymbol(currency)}0.00`)
					])
				]);
			}));
		}

		function SkeletonPanel() {
			return h("div", null, [
				h("section", { key: "hero", className: "uo-hero" }, [
					h("div", { key: "l" }, [
						h("span", { key: "a", className: "uo-hero-label" }, text.account),
						h("span", { key: "b", className: "uo-skeleton uo-skel-value" })
					])
				]),
				h("div", { key: "tiles", className: "uo-tiles" }, [
					h(Tile, { key: "a", label: text.lifetime, placeholder: true }),
					h(Tile, { key: "b", label: text.lifetimeTokens, placeholder: true }),
					h(Tile, { key: "c", label: text.lifetimeRequests, placeholder: true })
				]),
				h("section", { key: "card", className: "uo-card", "aria-busy": "true" }, [
					h("div", { key: "h", className: "uo-card-head" }, [
						h("div", { key: "t" }, [
							h("h2", { key: "a", className: "uo-card-title" }, text.daily),
							h("p", { key: "b", className: "uo-card-meta" }, text.dailySub)
						])
					]),
					h("div", { key: "c", className: "uo-skeleton uo-skel-cal", "aria-hidden": "true" })
				]),
				h("section", { key: "monthly", className: "uo-card", "aria-busy": "true" }, [
					h("div", { key: "h", className: "uo-card-head" }, [
						h("h2", { key: "a", className: "uo-card-title" }, text.monthly)
					]),
					h("div", { key: "c", className: "uo-skeleton uo-skel-grid", "aria-hidden": "true" })
				])
			]);
		}

		function Panel(props) {
			const [month, setMonth] = react.useState(currentMonthKey());
			const [keyId, setKeyId] = react.useState("");
			const [keys, setKeys] = react.useState([]);
			const [nonce, setNonce] = react.useState(0);
			const [state, setState] = react.useState({ phase: "loading" });

			react.useEffect(() => {
				let cancelled = false;
				setState({ phase: "loading" });
				const query = new URLSearchParams({ month });
				if (keyId !== "") query.set("key", keyId);
				if (nonce > 0) query.set("fresh", "1");
				fetch(`${ROUTE}?${query.toString()}`, { headers: { accept: "application/json" } })
					.then(async (response) => {
						let payload;
						try {
							payload = await response.json();
						} catch {
							payload = undefined;
						}
						if (cancelled) return;
						if (!response.ok) {
							setState({ phase: "error", message: errorMessage(response.status, payload) });
							return;
						}
						if (Array.isArray(payload?.keys) && payload.keys.length > 0) setKeys(payload.keys);
						setState({ phase: "ready", data: payload });
					})
					.catch((error) => {
						if (cancelled) return;
						setState({ phase: "error", message: `${text.failed} (${String(error?.message ?? error)})` });
					});
				return () => {
					cancelled = true;
				};
			}, [month, keyId, nonce]);

			const footer = h("div", { style: { display: "flex", gap: "8px", justifyContent: "flex-end", flexWrap: "wrap" } }, [
				h(primitives.Button, { key: "refresh", variant: "outline", size: "sm", onClick: () => { setNonce((value) => value + 1); } }, text.refresh),
				h(primitives.Button, { key: "close", variant: "primary", size: "sm", onClick: props.onClose }, text.close)
			]);

			const shell = (children) => h(primitives.Modal, {
				open: true,
				onClose: props.onClose,
				title: text.title,
				closeLabel: text.close,
				className: MODAL_CLASS,
				contentClassName: CONTENT_CLASS,
				children: h("div", { className: "uo-root" }, children),
				footer
			});

			if (state.phase === "loading") {
				return shell(h(SkeletonPanel));
			}

			const data = state.phase === "ready" ? state.data ?? {} : undefined;
			const rows = [...(data?.daily ?? [])].sort((a, b) => String(a.date).localeCompare(String(b.date)));
			const currency = moneyCurrency(data?.cost) || moneyCurrency(data?.balance) || "CNY";
			const lifetime = data?.lifetime;
			const lifetimeReady = lifetime !== null && lifetime !== undefined && typeof lifetime === "object";
			const since = lifetimeReady && typeof lifetime.since === "string" && lifetime.since !== "" ? lifetime.since : "";

			const hero = h(Hero, { key: "hero", data, since });

			const monthsCount = Array.isArray(data?.monthly) ? data.monthly.length : 0;
			const lifetimeDays = since === "" ? 0 : Math.max(1, Math.ceil((Date.now() - Date.parse(`${since}T00:00:00`)) / 86400000));
			const perDay = lifetimeDays > 0 && lifetimeReady ? Math.round(integer(lifetime.requests) / lifetimeDays) : 0;
			const tiles = h("div", { key: "tiles", className: "uo-tiles" }, [
				h(Tile, { key: "a", label: text.lifetime, value: data === undefined ? "—" : moneyOne(data.lifetimeCost),
					sub: monthsCount > 0 ? text.tilesMonths.replace("{n}", String(monthsCount)) : undefined }),
				h(Tile, { key: "b", label: text.lifetimeTokens, value: lifetimeReady ? grouped(lifetime.tokens) : "—",
					sub: text.tilesTokens }),
				h(Tile, { key: "c", label: text.lifetimeRequests, value: lifetimeReady ? grouped(lifetime.requests) : "—",
					sub: perDay > 0 ? text.tilesRequests.replace("{n}", String(perDay)) : undefined })
			]);

			const monthly = Array.isArray(data?.monthly) ? data.monthly : null;
			const hostMonth = typeof data?.month === "string" ? data.month : "";
			// an older Host answers the range preset and ignores `month`; keep the panel
			// honest until DSH is restarted, when the month query starts working
			const compat = data !== undefined && hostMonth === "";
			const shownMonth = hostMonth !== "" ? hostMonth : (rows.length > 0 ? String(rows[rows.length - 1].date).slice(0, 7) : month);
			const sinceMonth = since.length >= 7 ? since.slice(0, 7) : "";
			const monthlyMonths = monthly === null ? [] : monthly.map((entry) => entry.month).sort();
			const minMonth = sinceMonth !== "" ? sinceMonth : (monthlyMonths.length > 0 ? monthlyMonths[0] : "");
			const controls = h("div", { key: "controls", className: "uo-controls" }, [
				h(MonthPicker, {
					key: "month",
					value: compat ? shownMonth : month,
					min: minMonth,
					max: currentMonthKey(),
					disabled: compat,
					onChange: (next) => { setMonth(next); }
				}),
				h(SelectPill, {
					key: "key",
					prefix: text.keyLabel,
					value: keyId,
					options: [
						{ value: "", label: text.allKeys },
						...keys.map((entry) => ({ value: entry.trackingId, label: entry.name === "" ? entry.trackingId : entry.name }))
					],
					onChange: (next) => { setKeyId(next); }
				}),
				h("button", {
					key: "export",
					type: "button",
					className: "uo-text-btn",
					disabled: data === undefined,
					onClick: () => { if (data !== undefined) exportCsv(data, shownMonth, keyId); }
				}, text.export)
			]);

			const dailyMonth = shownMonth === "" ? "" : monthLabel(shownMonth);
			const chartCard = h("section", { key: "chart", className: "uo-card", "aria-labelledby": "uo-daily-title" }, [
				h("div", { key: "head", className: "uo-card-head" }, [
					h("div", { key: "t" }, [
						h("h2", { key: "h", id: "uo-daily-title", className: "uo-card-title" }, text.daily),
						h("p", { key: "s", className: "uo-card-meta" }, dailyMonth === "" ? text.dailySub : `${dailyMonth} · ${text.dailySub}`)
					]),
					controls
				]),
				state.phase === "error"
					? h("div", { key: "error", className: "uo-state" }, [
						h("span", { key: "m" }, state.message),
						h("button", { key: "r", type: "button", onClick: () => { setNonce((value) => value + 1); } }, text.retry)
					])
					: h(Calendar, { key: "calendar", rows, currency })
			]);

			const monthlyMap = new Map((monthly ?? []).map((row) => [row.month, row]));
			const monthCells = [];
			if (/^\d{4}-\d{2}$/.test(minMonth)) {
				let yearCursor = Number(minMonth.slice(0, 4));
				let monthCursor = Number(minMonth.slice(5, 7));
				const nowMonthKey = currentMonthKey();
				const nowYear = Number(nowMonthKey.slice(0, 4));
				const nowMonth = Number(nowMonthKey.slice(5, 7));
				for (let guard = 0; guard < 240 && (yearCursor < nowYear || (yearCursor === nowYear && monthCursor <= nowMonth)); guard += 1) {
					// taste-skill-ignore: month keys, not index numbers
					const key = `${yearCursor}-${String(monthCursor).padStart(2, "0")}`;
					monthCells.push(monthlyMap.get(key) ?? { month: key, cost: [], tokens: 0, requests: 0 });
					monthCursor += 1;
					if (monthCursor > 12) {
						monthCursor = 1;
						yearCursor += 1;
					}
				}
			}

			const monthlyCard = state.phase === "ready"
				? h("section", { key: "monthly", className: "uo-card" }, [
					h("div", { key: "head", className: "uo-card-head" }, [
						h("div", { key: "t" }, [
							h("h2", { key: "h", className: "uo-card-title" }, text.monthly),
							h("p", { key: "s", className: "uo-card-meta" },
								monthly === null ? "" : text.monthlyMeta.split("{n}").join(String(monthCells.length)))
						])
					]),
					monthly === null
						? h("div", { key: "empty", className: "uo-empty" }, text.monthlyUnavailable)
						: h(MonthlyGrid, { key: "grid", rows: monthCells, currency, onSelect: (value) => { setMonth(value); } })
				])
				: null;

			return shell([hero, tiles, chartCard, monthlyCard]);
		}

		function Overlay() {
			const open = useOpened();
			if (!open) return null;
			return h(Panel, { onClose: () => { setOpened(false); } });
		}

		// ---- click interception ----------------------------------------------
		function onDocumentClick(event) {
			const target = event.target;
			const anchor = target instanceof Element ? target.closest("a[href]") : null;
			if (anchor === null) return;
			let url;
			try {
				url = new URL(anchor.href, location.href);
			} catch {
				return;
			}
			if (!USAGE_HOSTS.has(url.hostname)) return;
			if (url.pathname.replace(/\/+$/u, "") !== "/usage") return;
			event.preventDefault();
			event.stopPropagation();
			setOpened(true);
		}

		const name = "usage-overview";
		const inject = ["slots"];

		function apply(ctx) {
			ctx.effect(() => installStyles(), "usage-overview: panel styles");
			ctx.slots.inject("shell.overlay", () =>
				ctx.slots.register(
					{ name: "shell.overlay", id: "usage-overview", label: () => text.title },
					Overlay
				)
			);
			ctx.effect(() => {
				document.addEventListener("click", onDocumentClick, true);
				return () => {
					document.removeEventListener("click", onDocumentClick, true);
				};
			}, "usage-overview: usage link interception");
		}

		exports.name = name;
		exports.inject = inject;
		exports.apply = apply;
		return module.exports;
	}
});
