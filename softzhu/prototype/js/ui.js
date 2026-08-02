/**
 * 智能体工作流引擎 V1.0 — 通用 UI 工具
 */
window.AWUI = (function () {
  const modalOverlay = () => document.getElementById("modal-overlay");
  const modal = () => document.getElementById("modal");
  const modalTitle = () => document.getElementById("modal-title");
  const modalBody = () => document.getElementById("modal-body");
  const modalFoot = () => document.getElementById("modal-foot");

  function toast(message, type) {
    const wrap = document.getElementById("toast-wrap");
    const el = document.createElement("div");
    el.className = "toast" + (type ? " " + type : "");
    el.textContent = message;
    wrap.appendChild(el);
    setTimeout(function () {
      el.style.opacity = "0";
      el.style.transition = "opacity 0.25s";
      setTimeout(function () {
        el.remove();
      }, 250);
    }, 2600);
  }

  function openModal(options) {
    modalTitle().textContent = options.title || "提示";
    modalBody().innerHTML = options.body || "";
    modalFoot().innerHTML = "";

    if (options.cancelText !== false) {
      const cancel = document.createElement("button");
      cancel.className = "btn btn-secondary btn-sm";
      cancel.textContent = options.cancelText || "取消";
      cancel.onclick = closeModal;
      modalFoot().appendChild(cancel);
    }

    if (options.confirmText) {
      const ok = document.createElement("button");
      ok.className = "btn btn-primary btn-sm";
      ok.textContent = options.confirmText;
      ok.onclick = function () {
        if (typeof options.onConfirm === "function") {
          options.onConfirm();
        }
        closeModal();
      };
      modalFoot().appendChild(ok);
    }

    modalOverlay().classList.add("open");
    modal().classList.add("open");
  }

  function closeModal() {
    modalOverlay().classList.remove("open");
    modal().classList.remove("open");
  }

  function statusTag(status) {
    const map = {
      "已发布": "tag",
      "运行中": "tag blue",
      "草稿": "tag warm",
      "已归档": "tag muted",
      "就绪": "tag",
      "向量化中": "tag warm",
      "在线": "tag",
      "调试中": "tag warm",
      "成功": "tag",
      "待人工": "tag warm",
      "重试中": "tag danger",
      "已索引": "tag",
      "处理中": "tag warm",
      "待向量化": "tag muted",
      "转人工复核": "tag warm",
      "自动通过": "tag",
      "待确认": "tag warm",
      "触发重试": "tag danger"
    };
    const cls = map[status] || "tag muted";
    return '<span class="' + cls + '">' + status + "</span>";
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function bindOnce(root, selector, event, handler) {
    const el = root.querySelector(selector);
    if (el) el.addEventListener(event, handler);
  }

  return {
    toast: toast,
    openModal: openModal,
    closeModal: closeModal,
    statusTag: statusTag,
    escapeHtml: escapeHtml,
    bindOnce: bindOnce
  };
})();
