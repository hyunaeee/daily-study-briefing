/* 온보딩 — 사용자별 프로필 수집 (localStorage 저장).
   서버 버전으로 갈 때는 saveProfile()에서 API 호출로 바꾸면 됩니다. */
(function () {
  const KEY = "dsb.profile";
  const FIELDS = [
    { id: "cs",  label: "CS · 컴퓨터과학", desc: "자료구조, 알고리즘, 네트워크, DB" },
    { id: "mkt", label: "마케팅", desc: "그로스, 브랜딩, 콘텐츠, 지표" },
    { id: "ai",  label: "AI", desc: "LLM, 딥러닝, 최신 연구" },
    { id: "dsg", label: "디자인", desc: "UI/UX, 타이포, 시각 원리" },
    { id: "pdt", label: "프로덕트", desc: "곧 추가 예정", soon: true },
    { id: "biz", label: "경제 · 비즈니스", desc: "곧 추가 예정", soon: true },
  ];
  const LEVELS = [
    { id: "beginner", label: "입문", desc: "개념을 처음 접해요" },
    { id: "intermediate", label: "중급", desc: "기본기는 있고, 체계를 잡고 싶어요" },
    { id: "advanced", label: "심화", desc: "깊이 있는 내용 위주로 볼래요" },
  ];
  const MINUTES = [
    { id: 15, label: "15분", desc: "핵심 요약 + 퀴즈 2문제" },
    { id: 30, label: "30분", desc: "딥다이브 + 퀴즈 전부" },
    { id: 60, label: "60분", desc: "딥다이브 + 퀴즈 + 실습까지" },
  ];

  window.getProfile = () => {
    try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; }
  };
  window.resetProfile = () => { localStorage.removeItem(KEY); startOnboarding(); };

  let draft, step;
  const overlay = () => document.getElementById("onboard");
  const card = () => document.getElementById("obCard");

  window.startOnboarding = function () {
    draft = { name: "", fields: [], level: null, minutes: null };
    step = 0;
    overlay().classList.add("show");
    render();
  };

  function finish() {
    localStorage.setItem(KEY, JSON.stringify(draft)); // 서버 버전: 여기서 POST /profile
    overlay().classList.remove("show");
    document.dispatchEvent(new CustomEvent("profile-ready"));
  }

  function dots() {
    return `<div class="ob-dots">${[0, 1, 2, 3].map(i =>
      `<span class="${i === step ? "on" : ""}"></span>`).join("")}</div>`;
  }

  function nav(nextEnabled, nextLabel) {
    return `<div class="ob-nav">
      ${step > 0 ? '<button class="ob-back" id="obBack" type="button">← 뒤로</button>' : "<span></span>"}
      ${dots()}
      <button class="ob-next" id="obNext" type="button" ${nextEnabled ? "" : "disabled"}>${nextLabel || "다음 →"}</button>
    </div>`;
  }

  function bindNav(onNext) {
    const back = document.getElementById("obBack");
    if (back) back.addEventListener("click", () => { step--; render(); });
    const next = document.getElementById("obNext");
    if (next) next.addEventListener("click", onNext);
  }

  function render() {
    const c = card();
    if (step === 0) {
      c.innerHTML = `
        <div class="ob-step-label">Step 1 / 4</div>
        <h2>어서 오세요! 👋<br>매일 아침, 나만의 학습 브리핑</h2>
        <p class="desc">뭐라고 불러드릴까요?</p>
        <input class="ob-input" id="obName" maxlength="20" placeholder="닉네임 (예: 현애)"
          value="${draft.name.replace(/"/g, "&quot;")}">
        ${nav(draft.name.trim().length > 0)}`;
      const input = document.getElementById("obName");
      input.addEventListener("input", () => {
        draft.name = input.value;
        document.getElementById("obNext").disabled = draft.name.trim().length === 0;
      });
      input.addEventListener("keydown", e => {
        if (e.key === "Enter" && draft.name.trim()) { step++; render(); }
      });
      bindNav(() => { draft.name = draft.name.trim(); step++; render(); });
      input.focus();
    } else if (step === 1) {
      c.innerHTML = `
        <div class="ob-step-label">Step 2 / 4</div>
        <h2>어떤 분야를 공부할까요?</h2>
        <p class="desc">여러 개 골라도 됩니다. 고른 분야만 매일 브리핑에 담깁니다.</p>
        <div class="ob-options grid2">${FIELDS.map(f => `
          <button class="ob-opt ${draft.fields.includes(f.id) ? "on" : ""}" type="button"
            data-id="${f.id}" ${f.soon ? "disabled" : ""}>${f.label}<small>${f.desc}</small></button>`).join("")}
        </div>
        ${nav(draft.fields.length > 0)}`;
      c.querySelectorAll(".ob-opt:not(:disabled)").forEach(btn =>
        btn.addEventListener("click", () => {
          const id = btn.dataset.id;
          draft.fields = draft.fields.includes(id)
            ? draft.fields.filter(x => x !== id) : [...draft.fields, id];
          btn.classList.toggle("on");
          document.getElementById("obNext").disabled = draft.fields.length === 0;
        }));
      bindNav(() => { step++; render(); });
    } else if (step === 2) {
      c.innerHTML = `
        <div class="ob-step-label">Step 3 / 4</div>
        <h2>지금 수준은 어느 정도인가요?</h2>
        <p class="desc">설명의 깊이를 맞추는 데 사용됩니다.</p>
        <div class="ob-options">${LEVELS.map(l => `
          <button class="ob-opt ${draft.level === l.id ? "on" : ""}" type="button"
            data-id="${l.id}">${l.label}<small>${l.desc}</small></button>`).join("")}
        </div>
        ${nav(!!draft.level)}`;
      c.querySelectorAll(".ob-opt").forEach(btn =>
        btn.addEventListener("click", () => {
          draft.level = btn.dataset.id;
          c.querySelectorAll(".ob-opt").forEach(b => b.classList.toggle("on", b === btn));
          document.getElementById("obNext").disabled = false;
        }));
      bindNav(() => { step++; render(); });
    } else {
      c.innerHTML = `
        <div class="ob-step-label">Step 4 / 4</div>
        <h2>하루에 얼마나 공부할까요?</h2>
        <p class="desc">시간에 맞춰 분량을 조절합니다.</p>
        <div class="ob-options">${MINUTES.map(m => `
          <button class="ob-opt ${draft.minutes === m.id ? "on" : ""}" type="button"
            data-id="${m.id}">하루 ${m.label}<small>${m.desc}</small></button>`).join("")}
        </div>
        ${nav(!!draft.minutes, "시작하기 🚀")}`;
      c.querySelectorAll(".ob-opt").forEach(btn =>
        btn.addEventListener("click", () => {
          draft.minutes = Number(btn.dataset.id);
          c.querySelectorAll(".ob-opt").forEach(b => b.classList.toggle("on", b === btn));
          document.getElementById("obNext").disabled = false;
        }));
      bindNav(finish);
    }
  }
})();
