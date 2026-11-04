/**
 * 工作台总览页面
 */
window.AWPages = window.AWPages || {};

window.AWPages.dashboard = function (container) {
  const stats = AWData.dashboardStats;
  const runs = AWData.recentRuns;

  container.innerHTML =
    '<div class="page">' +
    '<div class="page-header">' +
    "<div><h2>工作台总览</h2>" +
    "<p>面向政企、金融、医疗及制造等行业，统一监控智能体、工作流、知识库与执行状态。</p></div>" +
    '<div class="page-actions">' +
    '<button class="btn btn-secondary btn-sm" id="dash-refresh">刷新指标</button>' +
    '<button class="btn btn-primary btn-sm" id="dash-create">新建智能体</button>' +
    "</div></div>" +
    '<div class="grid-stats">' +
    card("智能体总数", stats.agents, "+3 本周") +
    card("工作流数量", stats.workflows, "+5 本周") +
    card("知识库文档", stats.knowledgeDocs, "跨 4 个领域") +
    card("今日执行", stats.todayRuns, "成功率 " + stats.successRate) +
    "</div>" +
    '<div class="two-col">' +
    '<div class="panel">' +
    '<div class="panel-head"><h3>最近执行记录</h3>' +
    '<button class="btn btn-ghost btn-sm" data-goto="workflow">查看工作流</button></div>' +
    '<table class="data-table"><thead><tr>' +
    "<th>执行 ID</th><th>工作流</th><th>状态</th><th>耗时</th><th>时间</th>" +
    "</tr></thead><tbody>" +
    runs
      .map(function (r) {
        return (
          "<tr><td><code>" +
          r.id +
          "</code></td><td>" +
          AWUI.escapeHtml(r.flow) +
          "</td><td>" +
          AWUI.statusTag(r.status) +
          "</td><td>" +
          r.duration +
          "</td><td>" +
          r.time +
          "</td></tr>"
        );
      })
      .join("") +
    "</tbody></table></div>" +
    '<div class="panel">' +
    '<div class="panel-head"><h3>待办与风险提示</h3></div>' +
    '<div class="panel-body">' +
    '<div class="entity-card" style="cursor:default;margin-bottom:10px">' +
    '<div class="card-top"><h4>人工确认待处理</h4>' +
    AWUI.statusTag("待确认") +
    "</div>" +
    '<p class="desc">当前有 <strong>' +
    stats.pendingHuman +
    "</strong> 条执行链路等待人工确认，请进入「动态决策风控」处理。</p>" +
    '<div class="card-meta"><span>优先级：高</span>' +
    '<button class="btn btn-secondary btn-sm" data-goto="decision">立即处理</button></div></div>' +
    '<div class="entity-card" style="cursor:default">' +
    '<div class="card-top"><h4>知识库向量化</h4>' +
    AWUI.statusTag("向量化中") +
    "</div>" +
    '<p class="desc">「政务办事指南」向量化进度 72%，完成后可被智能体检索引用。</p>' +
    '<div class="progress-bar"><span style="width:72%"></span></div>' +
    '<div class="card-meta" style="margin-top:10px"><span>预计剩余 18 分钟</span>' +
    '<button class="btn btn-ghost btn-sm" data-goto="knowledge">查看知识库</button></div></div>' +
    "</div></div></div></div>";

  function card(label, value, delta) {
    return (
      '<div class="stat-card"><div class="label">' +
      label +
      '</div><div class="value">' +
      value +
      '</div><div class="delta">' +
      delta +
      "</div></div>"
    );
  }

  container.querySelector("#dash-refresh").onclick = function () {
    AWUI.toast("指标已刷新");
  };

  container.querySelector("#dash-create").onclick = function () {
    if (window.AWApp && AWApp.navigate) AWApp.navigate("agents", { openCreate: true });
  };

  container.querySelectorAll("[data-goto]").forEach(function (btn) {
    btn.onclick = function () {
      AWApp.navigate(btn.getAttribute("data-goto"));
    };
  });
};
