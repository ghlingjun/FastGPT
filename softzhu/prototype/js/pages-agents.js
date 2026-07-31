/**
 * 多智能体全生命周期管理页面
 */
window.AWPages = window.AWPages || {};

window.AWPages.agents = function (container, options) {
  options = options || {};
  let filter = "全部";
  let keyword = "";

  function render() {
    const list = AWData.agents.filter(function (a) {
      const okStatus = filter === "全部" || a.status === filter;
      const q = keyword.trim().toLowerCase();
      const okKw =
        !q ||
        a.name.toLowerCase().includes(q) ||
        a.domain.toLowerCase().includes(q) ||
        a.type.toLowerCase().includes(q);
      return okStatus && okKw;
    });

    container.innerHTML =
      '<div class="page">' +
      '<div class="page-header">' +
      "<div><h2>多智能体全生命周期管理</h2>" +
      "<p>支持多类型、多领域智能体的在线创建、属性配置、权限控制及版本备份，满足多场景隔离与协同。</p></div>" +
      '<div class="page-actions">' +
      '<button class="btn btn-secondary btn-sm" id="btn-import">导入配置</button>' +
      '<button class="btn btn-primary btn-sm" id="btn-create-agent">创建智能体</button>' +
      "</div></div>" +
      '<div class="toolbar-row">' +
      '<div class="tabs" id="agent-tabs">' +
      tab("全部") +
      tab("已发布") +
      tab("运行中") +
      tab("草稿") +
      tab("已归档") +
      "</div>" +
      '<input type="search" id="agent-search" placeholder="按名称 / 领域 / 类型筛选" style="width:220px;padding:8px 12px;background:var(--bg-panel);border:1px solid var(--border);border-radius:8px" value="' +
      AWUI.escapeHtml(keyword) +
      '" />' +
      "</div>" +
      '<div class="card-grid">' +
      list
        .map(function (a) {
          return (
            '<div class="entity-card" data-id="' +
            a.id +
            '">' +
            '<div class="card-top"><h4>' +
            AWUI.escapeHtml(a.name) +
            "</h4>" +
            AWUI.statusTag(a.status) +
            "</div>" +
            '<div class="filter-group">' +
            '<span class="tag blue">' +
            a.domain +
            "</span>" +
            '<span class="tag muted">' +
            a.type +
            "</span>" +
            '<span class="tag warm">' +
            a.version +
            "</span></div>" +
            '<p class="desc">' +
            AWUI.escapeHtml(a.desc) +
            "</p>" +
            '<div class="card-meta"><span>负责人：' +
            a.owner +
            "</span><span>更新 " +
            a.updatedAt +
            "</span></div>" +
            '<div class="actions" style="display:flex;gap:6px">' +
            '<button class="btn btn-secondary btn-sm btn-config" data-id="' +
            a.id +
            '">配置</button>' +
            '<button class="btn btn-ghost btn-sm btn-version" data-id="' +
            a.id +
            '">版本</button>' +
            '<button class="btn btn-ghost btn-sm btn-perm" data-id="' +
            a.id +
            '">权限</button>' +
            "</div></div>"
          );
        })
        .join("") +
      (list.length ? "" : '<div class="empty-state" style="grid-column:1/-1"><strong>无匹配智能体</strong>请调整筛选条件或新建智能体</div>') +
      "</div></div>";

    function tab(name) {
      return (
        '<button class="tab' +
        (filter === name ? " active" : "") +
        '" data-filter="' +
        name +
        '">' +
        name +
        "</button>"
      );
    }

    container.querySelectorAll("#agent-tabs .tab").forEach(function (t) {
      t.onclick = function () {
        filter = t.getAttribute("data-filter");
        render();
      };
    });

    const search = container.querySelector("#agent-search");
    search.oninput = function () {
      keyword = search.value;
    };
    search.onkeydown = function (e) {
      if (e.key === "Enter") render();
    };
    search.onblur = function () {
      render();
    };

    container.querySelector("#btn-create-agent").onclick = openCreate;
    container.querySelector("#btn-import").onclick = function () {
      AWUI.toast("已模拟导入智能体配置包", "warn");
    };

    container.querySelectorAll(".btn-config").forEach(function (btn) {
      btn.onclick = function (e) {
        e.stopPropagation();
        const agent = AWData.agents.find(function (x) {
          return x.id === btn.getAttribute("data-id");
        });
        openConfig(agent);
      };
    });

    container.querySelectorAll(".btn-version").forEach(function (btn) {
      btn.onclick = function (e) {
        e.stopPropagation();
        const agent = AWData.agents.find(function (x) {
          return x.id === btn.getAttribute("data-id");
        });
        AWUI.openModal({
          title: "版本备份 — " + agent.name,
          body:
            "<p style='color:var(--text-muted);margin-bottom:12px;font-size:13px'>当前版本 <strong>" +
            agent.version +
            "</strong>。系统自动保留最近 10 个历史版本，支持一键回滚。</p>" +
            "<ul style='font-size:13px;line-height:2'>" +
            "<li>" +
            agent.version +
            " · 当前 · " +
            agent.updatedAt +
            "</li>" +
            "<li>v" +
            prev(agent.version) +
            " · 备份 · 2026-06-01</li>" +
            "<li>v" +
            prev(prev(agent.version)) +
            " · 备份 · 2026-05-12</li>" +
            "</ul>",
          confirmText: "创建备份",
          onConfirm: function () {
            AWUI.toast("已创建版本备份 " + agent.version);
          }
        });
      };
    });

    container.querySelectorAll(".btn-perm").forEach(function (btn) {
      btn.onclick = function (e) {
        e.stopPropagation();
        const agent = AWData.agents.find(function (x) {
          return x.id === btn.getAttribute("data-id");
        });
        AWUI.openModal({
          title: "权限控制 — " + agent.name,
          body:
            '<div class="field"><label>可见范围</label><select><option>本部门</option><option selected>本租户</option><option>跨租户只读</option></select></div>' +
            '<div class="field"><label>可编辑角色</label><select><option>管理员</option><option selected>管理员 + 开发者</option></select></div>' +
            '<div class="field"><label>可调用角色</label><select><option selected>全员（鉴权后）</option><option>指定应用密钥</option></select></div>',
          confirmText: "保存权限",
          onConfirm: function () {
            AWUI.toast("权限配置已保存");
          }
        });
      };
    });
  }

  function prev(v) {
    const m = String(v).match(/v?(\d+)\.(\d+)\.(\d+)/);
    if (!m) return "1.0.0";
    return m[1] + "." + m[2] + "." + Math.max(0, Number(m[3]) - 1);
  }

  function openCreate() {
    AWUI.openModal({
      title: "创建智能体",
      body:
        '<div class="field"><label>名称</label><input id="f-name" placeholder="例如：供应链询价助手" /></div>' +
        '<div class="field"><label>所属领域</label><select id="f-domain"><option>政企</option><option>金融</option><option>医疗</option><option>制造</option></select></div>' +
        '<div class="field"><label>智能体类型</label><select id="f-type"><option>对话智能体</option><option>业务流程智能体</option><option>工具型智能体</option><option>多模态智能体</option></select></div>' +
        '<div class="field"><label>描述</label><textarea id="f-desc" placeholder="说明智能体目标场景与能力边界"></textarea></div>',
      confirmText: "创建",
      onConfirm: function () {
        const name = document.getElementById("f-name").value.trim() || "未命名智能体";
        const domain = document.getElementById("f-domain").value;
        const type = document.getElementById("f-type").value;
        const desc = document.getElementById("f-desc").value.trim() || "新建智能体，待完善配置。";
        AWData.agents.unshift({
          id: "ag-" + Date.now(),
          name: name,
          domain: domain,
          type: type,
          status: "草稿",
          version: "v0.1.0",
          owner: "管理员",
          desc: desc,
          updatedAt: "2026-06-30"
        });
        AWUI.toast("智能体「" + name + "」已创建");
        render();
      }
    });
  }

  function openConfig(agent) {
    AWUI.openModal({
      title: "属性配置 — " + agent.name,
      body:
        '<div class="field"><label>模型提供方</label><select><option>内置企业大模型</option><option>OpenAI 兼容接口</option><option>私有化部署模型</option></select></div>' +
        '<div class="field"><label>温度 Temperature</label><input type="number" value="0.3" min="0" max="2" step="0.1" /></div>' +
        '<div class="field"><label>系统提示词</label><textarea>你是「' +
        AWUI.escapeHtml(agent.name) +
        "」，面向" +
        agent.domain +
        "场景提供专业、可追溯的答复。严格依据知识库与工具结果，禁止臆造。</textarea></div>" +
        '<div class="field"><label>关联知识库</label><select><option>信贷制度汇编</option><option>临床路径手册</option><option>政务办事指南</option><option>设备工艺规范</option></select></div>',
      confirmText: "保存配置",
      onConfirm: function () {
        agent.updatedAt = "2026-06-30";
        AWUI.toast("属性配置已更新");
        render();
      }
    });
  }

  render();
  if (options.openCreate) {
    setTimeout(openCreate, 200);
  }
};
