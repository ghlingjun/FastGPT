/**
 * 多渠道应用集成与发布页面
 */
window.AWPages = window.AWPages || {};

window.AWPages.publish = function (container) {
  function render() {
    container.innerHTML =
      '<div class="page">' +
      '<div class="page-header">' +
      "<div><h2>多渠道应用集成与发布</h2>" +
      "<p>将构建完成的智能体工作流一键发布为标准 API、H5 网页，并提供状态追踪与第三方系统对接能力。</p></div>" +
      '<div class="page-actions">' +
      '<button class="btn btn-primary btn-sm" id="pub-new">新建发布</button>' +
      "</div></div>" +
      '<div class="three-col" style="margin-bottom:20px">' +
      channel("API", "标准 API", "OpenAPI 兼容接口，支持同步/异步调用与签名鉴权。", "pub-api") +
      channel("H5", "H5 网页", "生成可嵌入的对话/表单页面，适配移动与桌面浏览器。", "pub-h5") +
      channel("↗", "Webhook", "事件回调至企业 ERP / OA / 业务中台。", "pub-hook") +
      "</div>" +
      '<div class="panel">' +
      '<div class="panel-head"><h3>已发布渠道</h3>' +
      '<span class="tag muted">状态追踪已开启</span></div>' +
      '<table class="data-table"><thead><tr>' +
      "<th>名称</th><th>渠道</th><th>端点</th><th>状态</th><th>调用量</th><th>更新</th><th>操作</th>" +
      "</tr></thead><tbody>" +
      AWData.publications
        .map(function (p) {
          return (
            "<tr><td>" +
            AWUI.escapeHtml(p.name) +
            "</td><td>" +
            p.channel +
            '</td><td><code style="font-size:11px">' +
            AWUI.escapeHtml(p.endpoint) +
            "</code></td><td>" +
            AWUI.statusTag(p.status) +
            "</td><td>" +
            p.calls.toLocaleString() +
            "</td><td>" +
            p.updatedAt +
            '</td><td class="actions">' +
            '<button class="btn btn-ghost btn-sm btn-docs" data-id="' +
            p.id +
            '">文档</button>' +
            '<button class="btn btn-ghost btn-sm btn-trace" data-id="' +
            p.id +
            '">追踪</button>' +
            '<button class="btn btn-secondary btn-sm btn-toggle" data-id="' +
            p.id +
            '">' +
            (p.status === "在线" ? "下线" : "上线") +
            "</button></td></tr>"
          );
        })
        .join("") +
      "</tbody></table></div>" +
      '<div class="panel" style="margin-top:16px">' +
      '<div class="panel-head"><h3>API 调用示例</h3><button class="btn btn-ghost btn-sm" id="copy-api">复制</button></div>' +
      '<div class="panel-body"><div class="code-block" id="api-sample">' +
      "POST /api/v1/agent/credit-review/run HTTP/1.1\n" +
      "Host: api.aw-engine.local\n" +
      "Authorization: Bearer &lt;YOUR_API_KEY&gt;\n" +
      "Content-Type: application/json\n\n" +
      "{\n" +
      '  "conversationId": "conv_demo_001",\n' +
      '  "variables": {\n' +
      '    "applicantId": "A20260630001",\n' +
      '    "amount": 500000\n' +
      "  },\n" +
      '  "stream": false\n' +
      "}\n\n" +
      "// 响应\n" +
      "{\n" +
      '  "runId": "run_88421",\n' +
      '  "status": "success",\n' +
      '  "data": { "decision": "pass_with_conditions", "score": 62 }\n' +
      "}" +
      "</div></div></div></div>";

    function channel(icon, title, desc, id) {
      return (
        '<div class="channel-card">' +
        '<div class="icon">' +
        icon +
        "</div><h4>" +
        title +
        "</h4><p>" +
        desc +
        '</p><button class="btn btn-secondary btn-sm" id="' +
        id +
        '">选择此渠道</button></div>'
      );
    }

    function openPublish(channelName) {
      AWUI.openModal({
        title: "新建发布 — " + channelName,
        body:
          '<div class="field"><label>关联工作流</label><select>' +
          AWData.workflows
            .map(function (w) {
              return "<option>" + AWUI.escapeHtml(w.name) + "</option>";
            })
            .join("") +
          "</select></div>" +
          '<div class="field"><label>发布名称</label><input placeholder="例如：信贷初审对外接口" /></div>' +
          '<div class="field"><label>访问控制</label><select><option>API Key</option><option>JWT</option><option>IP 白名单 + Key</option></select></div>' +
          (channelName === "H5 网页"
            ? '<div class="field"><label>主题色</label><input value="#2ec4b6" /></div>'
            : "") +
          '<div class="field"><label>启用状态追踪</label><select><option>开启</option><option>关闭</option></select></div>',
        confirmText: "发布",
        onConfirm: function () {
          AWData.publications.unshift({
            id: "pub-" + Date.now(),
            name: "新建" + channelName + "发布",
            channel: channelName,
            endpoint:
              channelName === "H5 网页"
                ? "https://demo.aw-engine.local/h5/new"
                : channelName === "Webhook"
                  ? "https://erp.example.com/hooks/new"
                  : "/api/v1/agent/new/run",
            status: "调试中",
            calls: 0,
            updatedAt: "2026-06-30"
          });
          AWUI.toast(channelName + " 发布任务已创建");
          render();
        }
      });
    }

    container.querySelector("#pub-new").onclick = function () {
      openPublish("标准 API");
    };
    container.querySelector("#pub-api").onclick = function () {
      openPublish("标准 API");
    };
    container.querySelector("#pub-h5").onclick = function () {
      openPublish("H5 网页");
    };
    container.querySelector("#pub-hook").onclick = function () {
      openPublish("Webhook");
    };

    container.querySelector("#copy-api").onclick = function () {
      AWUI.toast("调用示例已复制到剪贴板（演示）");
    };

    container.querySelectorAll(".btn-toggle").forEach(function (btn) {
      btn.onclick = function () {
        const p = AWData.publications.find(function (x) {
          return x.id === btn.getAttribute("data-id");
        });
        if (!p) return;
        p.status = p.status === "在线" ? "调试中" : "在线";
        AWUI.toast(p.name + " 已切换为「" + p.status + "」");
        render();
      };
    });

    container.querySelectorAll(".btn-docs").forEach(function (btn) {
      btn.onclick = function () {
        const p = AWData.publications.find(function (x) {
          return x.id === btn.getAttribute("data-id");
        });
        AWUI.openModal({
          title: "接口文档 — " + p.name,
          body:
            "<p style='font-size:13px;color:var(--text-muted);margin-bottom:10px'>渠道：" +
            p.channel +
            "</p>" +
            '<div class="code-block">Endpoint: ' +
            AWUI.escapeHtml(p.endpoint) +
            "\nMethod: POST\nAuth: Bearer Token\nContent-Type: application/json\n\nPath params: none\nQuery: dryRun?=false\nBody: { conversationId, variables, stream }</div>",
          confirmText: "关闭",
          cancelText: false
        });
      };
    });

    container.querySelectorAll(".btn-trace").forEach(function (btn) {
      btn.onclick = function () {
        const p = AWData.publications.find(function (x) {
          return x.id === btn.getAttribute("data-id");
        });
        AWUI.openModal({
          title: "状态追踪 — " + p.name,
          body:
            '<table class="data-table"><thead><tr><th>时间</th><th>RunId</th><th>状态</th><th>延迟</th></tr></thead><tbody>' +
            "<tr><td>10:24:11</td><td>run_88421</td><td>" +
            AWUI.statusTag("成功") +
            "</td><td>4.2s</td></tr>" +
            "<tr><td>10:21:03</td><td>run_88419</td><td>" +
            AWUI.statusTag("待人工") +
            "</td><td>—</td></tr>" +
            "<tr><td>10:18:40</td><td>run_88418</td><td>" +
            AWUI.statusTag("重试中") +
            "</td><td>6.1s</td></tr>" +
            "</tbody></table>",
          confirmText: "关闭",
          cancelText: false
        });
      };
    });
  }

  render();
};
