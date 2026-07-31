/**
 * 动态决策与风险控制页面
 */
window.AWPages = window.AWPages || {};

window.AWPages.decision = function (container) {
  let tab = "pending";

  function render() {
    const pending = AWData.decisions.filter(function (d) {
      return d.result === "待确认" || d.result === "转人工复核";
    });
    const all = AWData.decisions;

    container.innerHTML =
      '<div class="page">' +
      '<div class="page-header">' +
      "<div><h2>动态决策与风险控制机制</h2>" +
      "<p>在结构化工作流中嵌入智能决策与人工确认节点，动态调整路径并拦截长链路累积误差。</p></div>" +
      '<div class="page-actions">' +
      '<button class="btn btn-secondary btn-sm" id="dec-policy">策略配置</button>' +
      "</div></div>" +
      '<div class="grid-stats">' +
      '<div class="stat-card"><div class="label">待人工确认</div><div class="value">' +
      pending.length +
      '</div><div class="delta">需在 SLA 内处理</div></div>' +
      '<div class="stat-card"><div class="label">今日自动通过</div><div class="value">186</div><div class="delta">占比 82%</div></div>' +
      '<div class="stat-card"><div class="label">触发重试</div><div class="value">14</div><div class="delta">已回退修正</div></div>' +
      '<div class="stat-card"><div class="label">平均风险分</div><div class="value">36</div><div class="delta">低于警戒线</div></div>' +
      "</div>" +
      '<div class="tabs">' +
      '<button class="tab' +
      (tab === "pending" ? " active" : "") +
      '" data-tab="pending">待处理</button>' +
      '<button class="tab' +
      (tab === "all" ? " active" : "") +
      '" data-tab="all">全部决策记录</button>' +
      '<button class="tab' +
      (tab === "policy" ? " active" : "") +
      '" data-tab="policy">风控策略</button>' +
      "</div>" +
      (tab === "policy" ? renderPolicy() : renderList(tab === "pending" ? pending : all)) +
      "</div>";

    container.querySelectorAll(".tabs .tab").forEach(function (t) {
      t.onclick = function () {
        tab = t.getAttribute("data-tab");
        render();
      };
    });

    container.querySelector("#dec-policy").onclick = function () {
      tab = "policy";
      render();
    };

    container.querySelectorAll(".btn-approve").forEach(function (btn) {
      btn.onclick = function () {
        const item = AWData.decisions.find(function (d) {
          return d.id === btn.getAttribute("data-id");
        });
        if (item) {
          item.result = "自动通过";
          item.risk = Math.min(item.risk, 30);
          AWUI.toast("已确认通过：" + item.node);
          render();
        }
      };
    });

    container.querySelectorAll(".btn-reject").forEach(function (btn) {
      btn.onclick = function () {
        const item = AWData.decisions.find(function (d) {
          return d.id === btn.getAttribute("data-id");
        });
        if (item) {
          item.result = "触发重试";
          AWUI.toast("已驳回并触发回退重试", "warn");
          render();
        }
      };
    });

    container.querySelectorAll(".btn-detail").forEach(function (btn) {
      btn.onclick = function () {
        const item = AWData.decisions.find(function (d) {
          return d.id === btn.getAttribute("data-id");
        });
        openDetail(item);
      };
    });

    const savePolicy = container.querySelector("#save-policy");
    if (savePolicy) {
      savePolicy.onclick = function () {
        AWUI.toast("风控策略已保存并即时生效");
      };
    }
  }

  function renderList(list) {
    if (!list.length) {
      return '<div class="panel"><div class="empty-state"><strong>暂无待处理项</strong>当前队列已清空</div></div>';
    }
    return (
      '<div class="panel"><table class="data-table"><thead><tr>' +
      "<th>时间</th><th>工作流</th><th>决策节点</th><th>风险</th><th>结果</th><th>原因摘要</th><th>操作</th>" +
      "</tr></thead><tbody>" +
      list
        .map(function (d) {
          const needAction = d.result === "待确认" || d.result === "转人工复核";
          return (
            "<tr><td>" +
            d.time +
            "</td><td>" +
            AWUI.escapeHtml(d.flow) +
            "</td><td>" +
            AWUI.escapeHtml(d.node) +
            '</td><td><div class="risk-meter" style="min-width:100px"><div class="bar"><span class="needle" style="left:' +
            d.risk +
            '%"></span></div><span style="font-size:12px">' +
            d.risk +
            "</span></div></td><td>" +
            AWUI.statusTag(d.result) +
            '</td><td style="max-width:240px;font-size:12px;color:var(--text-muted)">' +
            AWUI.escapeHtml(d.reason) +
            '</td><td class="actions">' +
            (needAction
              ? '<button class="btn btn-primary btn-sm btn-approve" data-id="' +
                d.id +
                '">通过</button>' +
                '<button class="btn btn-danger btn-sm btn-reject" data-id="' +
                d.id +
                '">驳回</button>'
              : "") +
            '<button class="btn btn-ghost btn-sm btn-detail" data-id="' +
            d.id +
            '">详情</button></td></tr>'
          );
        })
        .join("") +
      "</tbody></table></div>"
    );
  }

  function renderPolicy() {
    return (
      '<div class="two-col">' +
      '<div class="panel"><div class="panel-head"><h3>动态决策规则</h3></div><div class="panel-body">' +
      '<div class="field"><label>高风险阈值（≥ 转人工）</label><input type="number" value="70" /></div>' +
      '<div class="field"><label>模型置信度下限</label><input type="number" step="0.05" value="0.75" /></div>' +
      '<div class="field"><label>自动评估未通过时</label><select><option>回退并重试（最多 2 次）</option><option>转人工确认</option><option>终止并告警</option></select></div>' +
      '<div class="field"><label>并行分支合并策略</label><select><option>全部成功后继续</option><option>任一成功即可</option><option>按权重投票</option></select></div>' +
      '<button class="btn btn-primary btn-sm" id="save-policy">保存策略</button>' +
      "</div></div>" +
      '<div class="panel"><div class="panel-head"><h3>典型决策链路示意</h3></div><div class="panel-body">' +
      '<div class="decision-timeline">' +
      step("大模型输出", "生成初审意见与风险特征") +
      step("自动评估", "校验字段完整性与规则符合度") +
      step("动态分支", "风险分 ≥70 进入人工确认，否则直出") +
      step("人工确认 / 重试", "不合格输出触发路径调整或回退") +
      step("结果交付", "写入审计日志并对外返回") +
      "</div></div></div></div>"
    );
  }

  function step(title, desc) {
    return (
      '<div class="timeline-item"><div class="timeline-dot"></div><div class="timeline-body"><h5>' +
      title +
      "</h5><p>" +
      desc +
      "</p></div></div>"
    );
  }

  function openDetail(item) {
    AWUI.openModal({
      title: "决策详情 — " + item.node,
      body:
        '<div class="field"><label>工作流</label><input value="' +
        AWUI.escapeHtml(item.flow) +
        '" disabled /></div>' +
        '<div class="field"><label>结果</label><div>' +
        AWUI.statusTag(item.result) +
        "</div></div>" +
        '<div class="field"><label>风险分</label><input value="' +
        item.risk +
        '" disabled /></div>' +
        '<div class="field"><label>决策原因</label><textarea disabled>' +
        AWUI.escapeHtml(item.reason) +
        "</textarea></div>" +
        '<div class="field"><label>审计追踪</label><div class="code-block">traceId: trc_' +
        item.id +
        "\nnode: " +
        item.node +
        "\ntimestamp: " +
        item.time +
        "\noperator: system|human</div></div>",
      confirmText: "关闭",
      cancelText: false
    });
  }

  render();
};
