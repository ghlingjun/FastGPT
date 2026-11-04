/**
 * 可视化工作流编排引擎页面
 */
window.AWPages = window.AWPages || {};

window.AWPages.workflow = function (container) {
  let selectedId = null;
  let nodes = AWData.flowNodes.map(function (n) {
    return Object.assign({}, n);
  });
  const edges = AWData.flowEdges.slice();

  function render() {
    const selected = nodes.find(function (n) {
      return n.id === selectedId;
    });

    container.innerHTML =
      '<div class="page" style="height:100%;display:flex;flex-direction:column">' +
      '<div class="page-header" style="flex-shrink:0">' +
      "<div><h2>可视化工作流编排引擎</h2>" +
      "<p>将复杂业务流程拆解为可自动执行的节点序列，组合大模型、知识库、插件与 MCP，并内置分支、循环、并行与状态管理。</p></div>" +
      '<div class="page-actions">' +
      '<button class="btn btn-secondary btn-sm" id="wf-save">保存草稿</button>' +
      '<button class="btn btn-secondary btn-sm" id="wf-validate">校验编排</button>' +
      '<button class="btn btn-primary btn-sm" id="wf-run">试运行</button>' +
      "</div></div>" +
      '<div class="workflow-layout">' +
      '<aside class="node-palette"><h4>节点组件</h4>' +
      AWData.paletteNodes
        .map(function (p) {
          return (
            '<div class="palette-item" draggable="true" data-type="' +
            p.type +
            '" data-label="' +
            p.label +
            '"><span class="dot" style="background:' +
            p.color +
            '"></span>' +
            p.label +
            "</div>"
          );
        })
        .join("") +
      "</aside>" +
      '<div class="canvas-area">' +
      '<div class="canvas-toolbar">' +
      '<span class="tag">当前：信贷材料核验流程</span>' +
      '<span class="tag muted">节点 ' +
      nodes.length +
      "</span>" +
      '<button class="btn btn-ghost btn-sm" id="wf-fit">适应画布</button>' +
      "</div>" +
      '<div class="flow-canvas" id="flow-canvas">' +
      '<svg class="flow-svg" id="flow-svg"></svg>' +
      nodes
        .map(function (n) {
          const meta = AWData.paletteNodes.find(function (p) {
            return p.type === n.type;
          });
          return (
            '<div class="flow-node' +
            (selectedId === n.id ? " selected" : "") +
            '" data-id="' +
            n.id +
            '" style="left:' +
            n.x +
            "px;top:" +
            n.y +
            'px">' +
            '<div class="node-type" style="color:' +
            (meta ? meta.color : "#8fa3bf") +
            '">' +
            (meta ? meta.label : n.type) +
            "</div>" +
            '<div class="node-title">' +
            AWUI.escapeHtml(n.title) +
            "</div>" +
            '<div class="node-ports"><span>● 入</span><span>出 ●</span></div>' +
            "</div>"
          );
        })
        .join("") +
      "</div></div>" +
      '<aside class="inspector" id="inspector">' +
      (selected ? renderInspector(selected) : '<h4>节点属性</h4><p class="empty-hint">点击画布中的节点进行配置；也可从左侧拖拽组件到画布新增节点。</p>') +
      "</aside></div></div>";

    drawEdges();
    bindEvents();
  }

  function renderInspector(n) {
    return (
      "<h4>" +
      AWUI.escapeHtml(n.title) +
      "</h4>" +
      '<div class="field"><label>节点名称</label><input id="insp-title" value="' +
      AWUI.escapeHtml(n.title) +
      '" /></div>' +
      '<div class="field"><label>节点类型</label><input value="' +
      n.type +
      '" disabled /></div>' +
      (n.prompt !== undefined
        ? '<div class="field"><label>提示词</label><textarea id="insp-prompt">' +
          AWUI.escapeHtml(n.prompt) +
          "</textarea></div>"
        : "") +
      (n.kb !== undefined
        ? '<div class="field"><label>知识库</label><input id="insp-kb" value="' +
          AWUI.escapeHtml(n.kb) +
          '" /></div>' +
          '<div class="field"><label>TopK</label><input id="insp-topk" type="number" value="' +
          n.topK +
          '" /></div>'
        : "") +
      (n.condition !== undefined
        ? '<div class="field"><label>分支条件</label><input id="insp-cond" value="' +
          AWUI.escapeHtml(n.condition) +
          '" /></div>'
        : "") +
      (n.threshold !== undefined
        ? '<div class="field"><label>评估阈值</label><input id="insp-th" type="number" step="0.05" value="' +
          n.threshold +
          '" /></div>'
        : "") +
      (n.timeout !== undefined
        ? '<div class="field"><label>超时时间</label><input id="insp-to" value="' +
          n.timeout +
          '" /></div>'
        : "") +
      '<button class="btn btn-primary btn-sm btn-block" id="insp-save" style="margin-top:8px">应用更改</button>' +
      '<button class="btn btn-danger btn-sm btn-block" id="insp-del" style="margin-top:8px">删除节点</button>'
    );
  }

  function drawEdges() {
    const svg = document.getElementById("flow-svg");
    if (!svg) return;
    const map = {};
    nodes.forEach(function (n) {
      map[n.id] = n;
    });
    const paths = edges
      .map(function (e) {
        const a = map[e[0]];
        const b = map[e[1]];
        if (!a || !b) return "";
        const x1 = a.x + 180;
        const y1 = a.y + 40;
        const x2 = b.x;
        const y2 = b.y + 40;
        const mx = (x1 + x2) / 2;
        return (
          '<path d="M' +
          x1 +
          " " +
          y1 +
          " C" +
          mx +
          " " +
          y1 +
          "," +
          mx +
          " " +
          y2 +
          "," +
          x2 +
          " " +
          y2 +
          '" />'
        );
      })
      .join("");
    svg.innerHTML = paths;
  }

  function bindEvents() {
    container.querySelectorAll(".flow-node").forEach(function (el) {
      el.onclick = function (e) {
        e.stopPropagation();
        selectedId = el.getAttribute("data-id");
        render();
      };
      enableDrag(el);
    });

    container.querySelectorAll(".palette-item").forEach(function (item) {
      item.addEventListener("dragstart", function (e) {
        e.dataTransfer.setData(
          "text/plain",
          JSON.stringify({
            type: item.getAttribute("data-type"),
            label: item.getAttribute("data-label")
          })
        );
      });
    });

    const canvas = container.querySelector("#flow-canvas");
    canvas.addEventListener("dragover", function (e) {
      e.preventDefault();
    });
    canvas.addEventListener("drop", function (e) {
      e.preventDefault();
      try {
        const data = JSON.parse(e.dataTransfer.getData("text/plain"));
        const rect = canvas.getBoundingClientRect();
        const id = "n" + Date.now();
        nodes.push({
          id: id,
          type: data.type,
          title: data.label,
          x: Math.max(20, e.clientX - rect.left - 90),
          y: Math.max(60, e.clientY - rect.top - 30),
          prompt: data.type === "llm" ? "请输入提示词" : undefined
        });
        selectedId = id;
        AWUI.toast("已添加节点：「" + data.label + "」");
        render();
      } catch (err) {
        /* ignore */
      }
    });

    container.querySelector("#wf-save").onclick = function () {
      AWUI.toast("工作流草稿已保存");
    };
    container.querySelector("#wf-validate").onclick = function () {
      AWUI.openModal({
        title: "编排校验结果",
        body:
          "<ul style='line-height:2;font-size:13px'>" +
          "<li>✓ 起始节点唯一</li>" +
          "<li>✓ 所有节点可达</li>" +
          "<li>✓ 分支条件表达式合法</li>" +
          "<li>✓ 人工确认节点已配置超时策略</li>" +
          "<li style='color:var(--accent-warm)'>⚠ 建议为「质量评估」配置失败回退边</li>" +
          "</ul>",
        confirmText: "知道了",
        cancelText: false
      });
    };
    container.querySelector("#wf-run").onclick = function () {
      AWUI.openModal({
        title: "试运行",
        body:
          '<div class="field"><label>输入（JSON）</label><textarea id="run-input">{\n  "applicantId": "A20260630001",\n  "amount": 500000,\n  "product": "经营贷"\n}</textarea></div>',
        confirmText: "开始执行",
        onConfirm: function () {
          AWUI.toast("试运行已启动，执行 ID：run-" + Math.floor(Math.random() * 90000 + 10000));
        }
      });
    };
    container.querySelector("#wf-fit").onclick = function () {
      AWUI.toast("画布已重置视图");
    };

    const saveBtn = container.querySelector("#insp-save");
    if (saveBtn) {
      saveBtn.onclick = function () {
        const n = nodes.find(function (x) {
          return x.id === selectedId;
        });
        if (!n) return;
        const title = container.querySelector("#insp-title");
        if (title) n.title = title.value;
        const prompt = container.querySelector("#insp-prompt");
        if (prompt) n.prompt = prompt.value;
        const kb = container.querySelector("#insp-kb");
        if (kb) n.kb = kb.value;
        const topk = container.querySelector("#insp-topk");
        if (topk) n.topK = Number(topk.value);
        const cond = container.querySelector("#insp-cond");
        if (cond) n.condition = cond.value;
        const th = container.querySelector("#insp-th");
        if (th) n.threshold = Number(th.value);
        const to = container.querySelector("#insp-to");
        if (to) n.timeout = to.value;
        AWUI.toast("节点属性已更新");
        render();
      };
    }

    const delBtn = container.querySelector("#insp-del");
    if (delBtn) {
      delBtn.onclick = function () {
        nodes = nodes.filter(function (x) {
          return x.id !== selectedId;
        });
        selectedId = null;
        AWUI.toast("节点已删除", "warn");
        render();
      };
    }
  }

  function enableDrag(el) {
    let dragging = false;
    let ox = 0;
    let oy = 0;
    el.addEventListener("mousedown", function (e) {
      if (e.button !== 0) return;
      dragging = true;
      const n = nodes.find(function (x) {
        return x.id === el.getAttribute("data-id");
      });
      ox = e.clientX - n.x;
      oy = e.clientY - n.y;
      e.preventDefault();

      function onMove(ev) {
        if (!dragging) return;
        n.x = Math.max(0, ev.clientX - ox);
        n.y = Math.max(40, ev.clientY - oy);
        el.style.left = n.x + "px";
        el.style.top = n.y + "px";
        drawEdges();
      }
      function onUp() {
        dragging = false;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      }
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  }

  render();
};
