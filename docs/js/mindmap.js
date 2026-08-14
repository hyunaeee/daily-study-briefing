/* 마인드맵 SVG 렌더러 — 의존성 없음.
   renderMindmap(containerEl, {root, children:[{label, children:[{label}]}]}) */
(function () {
  const NS = "http://www.w3.org/2000/svg";
  const PALETTE = ["var(--cs)", "var(--mkt)", "var(--ai)", "var(--ok)", "var(--link)"];

  function textW(label) {
    let w = 0;
    for (const ch of label) w += ch.charCodeAt(0) > 0x2500 ? 14.5 : 8.2;
    return Math.ceil(w);
  }

  function el(name, attrs, text) {
    const node = document.createElementNS(NS, name);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    if (text != null) node.textContent = text;
    return node;
  }

  function curve(x1, y1, x2, y2) {
    const mx = (x1 + x2) / 2;
    return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
  }

  window.renderMindmap = function (container, tree) {
    container.innerHTML = "";
    const rowH = 38, colGap = 48, pad = 22;
    const branches = tree.children || [];

    let totalRows = 0;
    const rowsOf = branches.map(b => Math.max(1, (b.children || []).length));
    rowsOf.forEach(r => (totalRows += r));

    const rootW = textW(tree.root) + 28;
    const branchW = Math.max(...branches.map(b => textW(b.label) + 24), 40);
    const leafW = Math.max(...branches.flatMap(b => (b.children || []).map(c => textW(c.label))), 40);

    const x0 = pad;
    const x1 = x0 + rootW + colGap;
    const x2 = x1 + branchW + colGap;
    const W = x2 + leafW + 20 + pad;
    const H = Math.max(totalRows * rowH + pad * 2, 140);

    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img" });
    svg.appendChild(el("title", {}, tree.root + " 마인드맵"));
    const gLinks = el("g", { fill: "none", "stroke-width": "1.6" });
    const gNodes = el("g", { "font-size": "13", "font-family": "inherit" });
    svg.appendChild(gLinks);
    svg.appendChild(gNodes);

    const rootY = H / 2;
    // 루트 노드
    gNodes.appendChild(el("rect", {
      x: x0, y: rootY - 16, width: rootW, height: 32, rx: 7, fill: "var(--ink)"
    }));
    gNodes.appendChild(el("text", {
      x: x0 + rootW / 2, y: rootY + 4.5, "text-anchor": "middle",
      fill: "var(--bg)", "font-weight": "700"
    }, tree.root));

    let rowCursor = 0;
    branches.forEach((b, i) => {
      const color = PALETTE[i % PALETTE.length];
      const rows = rowsOf[i];
      const blockTop = pad + rowCursor * rowH;
      const by = blockTop + (rows * rowH) / 2;
      rowCursor += rows;

      // 루트 → 가지
      gLinks.appendChild(el("path", { d: curve(x0 + rootW, rootY, x1, by), stroke: color, opacity: "0.85" }));

      // 가지 노드 (알약)
      const bw = textW(b.label) + 24;
      gNodes.appendChild(el("rect", {
        x: x1, y: by - 14, width: bw, height: 28, rx: 14,
        fill: "var(--surface)", stroke: color, "stroke-width": "1.5"
      }));
      gNodes.appendChild(el("text", {
        x: x1 + bw / 2, y: by + 4.5, "text-anchor": "middle",
        fill: "var(--ink)", "font-weight": "700", "font-size": "12.5"
      }, b.label));

      // 잎
      (b.children || []).forEach((leaf, j) => {
        const ly = blockTop + j * rowH + rowH / 2;
        gLinks.appendChild(el("path", { d: curve(x1 + bw, by, x2, ly), stroke: color, opacity: "0.45" }));
        gNodes.appendChild(el("circle", { cx: x2 + 4, cy: ly, r: 3.2, fill: color }));
        gNodes.appendChild(el("text", {
          x: x2 + 14, y: ly + 4.5, fill: "var(--ink-soft)", "font-size": "12.5"
        }, leaf.label));
      });
    });

    container.appendChild(svg);
  };
})();
