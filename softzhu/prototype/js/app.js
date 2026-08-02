/**
 * 智能体工作流引擎 V1.0 — 应用入口与路由
 * 软件全称：基于大语言模型的低代码智能体工作流构建系统
 */
window.AWApp = (function () {
  const pageTitles = {
    dashboard: "工作台总览",
    agents: "多智能体管理",
    workflow: "工作流编排",
    knowledge: "私有知识库",
    decision: "动态决策风控",
    publish: "发布与集成"
  };

  let currentPage = "dashboard";

  function showView(id) {
    document.querySelectorAll(".view").forEach(function (v) {
      v.classList.remove("active");
    });
    const el = document.getElementById(id);
    if (el) el.classList.add("active");
  }

  function navigate(page, options) {
    currentPage = page;
    const container = document.getElementById("page-container");
    const crumb = document.getElementById("breadcrumb");
    if (crumb) crumb.textContent = pageTitles[page] || page;

    document.querySelectorAll("#main-nav .nav-item").forEach(function (item) {
      item.classList.toggle("active", item.getAttribute("data-page") === page);
    });

    const renderer = window.AWPages && AWPages[page];
    if (typeof renderer === "function") {
      renderer(container, options || {});
    } else {
      container.innerHTML =
        '<div class="empty-state"><strong>页面未找到</strong>请从左侧导航重新进入</div>';
    }
  }

  function bindShell() {
    document.getElementById("login-form").addEventListener("submit", function (e) {
      e.preventDefault();
      showView("view-workspace");
      navigate("dashboard");
      AWUI.toast("欢迎使用智能体工作流引擎 V1.0");
    });

    document.getElementById("btn-logout").addEventListener("click", function () {
      showView("view-login");
      AWUI.toast("已安全退出");
    });

    document.querySelectorAll("#main-nav .nav-item").forEach(function (item) {
      item.addEventListener("click", function () {
        navigate(item.getAttribute("data-page"));
      });
    });

    document.getElementById("btn-notify").addEventListener("click", function () {
      document.getElementById("notify-overlay").classList.add("open");
      document.getElementById("notify-drawer").classList.add("open");
    });

    function closeNotify() {
      document.getElementById("notify-overlay").classList.remove("open");
      document.getElementById("notify-drawer").classList.remove("open");
    }

    document.getElementById("close-notify").addEventListener("click", closeNotify);
    document.getElementById("notify-overlay").addEventListener("click", closeNotify);

    document.getElementById("modal-close").addEventListener("click", AWUI.closeModal);
    document.getElementById("modal-overlay").addEventListener("click", AWUI.closeModal);

    const search = document.getElementById("global-search");
    search.addEventListener("keydown", function (e) {
      if (e.key !== "Enter") return;
      const q = search.value.trim();
      if (!q) return;
      const hitAgent = AWData.agents.find(function (a) {
        return a.name.indexOf(q) !== -1;
      });
      const hitKb = AWData.knowledgeBases.find(function (k) {
        return k.name.indexOf(q) !== -1;
      });
      if (hitAgent) {
        navigate("agents");
        AWUI.toast("已定位智能体：" + hitAgent.name);
      } else if (hitKb) {
        navigate("knowledge");
        AWUI.toast("已定位知识库：" + hitKb.name);
      } else if (q.indexOf("工作流") !== -1 || q.indexOf("流程") !== -1) {
        navigate("workflow");
        AWUI.toast("已打开工作流编排");
      } else {
        AWUI.toast("未找到匹配项，请尝试更精确的关键词", "warn");
      }
    });
  }

  function init() {
    bindShell();
    showView("view-login");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  return {
    navigate: navigate,
    getCurrentPage: function () {
      return currentPage;
    }
  };
})();
