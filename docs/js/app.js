/* 매일 학습 브리핑 — 포털 레이아웃 앱 로직
   (렌더링 + 검색 + 키워드 랭킹 + 진도/스트릭 + 복습 + 테마, 저장은 모두 localStorage) */
(function () {
  const $ = (sel) => document.querySelector(sel);
  const PKEY = "dsb.progress", TKEY = "dsb.theme";
  let indexData = null, dayData = null, dayPos = 0;
  let allDaysCache = null; // 검색용 전체 데이터

  const esc = (s) => String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  /* ---------- 진도 저장소 ---------- */
  function loadProgress() {
    try {
      const p = JSON.parse(localStorage.getItem(PKEY)) || {};
      return { visits: p.visits || {}, quiz: p.quiz || {}, practice: p.practice || {}, wrong: p.wrong || {} };
    } catch { return { visits: {}, quiz: {}, practice: {}, wrong: {} }; }
  }
  const progress = loadProgress();
  const saveProgress = () => localStorage.setItem(PKEY, JSON.stringify(progress));

  function todayKey(offset = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function streak() {
    let n = 0, offset = 0;
    if (!progress.visits[todayKey(0)]) offset = -1;
    while (progress.visits[todayKey(offset - n)]) n++;
    return n;
  }

  function renderStats() {
    const quizzes = Object.values(progress.quiz);
    const totalC = quizzes.reduce((s, q) => s + q.c, 0);
    const totalT = quizzes.reduce((s, q) => s + q.t, 0);
    const wrongN = Object.keys(progress.wrong).length;
    $("#stats").innerHTML = `
      <span class="stat-chip">🔥 연속 학습<b>${streak()}일</b></span>
      <span class="stat-chip">✅ 완료한 퀴즈<b>${quizzes.length}개</b></span>
      <span class="stat-chip">🎯 평균 정답률<b>${totalT ? Math.round(totalC / totalT * 100) : 0}%</b></span>
      <span class="stat-chip">📝 복습 대기<b>${wrongN}문제</b></span>`;
    const btn = $("#reviewBtn");
    btn.disabled = wrongN === 0;
    btn.textContent = wrongN === 0 ? "복습할 문제가 없습니다 🎉" : `틀린 문제 ${wrongN}개 다시 풀기`;
  }

  /* ---------- 테마 ---------- */
  const THEMES = [["auto", "◐ 자동"], ["light", "☀ 라이트"], ["dark", "☾ 다크"]];
  function applyTheme(mode) {
    if (mode === "auto") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = mode;
    $("#themeBtn").textContent = THEMES.find(t => t[0] === mode)[1];
  }
  function initTheme() {
    let mode = localStorage.getItem(TKEY) || "auto";
    applyTheme(mode);
    $("#themeBtn").addEventListener("click", () => {
      mode = THEMES[(THEMES.findIndex(t => t[0] === mode) + 1) % THEMES.length][0];
      localStorage.setItem(TKEY, mode);
      applyTheme(mode);
    });
  }

  /* ---------- 데이터 로드 ---------- */
  async function loadJSON(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`${path} 로드 실패 (${res.status})`);
    return res.json();
  }

  async function init() {
    initTheme();
    progress.visits[todayKey()] = 1;
    saveProgress();
    try {
      indexData = await loadJSON("data/index.json");
      dayPos = indexData.days.length - 1;
      await showDay(dayPos);
    } catch (e) {
      $("#dateLabel").textContent = "데이터를 불러오지 못했습니다";
      console.error(e);
    }
    renderStats();
    $("#reviewBtn").addEventListener("click", openReview);
    $("#searchForm").addEventListener("submit", (e) => {
      e.preventDefault();
      runSearch($("#searchInput").value.trim());
    });
    $("#searchClose").addEventListener("click", closeSearch);
  }

  async function showDay(pos) {
    dayPos = pos;
    dayData = await loadJSON("data/" + indexData.days[pos].file);
    $("#dayBadge").textContent = "DAY " + dayData.day;
    $("#dateLabel").textContent = dayData.dateLabel;
    $("#prevDay").disabled = pos === 0;
    $("#nextDay").disabled = pos === indexData.days.length - 1;
    closeDetail();
    renderCards();
    renderNews();
    renderTrends();
    renderPapers();
    renderKeywords();
    renderArchive();
  }

  /* ---------- 검색 ---------- */
  async function loadAllDays() {
    if (allDaysCache) return allDaysCache;
    allDaysCache = await Promise.all(
      indexData.days.map(async (d, pos) => ({ pos, meta: d, data: await loadJSON("data/" + d.file) }))
    );
    return allDaysCache;
  }

  async function runSearch(query) {
    if (!query) { closeSearch(); return; }
    const q = query.toLowerCase();
    const days = await loadAllDays();
    const results = [];
    days.forEach(({ pos, data }) => {
      data.concepts.forEach((c, ci) => {
        const hay = [c.title, c.summary, c.why, ...(c.keywords || []),
          ...(c.deepDive || []).map(s => s.h)].join(" ").toLowerCase();
        if (hay.includes(q)) results.push({
          kind: "concept", pos, ci, day: data.day,
          field: c.field, fieldLabel: c.fieldLabel, title: c.title, body: c.summary
        });
      });
      (data.news || []).forEach(n => {
        if ((n.headline + " " + n.body).toLowerCase().includes(q))
          results.push({ kind: "news", pos, day: data.day, title: n.headline, body: n.body, url: n.url });
      });
      (data.papers || []).forEach(p => {
        if ((p.title + " " + p.desc).toLowerCase().includes(q))
          results.push({ kind: "paper", pos, day: data.day, title: p.title, body: p.desc });
      });
    });

    const box = $("#searchBox");
    $("#searchTitle").textContent = `'${query}' 검색 결과 ${results.length}건`;
    const kindLabel = { concept: "개념", news: "뉴스", paper: "논문" };
    $("#searchResults").innerHTML = results.length === 0
      ? `<div class="sr-empty">검색 결과가 없습니다. 다른 키워드로 찾아보세요.</div>`
      : results.slice(0, 20).map((r, i) => `
        <div class="sr-item" data-i="${i}">
          <div class="sr-meta">DAY ${r.day} · ${kindLabel[r.kind]}${r.fieldLabel ? " · " + esc(r.fieldLabel) : ""}</div>
          <div class="sr-title">${esc(r.title)}</div>
          <div class="sr-body">${esc(r.body.length > 90 ? r.body.slice(0, 90) + "…" : r.body)}</div>
        </div>`).join("");
    box.classList.add("open");
    $("#searchResults").querySelectorAll(".sr-item").forEach(el =>
      el.addEventListener("click", async () => {
        const r = results[Number(el.dataset.i)];
        await showDay(r.pos);
        if (r.kind === "concept") openDetail(r.ci);
        else if (r.kind === "news") $("#newsSec").scrollIntoView({ behavior: "smooth" });
        else $("#paperSec").scrollIntoView({ behavior: "smooth" });
      }));
    box.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function closeSearch() {
    $("#searchBox").classList.remove("open");
    $("#searchResults").innerHTML = "";
  }

  /* ---------- 오늘의 키워드 랭킹 ---------- */
  function renderKeywords() {
    const items = [];
    dayData.concepts.forEach(c => (c.keywords || []).forEach(k =>
      items.push({ word: k, field: c.field, fieldLabel: c.fieldLabel })));
    $("#kwList").innerHTML = items.slice(0, 10).map(it => `
      <li data-w="${esc(it.word)}"><span class="rk-word">${esc(it.word)}</span>
      <span class="rk-field ${it.field}">${esc(it.fieldLabel)}</span></li>`).join("");
    $("#kwList").querySelectorAll("li").forEach(li =>
      li.addEventListener("click", () => {
        $("#searchInput").value = li.dataset.w;
        runSearch(li.dataset.w);
      }));
  }

  /* ---------- 개념 카드 ---------- */
  function conceptKey(i) { return `${dayData.day}:${i}`; }

  function renderCards() {
    const box = $("#cards");
    box.innerHTML = "";
    dayData.concepts.forEach((c, i) => {
      const key = conceptKey(i);
      const score = progress.quiz[key];
      const badge = score
        ? `<span class="quiz-badge ${score.c === score.t ? "pass" : "retry"}">퀴즈 ${score.c}/${score.t}</span>`
        : "";
      const done = !!progress.practice[key];
      const card = document.createElement("article");
      card.className = "card";
      card.innerHTML = `
        <div style="display:flex; align-items:center;"><span class="tag ${c.field}">${esc(c.fieldLabel)}</span>${badge}</div>
        <h3>${esc(c.title)}</h3>
        <p>${esc(c.summary)}</p>
        <p class="why"><b>왜 중요한가:</b> ${esc(c.why)}</p>
        <div class="todo"><span class="label">오늘의 실습</span>${esc(c.practice)}
          <label class="practice-check ${done ? "done" : ""}">
            <input type="checkbox" ${done ? "checked" : ""}> 실습 완료
          </label>
        </div>
        <div class="kw">${c.keywords.map(k => `<span>${esc(k)}</span>`).join("")}</div>
        <button class="study-btn ${c.field}" data-idx="${i}">자세히 공부하기 → 퀴즈 · 마인드맵</button>`;
      card.querySelector(".study-btn").addEventListener("click", () => openDetail(i));
      const check = card.querySelector(".practice-check input");
      check.addEventListener("change", () => {
        if (check.checked) progress.practice[key] = 1;
        else delete progress.practice[key];
        saveProgress();
        check.closest(".practice-check").classList.toggle("done", check.checked);
        renderStats();
      });
      box.appendChild(card);
    });
  }

  /* ---------- 심화 패널 ---------- */
  function openDetail(i) {
    const c = dayData.concepts[i];
    const key = conceptKey(i);
    const panel = $("#detail");
    panel.innerHTML = `
      <div class="detail-head">
        <span class="tag ${c.field}">${esc(c.fieldLabel)}</span>
        <h3>${esc(c.title)} — 깊이 공부하기</h3>
        <button class="close" type="button">닫기 ✕</button>
      </div>
      <div class="detail-body">
        <div class="subhead">Deep Dive · 자세한 설명</div>
        ${c.deepDive.map(sec => `
          <h4 class="accent-${c.field}">${esc(sec.h)}</h4>
          ${sec.p.map(p => `<p>${esc(p)}</p>`).join("")}`).join("")}
        <div class="subhead">Mind Map · 한눈에 정리</div>
        <div class="mindmap-box" id="mindmapBox"></div>
        <div class="subhead">Quiz · 이해했는지 확인 (${c.quiz.length}문제)</div>
        <div id="quizBox"></div>
        <div class="quiz-score" id="quizScore"></div>
      </div>`;
    panel.classList.add("open");
    panel.querySelector(".close").addEventListener("click", closeDetail);
    document.querySelectorAll("#cards .card").forEach((el, j) => {
      el.classList.toggle("active", j === i);
      el.style.color = j === i ? `var(--${c.field})` : "";
    });
    renderMindmap(panel.querySelector("#mindmapBox"), c.mindmap);
    renderQuiz(panel.querySelector("#quizBox"), panel.querySelector("#quizScore"), c.quiz, {
      onAnswer(item, qi, ok) {
        const wkey = `${key}:${qi}`;
        if (ok) delete progress.wrong[wkey];
        else progress.wrong[wkey] = {
          day: dayData.day, field: c.field, fieldLabel: c.fieldLabel, title: c.title, item
        };
        saveProgress();
      },
      onDone(correct, total) {
        progress.quiz[key] = { c: correct, t: total };
        saveProgress();
        renderStats();
        renderCards();
        document.querySelectorAll("#cards .card").forEach((el, j) => {
          el.classList.toggle("active", j === i);
          el.style.color = j === i ? `var(--${c.field})` : "";
        });
      }
    });
    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function closeDetail() {
    const panel = $("#detail");
    panel.classList.remove("open");
    panel.innerHTML = "";
    document.querySelectorAll("#cards .card").forEach(el => {
      el.classList.remove("active");
      el.style.color = "";
    });
  }

  /* ---------- 퀴즈 (공용) ---------- */
  function renderQuiz(box, scoreEl, quiz, hooks = {}) {
    let answered = 0, correct = 0;
    quiz.forEach((item, qi) => {
      const div = document.createElement("div");
      div.className = "quiz-item";
      div.innerHTML = `
        ${item._meta ? `<div class="review-meta">${esc(item._meta)}</div>` : ""}
        <div class="quiz-q"><span class="qnum">Q${qi + 1}.</span>${esc(item.q)}</div>
        <div class="choices">${item.choices.map((ch, ci) =>
          `<button class="choice" type="button" data-ci="${ci}">${esc(ch)}</button>`).join("")}
        </div>
        <div class="explain">${esc(item.explain)}</div>`;
      const buttons = div.querySelectorAll(".choice");
      buttons.forEach(btn => btn.addEventListener("click", () => {
        const pick = Number(btn.dataset.ci);
        const ok = pick === item.answer;
        buttons.forEach(b => (b.disabled = true));
        buttons[item.answer].classList.add("correct");
        if (ok) correct++;
        else btn.classList.add("wrong");
        div.querySelector(".explain").classList.add("show");
        if (hooks.onAnswer) hooks.onAnswer(item, qi, ok);
        answered++;
        if (answered === quiz.length) {
          if (scoreEl) scoreEl.textContent = `결과: ${correct} / ${quiz.length} 정답` +
            (correct === quiz.length ? " — 완벽해요! 🎉" :
             correct >= quiz.length / 2 ? " — 좋아요, 틀린 문제 해설만 다시 읽어보세요." :
             " — 딥다이브를 한 번 더 읽고 내일 다시 풀어보세요.");
          if (hooks.onDone) hooks.onDone(correct, quiz.length);
        }
      }));
      box.appendChild(div);
    });
  }

  /* ---------- 복습 모드 ---------- */
  function openReview() {
    const panel = $("#reviewPanel");
    const entries = Object.entries(progress.wrong);
    if (entries.length === 0) { panel.classList.remove("open"); return; }
    panel.innerHTML = "";
    panel.classList.add("open");
    const items = entries.map(([wkey, w]) => ({
      ...w.item,
      _meta: `DAY ${w.day} · ${w.fieldLabel} · ${w.title}`,
      _wkey: wkey,
    }));
    const scoreEl = document.createElement("div");
    scoreEl.className = "quiz-score";
    renderQuiz(panel, null, items, {
      onAnswer(item, qi, ok) {
        if (ok) delete progress.wrong[item._wkey];
        saveProgress();
        renderStats();
      },
      onDone(correct, total) {
        scoreEl.textContent = `복습 결과: ${correct} / ${total} — ` +
          (correct === total ? "전부 정리했어요! 🎉" : "남은 문제는 다음에 다시 나옵니다.");
      }
    });
    panel.appendChild(scoreEl);
    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  /* ---------- 뉴스 / 동향 / 논문 / 아카이브 ---------- */
  function press(url) {
    try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
  }

  function renderNews() {
    $("#newsList").innerHTML = dayData.news.map((n, i) => `
      <li><span class="rank">${i + 1}</span>
      <div><span class="headline">${esc(n.headline)}</span><span class="press">${esc(press(n.url))}</span>
      <p>${esc(n.body)} <a class="src" href="${esc(n.url)}" target="_blank" rel="noopener">원문 보기</a></p></div></li>`).join("");
  }

  function renderTrends() {
    $("#trendGrid").innerHTML = dayData.trends.map(t => `
      <div class="trend"><b>${esc(t.title)}</b>${esc(t.body)}
      ${t.url ? ` <a href="${esc(t.url)}" target="_blank" rel="noopener" style="font-size:0.76rem">출처</a>` : ""}</div>`).join("");
  }

  function renderPapers() {
    $("#paperList").innerHTML = dayData.papers.map(p => `
      <article class="paper"><h3>${esc(p.title)}</h3><p>${esc(p.desc)}</p></article>`).join("");
  }

  function renderArchive() {
    $("#archiveCount").textContent = `총 ${indexData.days.length}일`;
    const list = $("#archiveList");
    list.innerHTML = "";
    [...indexData.days].reverse().forEach((d) => {
      const pos = indexData.days.indexOf(d);
      const li = document.createElement("li");
      if (pos === dayPos) li.className = "current";
      li.innerHTML = `<span class="ar-day">DAY ${d.day}</span><span class="ar-date">${esc(d.date)}</span>
        <span class="ar-topics">${esc(d.topics.cs)} · ${esc(d.topics.mkt)} · ${esc(d.topics.ai)}</span>`;
      li.addEventListener("click", () => {
        showDay(pos);
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
      list.appendChild(li);
    });
  }

  $("#prevDay").addEventListener("click", () => showDay(dayPos - 1));
  $("#nextDay").addEventListener("click", () => showDay(dayPos + 1));
  init();
})();
