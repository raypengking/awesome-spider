const PODCAST_FEED_URL =
  "https://r.jina.ai/https://feeds.simplecast.com/NgqJ2YQI";
const CACHE_KEY = "openwave-episodes-cache";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 小时

const FALLBACK_EPISODES = [
  {
    id: "fallback-frontier-weekly-0424",
    title: "大模型竞速：Claude 3.5、Gemini 1.5 与 GPT-5 的风向",
    description:
      "拆解一周内各大模型的升级与产品走向，讨论开放生态对开发者的机会。",
    date: "2024-04-24",
    tag: "产业速递",
    audio:
      "https://cdn.jsdelivr.net/gh/anaclumos/sample-hosting/audio/ai-weekly-0424.mp3",
    link: "#",
    transcript: "#",
    topics: ["模型更新", "行业动态"],
  },
];

let episodes = [];
let trendingTopics = [];
const savedEpisodes = new Set();

const episodeList = document.querySelector("#episode-list");
const topicFilter = document.querySelector("#topic-filter");
const episodeTemplate = document.querySelector("#episode-template");
const latestMeta = document.querySelector("#latest-meta");
const playLatestButton = document.querySelector("#play-latest");
const trendingContainer = document.querySelector("#trending-topics");
const topicTemplate = document.querySelector("#topic-template");
const newsletter = document.querySelector("#newsletter");
const subscribeHint = document.querySelector("#subscribe-hint");
const year = document.querySelector("#year");

year.textContent = new Date().getFullYear();

function stripHTML(value = "") {
  const tmp = document.createElement("div");
  tmp.innerHTML = value;
  return tmp.textContent || tmp.innerText || "";
}

function detectTopics(text) {
  const normalized = text.toLowerCase();
  const definitions = [
    {
      tag: "产业速递",
      topics: ["行业动态", "模型更新"],
      patterns: [
        /gpt/,
        /openai/,
        /anthropic/,
        /llm/,
        /模型/,
        /startup/,
        /企业/,
      ],
    },
    {
      tag: "技术专访",
      topics: ["工程实践", "开发者"],
      patterns: [
        /interview/,
        /builder/,
        /team/,
        /engineer/,
        /developer/,
        /对谈/,
        /访谈/,
      ],
    },
    {
      tag: "产品与工具",
      topics: ["应用落地", "工具评测"],
      patterns: [/tool/, /workflow/, /product/, /应用/, /tooling/, /平台/],
    },
    {
      tag: "伦理与政策",
      topics: ["安全对齐", "治理"],
      patterns: [
        /governance/,
        /policy/,
        /ethic/,
        /safety/,
        /regulation/,
        /合规/,
        /伦理/,
      ],
    },
    {
      tag: "研究洞察",
      topics: ["论文速递", "前沿探索"],
      patterns: [
        /research/,
        /paper/,
        /study/,
        /学术/,
        /state of ai/,
        /前沿/,
        /science/,
      ],
    },
  ];

  const matched = definitions.find((item) =>
    item.patterns.some((pattern) => pattern.test(normalized)),
  );

  if (matched) {
    return matched;
  }

  return { tag: "AI 观察", topics: ["趋势洞察"] };
}

function truncate(text, length = 140) {
  if (text.length <= length) return text;
  return `${text.slice(0, length - 1)}…`;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function renderEpisodes(items) {
  episodeList.innerHTML = "";

  items.forEach((episode) => {
    const node = episodeTemplate.content.cloneNode(true);
    node.querySelector(".episode__tag").textContent = episode.tag;
    node.querySelector(".episode__date").textContent = formatDate(episode.date);
    node.querySelector(".episode__title").textContent = episode.title;
    node.querySelector(".episode__desc").textContent = episode.description;

    const audio = node.querySelector(".episode__player");
    audio.src = episode.audio;
    audio.setAttribute("data-episode-id", episode.id);

    const pageLink = node.querySelectorAll(".episode__link")[0];
    pageLink.href = episode.link;
    pageLink.setAttribute("aria-label", `查看 ${episode.title} 的节目页`);

    const transcriptLink = node.querySelectorAll(".episode__link")[1];
    transcriptLink.href = episode.transcript;
    transcriptLink.setAttribute("aria-label", `查看 ${episode.title} 的文字稿`);

    const saveButton = node.querySelector(".episode__save");
    saveButton.addEventListener("click", () =>
      toggleSaveEpisode(episode.id, saveButton),
    );
    updateSaveButton(episode.id, saveButton);

    episodeList.appendChild(node);
  });

  if (items.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "没有找到符合条件的节目，换个关键词再试试。";
    empty.className = "episodes__empty";
    episodeList.appendChild(empty);
  }
}

function populateFilter() {
  topicFilter.querySelectorAll("option").forEach((option, index) => {
    if (index === 0) return;
    option.remove();
  });

  const topics = new Set();
  episodes.forEach((episode) => {
    episode.topics.forEach((topic) => topics.add(topic));
  });

  Array.from(topics)
    .sort()
    .forEach((topic) => {
      const option = document.createElement("option");
      option.value = topic;
      option.textContent = topic;
      topicFilter.appendChild(option);
    });
}

function handleFilterChange() {
  const value = topicFilter.value;
  if (value === "all") {
    renderEpisodes(episodes);
  } else {
    const filtered = episodes.filter((episode) =>
      episode.topics.includes(value),
    );
    renderEpisodes(filtered);
  }
}

function toggleSaveEpisode(id, button) {
  if (savedEpisodes.has(id)) {
    savedEpisodes.delete(id);
  } else {
    savedEpisodes.add(id);
  }

  updateSaveButton(id, button);
}

function updateSaveButton(id, button) {
  const saved = savedEpisodes.has(id);
  button.setAttribute("aria-pressed", saved);
  button.textContent = saved ? "★ 已加入稍后播放" : "☆ 加入稍后播放";
}

function renderLatestMeta() {
  const latest = episodes
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

  if (!latest) return;

  latestMeta.innerHTML = `
    <strong>${latest.title}</strong>
    <span> · </span>
    <time datetime="${latest.date}">${formatDate(latest.date)}</time>
  `;

  playLatestButton.addEventListener("click", () => {
    const targetPlayer = episodeList.querySelector(
      `.episode__player[data-episode-id="${latest.id}"]`,
    );
    if (targetPlayer) {
      targetPlayer.scrollIntoView({ behavior: "smooth", block: "center" });
      targetPlayer.focus({ preventScroll: true });
      targetPlayer.play().catch(() => {
        // 自动播放可能被浏览器阻止，无需额外提示
      });
    }
  });
}

function renderTrending() {
  trendingContainer.innerHTML = "";

  if (trendingTopics.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "暂未整理出热门话题，稍后再来看看。";
    empty.className = "topics__empty";
    trendingContainer.appendChild(empty);
    return;
  }

  trendingTopics.forEach((topic) => {
    const node = topicTemplate.content.cloneNode(true);
    node.querySelector("h3").textContent = topic.title;
    node.querySelector("p").textContent = topic.description;
    node.querySelector(".topic__count").textContent =
      `${topic.episodes} 集节目`;
    trendingContainer.appendChild(node);
  });
}

newsletter.addEventListener("submit", (event) => {
  event.preventDefault();
  const email = event.currentTarget.email.value.trim();
  subscribeHint.textContent = `${email} 已加入订阅列表，欢迎查收本周摘要！`;
  event.currentTarget.reset();
});

topicFilter.addEventListener("change", handleFilterChange);

function buildTrendingFromEpisodes(list) {
  const counter = new Map();
  list.forEach((episode) => {
    episode.topics.forEach((topic) => {
      counter.set(topic, (counter.get(topic) || 0) + 1);
    });
  });

  return Array.from(counter.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([topic, count]) => ({
      title: topic,
      description: `最近有 ${count} 集节目聚焦于「${topic}」，一起追踪这个趋势。`,
      episodes: count,
    }));
}

function cacheEpisodes(list) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ timestamp: Date.now(), data: list }),
    );
  } catch (error) {
    console.warn("缓存节目数据失败", error);
  }
}

function readCachedEpisodes() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > CACHE_TTL) return null;
    return parsed.data;
  } catch (error) {
    console.warn("读取缓存失败", error);
    return null;
  }
}

function transformFeed(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "application/xml");
  const items = Array.from(doc.querySelectorAll("item"));

  if (doc.querySelector("parsererror")) {
    throw new Error("播客源解析失败");
  }

  return items.slice(0, 24).map((item) => {
    const title = stripHTML(
      item.querySelector("title")?.textContent || "",
    ).trim();
    const description = truncate(
      stripHTML(item.querySelector("description")?.textContent || "").trim(),
    );
    const date = item.querySelector("pubDate")?.textContent;
    const link = item.querySelector("link")?.textContent || "#";
    const audio = item.querySelector("enclosure")?.getAttribute("url") || "#";

    const topicMeta = detectTopics(`${title} ${description}`);

    return {
      id: item.querySelector("guid")?.textContent || link || title,
      title: title || "未命名节目",
      description: description || "节目简介即将更新，敬请期待。",
      date: date ? new Date(date).toISOString() : new Date().toISOString(),
      tag: topicMeta.tag,
      audio,
      link,
      transcript: link,
      topics: topicMeta.topics || ["趋势洞察"],
    };
  });
}

async function loadEpisodes() {
  const cached = readCachedEpisodes();
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(PODCAST_FEED_URL, {
      headers: {
        "Cache-Control": "no-cache",
      },
    });

    if (!response.ok) {
      throw new Error(`加载播客源失败：${response.status}`);
    }

    const xmlText = await response.text();
    const parsed = transformFeed(xmlText);

    if (parsed.length === 0) {
      throw new Error("播客源为空");
    }

    cacheEpisodes(parsed);
    return parsed;
  } catch (error) {
    console.warn("实时节目加载失败，使用备用数据。", error);
    cacheEpisodes(FALLBACK_EPISODES);
    return FALLBACK_EPISODES;
  }
}

function setEpisodeStatus(message, variant = "info") {
  episodeList.innerHTML = "";
  const info = document.createElement("p");
  info.className = `episodes__status episodes__status--${variant}`;
  info.textContent = message;
  episodeList.appendChild(info);
}

async function init() {
  topicFilter.disabled = true;
  setEpisodeStatus("正在抓取最新节目，请稍候…");

  try {
    episodes = await loadEpisodes();
    trendingTopics = buildTrendingFromEpisodes(episodes);

    populateFilter();
    renderEpisodes(episodes);
    renderLatestMeta();
    renderTrending();

    if (episodes.length === 0) {
      setEpisodeStatus("暂未抓取到节目内容，稍后再来看看。", "warning");
    }
  } catch (error) {
    console.error("初始化页面失败", error);
    setEpisodeStatus("节目加载遇到问题，请刷新页面后重试。", "error");
  } finally {
    topicFilter.disabled = false;
  }
}

init();
