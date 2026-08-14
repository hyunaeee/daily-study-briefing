/* 학습 브리핑 (배포용 데모) — 온보딩 프로필에 따라 콘텐츠를 필터링합니다. */
(function () {
  const $ = (sel) => document.querySelector(sel);
  const FLABEL = { cs: "CS", mkt: "마케팅", ai: "AI", dsg: "디자인" };
  const LLABEL = { beginner: "입문", intermediate: "중급", advanced: "심화" };
  let indexData = null, dayData = null, dayPos = 0, profile = null;

  const esc = (s) => String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  async function loadJSON(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`${path} 로드 실패 (${res.status})`);
    return res.json();
  }

  function myConcepts() {
    return dayData.concepts.filter(c => profile.fields.includes(c.field));
  }

  async function boot() {
    profile = getProfile();
    if (!profile) {
      startOnboarding();
      document.addEventListener("profile-ready", () => { profile = getProfile(); init(); }, { once: true });
    } else {
      init();
    }
  }

  async function init() {
    try {
      $("#greeting").textContent = `${profile.name}님의 학습 브리핑`;
      $("#tagline").textContent =
        `${profile.fields.map(f => FLABEL[f]).join(" · ")} — ${LLABEL[profile.level]} · 하루 ${profile.minutes}분 코스`;
      indexData = await loadJSON("data/index.json");
      dayPos = indexData.days.length - 1;
      await showDay(dayPos);
    } catch (e) {
      $("#dateLabel").textContent = "데이터를 불러오지 못했습니다 — 서버로 실행했는지 확인하세요 (node server.js)";
      console.error(e);
    }
  }

  async function showDay(pos) {
    dayPos = pos;
    dayData = await loadJSON("data/" + indexData.days[pos].file);
    $("#dayBadge").textContent = "DAY " + dayData.day;
    $("#dateLabel").textContent = dayData.dateLabel;
    closeDetail();
    renderCards();
    renderNews();
    renderTrends();
    renderPapers();
    renderArchive();
  }

  function renderCards() {
    const box = $("#cards");
    box.innerHTML = "";
    const list = myConcepts();
    if (list.length === 0) {
      box.innerHTML = `<p style="color:var(--ink-faint)">선택한 분야의 오늘 콘텐츠가 아직 없습니다.</p>`;
      return;
    }
    list.forEach((c, i) => {
      const card = document.createElement("article");
      card.className = "card";
      card.innerHTML = `
        <span class="tag ${c.field}">${esc(c.fieldLabel)}</span>
        <h3>${esc(c.title)}</h3>
        <p>${esc(c.summary)}</p>
        <p class="why"><b>왜 중요한가:</b> ${esc(c.why)}</p>
        <div class="todo"><span class="label">오늘의 실습</span>${esc(c.practice)}</div>
        <div class="kw">${c.keywords.map(k => `<span>${esc(k)}</span>`).join("")}</div>
        <button class="study-btn ${c.field}" data-idx="${i}">자세히 공부하기 → 퀴즈 · 마인드맵</button>`;
      card.querySelector(".study-btn").addEventListener("click", () => openDetail(i));
      box.appendChild(card);
    });
  }

  function openDetail(i) {
    const c = myConcepts()[i];
    const quiz = profile.minutes <= 15 ? c.quiz.slice(0, 2) : c.quiz;
    const deep = profile.minutes <= 15 ? c.deepDive.slice(0, 2) : c.deepDive;
    const panel = $("#detail");
    panel.innerHTML = `
      <div class="detail-head">
        <span class="tag ${c.field}">${esc(c.fieldLabel)}</span>
        <h3>${esc(c.title)} — 깊이 공부하기</h3>
        <button class="close" type="button">닫기 ✕</button>
      </div>
      <div class="detail-body">
        <div class="subhead">Deep Dive · 자세한 설명${profile.minutes <= 15 ? " (15분 코스: 핵심만)" : ""}</div>
        ${deep.map(sec => `
          <h4 class="accent-${c.field}">${esc(sec.h)}</h4>
          ${sec.p.map(p => `<p>${esc(p)}</p>`).join("")}`).join("")}
        <div class="subhead">Mind Map · 한눈에 정리</div>
        <div class="mindmap-box" id="mindmapBox"></div>
        <div class="subhead">Quiz · 이해했는지 확인 (${quiz.length}문제)</div>
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
    renderQuiz(panel.querySelector("#quizBox"), panel.querySelector("#quizScore"), quiz);
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

  function renderQuiz(box, scoreEl, quiz) {
    let answered = 0, correct = 0;
    quiz.forEach((item, qi) => {
      const div = document.createElement("div");
      div.className = "quiz-item";
      div.innerHTML = `
        <div class="quiz-q"><span class="qnum">Q${qi + 1}.</span>${esc(item.q)}</div>
        <div class="choices">${item.choices.map((ch, ci) =>
          `<button class="choice" type="button" data-ci="${ci}">${esc(ch)}</button>`).join("")}
        </div>
        <div class="explain">${esc(item.explain)}</div>`;
      const buttons = div.querySelectorAll(".choice");
      buttons.forEach(btn => btn.addEventListener("click", () => {
        const pick = Number(btn.dataset.ci);
        buttons.forEach(b => (b.disabled = true));
        buttons[item.answer].classList.add("correct");
        if (pick === item.answer) correct++;
        else btn.classList.add("wrong");
        div.querySelector(".explain").classList.add("show");
        answered++;
        if (answered === quiz.length) {
          scoreEl.textContent = `결과: ${correct} / ${quiz.length} 정답` +
            (correct === quiz.length ? " — 완벽해요! 🎉" :
             correct >= quiz.length / 2 ? " — 좋아요, 틀린 문제 해설만 다시 읽어보세요." :
             " — 딥다이브를 한 번 더 읽고 내일 다시 풀어보세요.");
        }
      }));
      box.appendChild(div);
    });
  }

  function renderNews() {
    $("#newsList").innerHTML = dayData.news.map(n => `
      <li><div class="headline">${esc(n.headline)}</div>
      <p>${esc(n.body)} <a class="src" href="${esc(n.url)}" target="_blank" rel="noopener">출처</a></p></li>`).join("");
  }

  function renderTrends() {
    $("#trendGrid").innerHTML = dayData.trends.map(t => `
      <div class="trend"><b>${esc(t.title)}</b>${esc(t.body)}
      ${t.url ? ` <a class="src" href="${esc(t.url)}" target="_blank" rel="noopener">출처</a>` : ""}</div>`).join("");
  }

  function renderPapers() {
    $("#paperList").innerHTML = dayData.papers.map(p => `
      <article class="paper"><h3>${esc(p.title)}</h3><p>${esc(p.desc)}</p></article>`).join("");
  }

  function renderArchive() {
    $("#archiveCols").textContent = profile.fields.map(f => FLABEL[f]).join(" / ");
    const body = $("#archiveBody");
    body.innerHTML = "";
    indexData.days.forEach((d, pos) => {
      const tr = document.createElement("tr");
      const topics = profile.fields.map(f => esc(d.topics[f] || "–")).join(" / ");
      tr.innerHTML = `<td>${d.day}</td><td>${esc(d.date)}</td><td colspan="4">${topics}</td>`;
      tr.addEventListener("click", () => showDay(pos));
      body.appendChild(tr);
    });
  }

  $("#settingsBtn").addEventListener("click", () => resetProfile());
  boot();
})();
