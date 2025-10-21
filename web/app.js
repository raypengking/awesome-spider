const config = readCoachConfig();
const PROGRESS_STORAGE_KEY = "survival-coach-progress-v1";

const FALLBACK_SCHEDULE = {
  date: "2025-10-21",
  streak: 5,
  user_id: "learner-demo",
  tasks: [
    {
      task_id: "t1",
      lesson_id: "L1-Intro",
      title: "自我介绍两句",
      duration_min: 12,
      status: "pending",
    },
    {
      task_id: "t2",
      lesson_id: "L1-Phonics-ae",
      title: "/æ/ 与 /e/ 对比",
      duration_min: 8,
      status: "pending",
    },
    {
      task_id: "t3",
      lesson_id: "Drill-Read-1",
      title: "20 秒跟读并打分",
      duration_min: 5,
      status: "pending",
      requires_score: true,
      target_text: "I am from Beijing. Nice to meet you.",
      score: 87,
      previous_scores: [80, 84, 87],
    },
  ],
};

const THEME_LIBRARY = {
  self_intro: {
    goal: "用 2 句完成自我介绍并礼貌问候",
    wordChunks: [
      {
        term: "Hello there",
        phonetic: "/həˈləʊ ðeə/",
        translation: "你好，你好呀",
      },
      {
        term: "I am …",
        phonetic: "/aɪ æm/",
        translation: "我是……",
      },
      {
        term: "from",
        phonetic: "/frɒm/",
        translation: "来自",
      },
      {
        term: "Nice to meet you",
        phonetic: "/naɪs tə miːt juː/",
        translation: "很高兴见到你",
      },
      {
        term: "Could you say that again?",
        phonetic: "/kʊd juː seɪ ðæt əˈɡen/",
        translation: "可以请你再说一次吗？",
      },
      {
        term: "pardon?",
        phonetic: "/ˈpɑːdn/",
        translation: "抱歉，能再说一遍吗？",
      },
    ],
    sentencePatterns: [
      {
        en: "I am {name}.",
        zh: "我是{name}。",
        slot: "{name} = Li Hua / Grace / Leo",
      },
      {
        en: "I am from {city}.",
        zh: "我来自{city}。",
        slot: "{city} = Beijing / Shanghai / Shenzhen",
      },
      {
        en: "I am into {hobby}.",
        zh: "我喜欢{hobby}。",
        slot: "{hobby} = basketball / movies / AI projects",
      },
    ],
    substitutionColumns: [
      {
        header: "{name}",
        items: ["Li Hua", "Grace", "Leo"],
      },
      {
        header: "{city}",
        items: ["Beijing", "Shanghai", "Shenzhen"],
      },
      {
        header: "{role}",
        items: ["a product designer", "an AI enthusiast", "a basketball fan"],
      },
    ],
    dialogue: {
      description: "工作坊破冰",
      lines: [
        { speaker: "You", text: "Hi, I'm ___ ." },
        { speaker: "Partner", text: "Nice to meet you! Where are you from?" },
        { speaker: "You", text: "I'm from ___, and I'm ___ ." },
        { speaker: "Partner", text: "Awesome! Let's stay in touch." },
      ],
    },
    shadowing: {
      steps: [
        {
          label: "慢速",
          text: "I am from Beijing. Nice to meet you.",
        },
        {
          label: "正常速",
          text: "I'm from Beijing. Nice to meet you.",
        },
      ],
      tip: "先跟着慢速咬字，再模仿正常语速中的连读。",
    },
    quiz: [
      {
        question: "“我来自上海”英文是？",
        options: [
          "A) I from Shanghai.",
          "B) I am from Shanghai.",
          "C) I am come from Shanghai.",
        ],
        answer: "B",
        explanation: "需要使用 be 动词 am 连接主语与介词短语。",
      },
      {
        question: "当你没听清时，哪句最礼貌？",
        options: [
          "A) What?",
          "B) Say again.",
          "C) Pardon, could you repeat that?",
        ],
        answer: "C",
        explanation: "加入 pardon / could you…? 形成礼貌缓冲。",
      },
      {
        question: "单词 cat 中元音 /æ/ 的口型特点是？",
        options: [
          "A) 嘴唇圆收，舌后缩",
          "B) 嘴巴张开呈扁平，舌前抬",
          "C) 嘴唇自然放松，舌尖抵上牙龈",
        ],
        answer: "B",
        explanation: "/æ/ 需要张开嘴角并抬高舌前部。",
      },
    ],
    homework: [
      {
        title: "录音 10 秒自我介绍",
        detail: "包含问候 + 城市 + 兴趣，发送给教练获取反馈。",
        recordable: true,
      },
      {
        title: "抄写 2 遍今日句型",
        detail: "I am … / I am from … / Nice to meet you.",
      },
      {
        title: "5 分钟 /æ/ vs /e/ 对比",
        detail: "对照单词：cat-cap, bed-bad, pen-pan，慢读后再加速。",
      },
    ],
    encouragement:
      "你的坚持已经 {streak} 天！今天完成后，我们会解锁 L1-Dialogue-1 挑战，对话更贴近真实场景。",
  },
};

const DEFAULT_PROGRESS = {
  weekStart: null,
  weeklyGoal: 21,
  weeklyCompleted: 0,
  completedTaskIds: [],
  monthlyAverageScore: 84,
  scoreHistory: [],
  weakestPhonemes: [
    { symbol: "/æ/", note: "cat, plan, answer" },
    { symbol: "/θ/", note: "think, healthy, birthday" },
  ],
  nextWeekFocus: ["L1-Dialogue-1", "职场寒暄", "元音巩固"],
  badges: [],
};

const state = {
  schedule: null,
  content: null,
  progress: loadProgress(),
  recorder: {
    mediaRecorder: null,
    stream: null,
    chunks: [],
  },
};

init();

async function init() {
  const today = new Date();
  const dateTarget = document.querySelector("#today-date");
  dateTarget.textContent = today.toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  await reloadSchedule();
  bindEvents();
}

async function reloadSchedule() {
  const schedule = await fetchTodaySchedule();
  state.schedule = enrichSchedule(schedule);
  state.progress = syncProgressWithSchedule(state.progress, state.schedule);
  state.content = buildContent(state.schedule, state.progress);
  renderAll();
}

function readCoachConfig() {
  const node = document.getElementById("coach-config");
  if (!node) return {};
  try {
    return JSON.parse(node.textContent.trim());
  } catch (error) {
    console.warn("无法解析配置，使用默认设置。", error);
    return {};
  }
}

function loadProgress() {
  if (typeof localStorage === "undefined") {
    return { ...DEFAULT_PROGRESS };
  }
  try {
    const stored = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!stored) {
      return { ...DEFAULT_PROGRESS };
    }
    const parsed = JSON.parse(stored);
    return { ...DEFAULT_PROGRESS, ...parsed };
  } catch (error) {
    console.warn("读取进度失败，使用默认值。", error);
    return { ...DEFAULT_PROGRESS };
  }
}

function saveProgress(progress) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
}

async function fetchTodaySchedule() {
  const endpoint = config.scheduleTodayEndpoint;
  if (!endpoint) {
    setStatus("已加载离线示例任务，配置后可接入正式日程接口。");
    return clone(FALLBACK_SCHEDULE);
  }

  try {
    const response = await fetch(endpoint, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`请求失败：${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn("获取今日任务失败，使用回退数据。", error);
    setStatus("获取日程失败，已切换到离线示例。");
    return clone(FALLBACK_SCHEDULE);
  }
}

function enrichSchedule(schedule) {
  const normalized = {
    date: schedule.date || new Date().toISOString().slice(0, 10),
    streak: schedule.streak ?? 0,
    user_id: schedule.user_id || config.userId || "learner-demo",
    tasks: Array.isArray(schedule.tasks) ? schedule.tasks : [],
  };

  normalized.tasks = normalized.tasks.map((task) => ({
    ...task,
    status: task.status || "pending",
    requires_score: Boolean(task.requires_score),
    previous_scores: task.previous_scores || [],
  }));

  return normalized;
}

function syncProgressWithSchedule(progress, schedule) {
  const next = { ...progress };
  const weekId = getWeekIdentifier(new Date(schedule.date));
  if (next.weekStart !== weekId) {
    next.weekStart = weekId;
    next.weeklyCompleted = 0;
    next.completedTaskIds = [];
  }

  const completedIds = new Set(next.completedTaskIds);
  schedule.tasks.forEach((task) => {
    if (task.status === "done") {
      completedIds.add(task.task_id);
    }
  });
  next.completedTaskIds = Array.from(completedIds);
  next.weeklyCompleted = next.completedTaskIds.length;

  // 如果任务里包含最新打分，则同步到历史
  const latestScore = extractLatestScore(schedule.tasks);
  if (latestScore !== null) {
    next.scoreHistory = mergeScoreHistory(
      next.scoreHistory,
      schedule.date,
      latestScore,
    );
    next.monthlyAverageScore = computeMonthlyAverage(next.scoreHistory);
  }

  saveProgress(next);
  return next;
}

function getWeekIdentifier(date) {
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const firstDay = new Date(target.getFullYear(), 0, 1);
  const pastDays = Math.floor((target - firstDay) / 86400000);
  const weekNumber = Math.floor((pastDays + firstDay.getDay()) / 7);
  return `${target.getFullYear()}-W${weekNumber}`;
}

function extractLatestScore(tasks) {
  const scoringTask = tasks.find(
    (task) => task.requires_score && (task.score || task.latest_score),
  );
  if (!scoringTask) return null;
  return scoringTask.score ?? scoringTask.latest_score ?? null;
}

function mergeScoreHistory(history, date, score) {
  const next = Array.isArray(history) ? [...history] : [];
  const existingIndex = next.findIndex((item) => item.date === date);
  if (existingIndex >= 0) {
    next[existingIndex] = { date, score };
  } else {
    next.push({ date, score });
  }
  return next.slice(-30);
}

function computeMonthlyAverage(history) {
  if (!history || history.length === 0)
    return DEFAULT_PROGRESS.monthlyAverageScore;
  const total = history.reduce((sum, item) => sum + (item.score || 0), 0);
  return Math.round(total / history.length);
}

function buildContent(schedule, progress) {
  const theme = inferTheme(schedule.tasks);
  const template = clone(THEME_LIBRARY[theme] || THEME_LIBRARY.self_intro);
  const scoringTask = schedule.tasks.find((task) => task.requires_score);
  const latestScore = determineLatestScore(scoringTask, progress);
  const breakdown = latestScore ? computeScoreBreakdown(latestScore) : null;

  template.goal = `📌 今日目标：${template.goal}`;
  template.shadowing.targetText =
    scoringTask?.target_text || "I am from Beijing. Nice to meet you.";
  template.shadowing.steps = template.shadowing.steps.map((step, index) => ({
    ...step,
    text:
      index === 0
        ? template.shadowing.targetText
        : toNaturalSpeed(template.shadowing.targetText),
  }));

  template.quiz = template.quiz.map((item) => ({
    ...item,
    status: item.answer ? "correct" : "practice",
  }));

  template.scoreSummary = breakdown
    ? {
        ...breakdown,
        taskTitle: scoringTask?.title || "口语跟读",
      }
    : null;

  template.progress = computeProgressMetrics(progress, latestScore, breakdown);
  template.reminderMessage = buildReminderMessage(schedule.tasks);
  template.encouragement = template.encouragement.replace(
    "{streak}",
    schedule.streak ?? 0,
  );
  template.encouragement = template.encouragement.replace(
    "{score}",
    latestScore ?? progress.monthlyAverageScore,
  );

  if (breakdown && breakdown.lowest && breakdown.lowest.value < 70) {
    template.homework = [
      {
        title: "5 分钟速练：最弱音素强化",
        detail: `${breakdown.lowest.label} 聚焦，使用最小对立组练习 ${breakdown.lowest.practice}.`,
        recordable: true,
      },
      ...template.homework,
    ];
  }

  if (breakdown && breakdown.lowest) {
    progress.weakestPhonemes = updateWeakestPhonemes(
      progress.weakestPhonemes,
      breakdown.lowest,
    );
    saveProgress(progress);
  }

  if (
    template.progress.badge &&
    !progress.badges.includes(template.progress.badge.id)
  ) {
    progress.badges.push(template.progress.badge.id);
    saveProgress(progress);
  }

  return template;
}

function inferTheme(tasks) {
  const joined = tasks.map((task) => task.title).join(" ");
  if (/自我介绍|intro|introduction/i.test(joined)) return "self_intro";
  return "self_intro";
}

function determineLatestScore(task, progress) {
  if (task?.score) return task.score;
  if (task?.latest_score) return task.latest_score;
  if (Array.isArray(task?.previous_scores) && task.previous_scores.length > 0) {
    return task.previous_scores[task.previous_scores.length - 1];
  }
  if (progress.scoreHistory.length > 0) {
    return progress.scoreHistory[progress.scoreHistory.length - 1].score;
  }
  return null;
}

function computeScoreBreakdown(score) {
  const pronunciation = clampScore(score - 1);
  const fluency = clampScore(score - 4);
  const intonation = clampScore(score - 3);
  const rhythm = clampScore(score - 6);

  const dimensions = [
    { label: "发音", value: pronunciation, hint: "张口度 + 元音拉长" },
    { label: "流利度", value: fluency, hint: "减少停顿，保持句子连贯" },
    { label: "语调", value: intonation, hint: "升降调匹配疑问/陈述" },
    { label: "节奏", value: rhythm, hint: "重读关键词，其余弱读" },
  ];

  const lowest = dimensions.reduce((acc, current) =>
    current.value < acc.value ? current : acc,
  );
  const improvement = `重点关注 ${lowest.label}：${lowest.hint}。`;
  const practice =
    lowest.label === "发音"
      ? "cat /æ/ vs. pet /e/"
      : lowest.label === "流利度"
        ? "连读 I_am / Nice_to"
        : lowest.label === "语调"
          ? "句尾降调 vs. 疑问升调"
          : "强弱拍 Clap-Say: I AM | from BEI-jing";

  return {
    total: score,
    dimensions,
    improvement,
    practice,
    lowest,
    practicePrompt: "设定 20 秒计时，重复朗读目标句并录音复听。",
  };
}

function clampScore(value) {
  return Math.max(55, Math.min(99, Math.round(value)));
}

function toNaturalSpeed(text) {
  return text
    .replace(/I am/gi, "I'm")
    .replace(/Nice to meet you/gi, "Nice t'meet you");
}

function computeProgressMetrics(progress, latestScore, breakdown) {
  const metrics = [
    {
      label: "本周完成",
      value: `${progress.weeklyCompleted}/${progress.weeklyGoal}`,
    },
    {
      label: "本月平均分",
      value: `${progress.monthlyAverageScore} 分`,
    },
    {
      label: "最弱音素 Top 2",
      value: progress.weakestPhonemes
        .map((item) => `${item.symbol}（${item.note}）`)
        .join("、"),
    },
    {
      label: "下周重点",
      value: progress.nextWeekFocus.join("、"),
    },
  ];

  const badgeUnlocked = checkChallengeUnlock(progress.scoreHistory);
  const badge = badgeUnlocked
    ? {
        id: "dialogue-explorer",
        name: "Dialogue Explorer",
        description: "连续 3 天 ≥ 80 分，解锁情景对话挑战！",
      }
    : null;

  if (badge && !metrics.find((item) => item.label === "徽章")) {
    metrics.push({ label: "徽章", value: `${badge.name} 🎖️` });
  }

  if (breakdown && breakdown.lowest) {
    metrics.push({ label: "今日改进", value: breakdown.improvement });
  }

  return { metrics, badge };
}

function checkChallengeUnlock(history) {
  if (!history || history.length < 3) return false;
  const lastThree = history.slice(-3);
  return lastThree.every((item) => item.score >= 80);
}

function updateWeakestPhonemes(current = [], lowest) {
  const mapping = {
    发音: { symbol: "/æ/", note: "cat, plan, answer" },
    流利度: { symbol: "连读", note: "I_am, Nice_to meet you" },
    语调: { symbol: "↗/↘", note: "陈述降调 vs. 疑问升调" },
    节奏: { symbol: "重音", note: "内容词重读，功能词弱读" },
  };
  const entry = mapping[lowest.label];
  if (!entry) return current;
  const filtered = current.filter((item) => item.symbol !== entry.symbol);
  return [entry, ...filtered].slice(0, 2);
}

function buildReminderMessage(tasks) {
  const titles = tasks
    .map((task) => task.title)
    .slice(0, 2)
    .join(" + ");
  return `今晚 20:30 学 10 分钟：${titles || "完成今日任务"}`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function renderAll() {
  renderGoal();
  renderWordChunks();
  renderSentencePatterns();
  renderPractice();
  renderShadowing();
  renderScore();
  renderQuiz();
  renderSchedule();
  renderProgress();
  renderHomework();
  renderEncouragement();
  renderStreak();
}

function renderGoal() {
  const goalText = document.querySelector("#goal-text");
  goalText.textContent = state.content.goal.replace("📌 今日目标：", "");
  document.querySelector("#goal-heading").textContent = state.content.goal;
}

function renderWordChunks() {
  const list = document.querySelector("#word-list");
  list.innerHTML = "";
  state.content.wordChunks.forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="word-term">${item.term}</span>
      <span class="word-phonetic">${item.phonetic}</span>
      <span class="word-translation">${item.translation}</span>
    `;
    list.appendChild(li);
  });
}

function renderSentencePatterns() {
  const list = document.querySelector("#sentence-list");
  list.innerHTML = "";
  state.content.sentencePatterns.forEach((pattern) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="sentence-en">${pattern.en}</span>
      <span class="sentence-zh">${pattern.zh}</span>
      <span class="sentence-slot">${pattern.slot}</span>
    `;
    list.appendChild(li);
  });
}

function renderPractice() {
  const table = document.querySelector("#substitution-table");
  table.innerHTML = "";
  const header = document.createElement("tr");
  state.content.substitutionColumns.forEach((column) => {
    const th = document.createElement("th");
    th.textContent = column.header;
    header.appendChild(th);
  });
  table.appendChild(header);

  const longest = Math.max(
    ...state.content.substitutionColumns.map((column) => column.items.length),
  );

  for (let rowIndex = 0; rowIndex < longest; rowIndex += 1) {
    const tr = document.createElement("tr");
    state.content.substitutionColumns.forEach((column) => {
      const td = document.createElement("td");
      td.textContent = column.items[rowIndex] || "";
      tr.appendChild(td);
    });
    table.appendChild(tr);
  }

  const dialogue = document.querySelector("#dialogue");
  dialogue.innerHTML = "";
  state.content.dialogue.lines.forEach((line) => {
    const p = document.createElement("p");
    p.className = "dialogue-line";
    const speaker = document.createElement("span");
    speaker.textContent = line.speaker;
    const textNode = document.createElement("span");
    textNode.className = "dialogue-blank";
    textNode.textContent = line.text;
    p.appendChild(speaker);
    p.appendChild(textNode);
    dialogue.appendChild(p);
  });
}

function renderShadowing() {
  const container = document.querySelector("#shadowing");
  container.innerHTML = "";
  state.content.shadowing.steps.forEach((step) => {
    const p = document.createElement("p");
    p.innerHTML = `<span class="shadowing__step">${step.label}</span> ${step.text}`;
    container.appendChild(p);
  });
  const hint = document.createElement("p");
  hint.textContent = state.content.shadowing.tip;
  container.appendChild(hint);

  const recordingHint = document.querySelector("#recording-hint");
  recordingHint.textContent =
    "点击“开始录音”后，先慢速读 1 遍，再尝试正常语速；录完回放自评并填写分数。";
}

function renderScore() {
  const summary = document.querySelector("#score-summary");
  summary.innerHTML = "";
  if (!state.content.scoreSummary) {
    const p = document.createElement("p");
    p.textContent = "尚未提交录音，完成后我会给出分数细分与改进建议。";
    summary.appendChild(p);
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "score-card__grid";

  const total = document.createElement("div");
  total.innerHTML = `
    <p class="score-total">${state.content.scoreSummary.total}</p>
    <p>${state.content.scoreSummary.taskTitle} 综合得分</p>
    <p>${state.content.scoreSummary.practicePrompt}</p>
  `;
  wrapper.appendChild(total);

  state.content.scoreSummary.dimensions.forEach((dimension) => {
    const box = document.createElement("div");
    box.className = "score-dimension";
    box.innerHTML = `
      <strong>${dimension.label} · ${dimension.value}</strong>
      <span>${dimension.hint}</span>
    `;
    wrapper.appendChild(box);
  });

  const improve = document.createElement("p");
  improve.textContent = `关键改进：${state.content.scoreSummary.improvement}`;

  summary.appendChild(wrapper);
  summary.appendChild(improve);
}

function renderQuiz() {
  const list = document.querySelector("#quiz-list");
  list.innerHTML = "";
  state.content.quiz.forEach((item, index) => {
    const li = document.createElement("li");
    li.className = "quiz-item";
    li.innerHTML = `
      <p class="quiz-item__question">Q${index + 1}. ${item.question}</p>
      <div class="quiz-item__options">
        ${item.options.map((option) => `<span>${option}</span>`).join("")}
      </div>
      <div class="quiz-item__result" data-status="${item.status}">
        ${item.status === "correct" ? "✅" : "🛠"} 正确答案：${item.answer}。${item.explanation}
      </div>
    `;
    list.appendChild(li);
  });
}

function renderSchedule() {
  const list = document.querySelector("#task-list");
  list.innerHTML = "";
  const lead = document.querySelector("#schedule-lead");
  lead.textContent = `预计总时长约 ${state.schedule.tasks.reduce(
    (sum, task) => sum + (task.duration_min || 0),
    0,
  )} 分钟 · streak ${state.schedule.streak} 天`;

  state.schedule.tasks.forEach((task) => {
    const li = document.createElement("li");
    const header = document.createElement("div");
    header.className = "task-header";

    const title = document.createElement("h3");
    title.className = "task-title";
    title.textContent = task.title;
    header.appendChild(title);

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.status === "done";
    checkbox.setAttribute("aria-label", `${task.title} 完成`);

    checkbox.addEventListener("change", () => {
      handleTaskToggle(task, checkbox);
    });

    header.appendChild(checkbox);

    const meta = document.createElement("p");
    meta.className = "task-meta";
    meta.textContent = `${task.duration_min} 分钟 · 课程 ${task.lesson_id}`;

    li.appendChild(header);
    li.appendChild(meta);

    if (task.requires_score) {
      const controls = document.createElement("div");
      controls.className = "task-controls";

      const label = document.createElement("label");
      label.setAttribute("for", `score-${task.task_id}`);
      label.textContent = "口语得分";

      const input = document.createElement("input");
      input.type = "number";
      input.id = `score-${task.task_id}`;
      input.min = 0;
      input.max = 100;
      input.step = 1;
      input.value = task.score ?? "";
      input.placeholder = "80-100";

      controls.appendChild(label);
      controls.appendChild(input);

      input.addEventListener("change", () => {
        task.score = Number(input.value) || null;
      });

      if (task.target_text) {
        const target = document.createElement("p");
        target.className = "task-target";
        target.textContent = `目标句：${task.target_text}`;
        li.appendChild(target);
      }

      li.appendChild(controls);
    }

    list.appendChild(li);
  });
}

function renderProgress() {
  const list = document.querySelector("#progress");
  list.innerHTML = "";
  state.content.progress.metrics.forEach((metric) => {
    const dt = document.createElement("dt");
    dt.textContent = metric.label;
    const dd = document.createElement("dd");
    dd.textContent = metric.value;
    list.appendChild(dt);
    list.appendChild(dd);
  });

  const card = document.querySelector("#progress-card");
  const existingBadge = card.querySelector(".progress-badge");
  if (existingBadge) {
    existingBadge.remove();
  }
  if (state.content.progress.badge) {
    const badge = document.createElement("div");
    badge.className = "progress-badge";
    badge.innerHTML = `
      <strong>${state.content.progress.badge.name}</strong>
      <span>${state.content.progress.badge.description}</span>
    `;
    card.appendChild(badge);
  }
}

function renderHomework() {
  const list = document.querySelector("#homework-list");
  list.innerHTML = "";
  state.content.homework.forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${item.title}${item.recordable ? " 🎙️" : ""}</strong>
      <span>${item.detail}</span>
    `;
    list.appendChild(li);
  });
}

function renderEncouragement() {
  const text = document.querySelector("#encouragement-text");
  text.textContent = state.content.encouragement;
}

function renderStreak() {
  const streakEl = document.querySelector("#header-streak");
  streakEl.textContent = `连击 ${state.schedule.streak} 天`;
}

function setStatus(message) {
  const region = document.querySelector("#status-region");
  region.textContent = message;
}

function bindEvents() {
  const notifyForm = document.querySelector("#notify-form");
  notifyForm.addEventListener("submit", (event) => {
    event.preventDefault();
    sendReminder();
  });

  const startBtn = document.querySelector("#record-start");
  const stopBtn = document.querySelector("#record-stop");
  const resetBtn = document.querySelector("#record-reset");
  const initBtn = document.querySelector("#init-plan");

  startBtn.addEventListener("click", startRecording);
  stopBtn.addEventListener("click", stopRecording);
  resetBtn.addEventListener("click", resetRecording);
  initBtn.addEventListener("click", triggerPlanInit);
}

async function handleTaskToggle(task, checkbox) {
  const completed = checkbox.checked;
  if (task.requires_score && completed) {
    if (!task.score) {
      setStatus("请先在“口语得分”栏输入分数，再勾选完成。");
      checkbox.checked = false;
      return;
    }
  }

  try {
    const response = await submitTaskUpdate(task, completed);
    if (response?.ok) {
      task.status = completed ? "done" : "pending";
      if (task.requires_score && completed) {
        state.progress.scoreHistory = mergeScoreHistory(
          state.progress.scoreHistory,
          state.schedule.date,
          task.score,
        );
        state.progress.monthlyAverageScore = computeMonthlyAverage(
          state.progress.scoreHistory,
        );
      }
      if (completed) {
        if (!state.progress.completedTaskIds.includes(task.task_id)) {
          state.progress.completedTaskIds.push(task.task_id);
        }
      } else {
        state.progress.completedTaskIds =
          state.progress.completedTaskIds.filter((id) => id !== task.task_id);
      }
      state.progress.weeklyCompleted = state.progress.completedTaskIds.length;
      if (response.streak) {
        state.schedule.streak = response.streak;
      }
      saveProgress(state.progress);
      state.content = buildContent(state.schedule, state.progress);
      renderAll();
      setStatus("已同步任务状态，继续保持！");
    } else {
      throw new Error("接口返回异常");
    }
  } catch (error) {
    console.error("更新任务失败", error);
    checkbox.checked = !completed;
    setStatus("任务更新失败，请稍后重试。");
  }
}

async function submitTaskUpdate(task, completed) {
  const endpointTemplate = config.scheduleTaskUpdateEndpoint;
  if (!endpointTemplate) {
    return { ok: true, streak: state.schedule.streak + (completed ? 1 : 0) };
  }
  const endpoint = endpointTemplate.replace("{task_id}", task.task_id);
  const payload = {
    status: completed ? "done" : "pending",
  };
  if (task.requires_score && completed) {
    payload.score = task.score;
  }

  const response = await fetch(endpoint, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`更新失败：${response.status}`);
  }
  return response.json();
}

async function sendReminder() {
  const channel = document.querySelector("#notify-channel").value;
  const message = state.content.reminderMessage;
  const endpoint = config.scheduleNotifyEndpoint;
  if (!endpoint) {
    setStatus(`已创建提醒（本地模拟）：${message}`);
    return;
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: state.schedule.user_id,
        channel,
        message,
      }),
    });
    if (!response.ok) throw new Error(`提醒失败：${response.status}`);
    setStatus("提醒已发送，20:30 见！");
  } catch (error) {
    console.error(error);
    setStatus("提醒发送失败，请检查配置后重试。");
  }
}

async function startRecording() {
  if (!navigator.mediaDevices?.getUserMedia) {
    setStatus("当前浏览器不支持录音，请更换到 Chrome 或 Edge 最新版。");
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    state.recorder.stream = stream;
    state.recorder.mediaRecorder = mediaRecorder;
    state.recorder.chunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        state.recorder.chunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(state.recorder.chunks, { type: "audio/webm" });
      const audio = document.querySelector("#recording-playback");
      audio.src = URL.createObjectURL(blob);
      audio.hidden = false;
      document.querySelector("#record-reset").hidden = false;
      setStatus("录音完成，回放听听是否达到目标语速。");
    };

    mediaRecorder.start();
    document.querySelector("#record-start").disabled = true;
    document.querySelector("#record-stop").disabled = false;
    setStatus("录音进行中，记得读两遍：慢速 → 正常速。");
  } catch (error) {
    console.error(error);
    setStatus("录音权限未开启，请允许麦克风或稍后重试。");
  }
}

function stopRecording() {
  const mediaRecorder = state.recorder.mediaRecorder;
  if (!mediaRecorder) return;
  mediaRecorder.stop();
  document.querySelector("#record-start").disabled = false;
  document.querySelector("#record-stop").disabled = true;
  if (state.recorder.stream) {
    state.recorder.stream.getTracks().forEach((track) => track.stop());
  }
}

function resetRecording() {
  const audio = document.querySelector("#recording-playback");
  audio.hidden = true;
  audio.removeAttribute("src");
  audio.load();
  document.querySelector("#record-reset").hidden = true;
  state.recorder.mediaRecorder = null;
  state.recorder.stream = null;
  state.recorder.chunks = [];
  setStatus("可以重新录音，争取更高分！");
}

async function triggerPlanInit() {
  const endpoint = config.scheduleInitEndpoint;
  if (!endpoint) {
    setStatus("已模拟生成 30 天计划，刷新后将继续使用离线示例。");
    await reloadSchedule();
    return;
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: state.schedule.user_id }),
    });
    if (!response.ok) throw new Error(`生成失败：${response.status}`);
    const data = await response.json().catch(() => ({}));
    const message = data?.next_suggest
      ? `已生成新计划：${data.next_suggest}`
      : "已生成新计划，请查看今日任务。";
    setStatus(message);
    await reloadSchedule();
  } catch (error) {
    console.error(error);
    setStatus("计划生成失败，请稍后重试。");
  }
}
