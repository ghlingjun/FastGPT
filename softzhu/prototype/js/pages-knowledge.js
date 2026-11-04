/**
 * 企业级私有知识库管理页面
 */
window.AWPages = window.AWPages || {};

window.AWPages.knowledge = function (container) {
  let activeKb = AWData.knowledgeBases[0].id;
  let searchQuery = "";
  let searchResults = null;

  function render() {
    const kb = AWData.knowledgeBases.find(function (k) {
      return k.id === activeKb;
    });

    container.innerHTML =
      '<div class="page">' +
      '<div class="page-header">' +
      "<div><h2>企业级私有知识库管理</h2>" +
      "<p>支持多源异构文档向量化与精准检索，通过 RAG 架构为企业智能体提供本地化、私有化知识支撑。</p></div>" +
      '<div class="page-actions">' +
      '<button class="btn btn-secondary btn-sm" id="kb-test">检索测试</button>' +
      '<button class="btn btn-primary btn-sm" id="kb-upload">上传文档</button>' +
      "</div></div>" +
      '<div class="kb-layout">' +
      '<aside class="kb-tree"><h4>知识库列表</h4>' +
      AWData.knowledgeBases
        .map(function (k) {
          return (
            '<div class="tree-item' +
            (k.id === activeKb ? " active" : "") +
            '" data-id="' +
            k.id +
            '">▣ ' +
            AWUI.escapeHtml(k.name) +
            "</div>"
          );
        })
        .join("") +
      '<button class="btn btn-secondary btn-sm btn-block" id="kb-new" style="margin-top:12px">新建知识库</button>' +
      "</aside>" +
      '<div>' +
      '<div class="grid-stats" style="grid-template-columns:repeat(4,1fr);margin-bottom:14px">' +
      mini("文档数", kb.docs) +
      mini("切片数", kb.chunks) +
      mini("容量", kb.size) +
      mini("状态", kb.status) +
      "</div>" +
      (kb.status === "向量化中"
        ? '<div class="panel" style="margin-bottom:14px"><div class="panel-body">' +
          "<strong>向量化进行中</strong>" +
          '<div class="progress-bar" style="margin-top:10px"><span style="width:' +
          (kb.progress || 0) +
          '%"></span></div>' +
          '<p style="margin-top:8px;color:var(--text-muted);font-size:12px">进度 ' +
          (kb.progress || 0) +
          "%</p></div></div>"
        : "") +
      '<div class="panel">' +
      '<div class="panel-head"><h3>' +
      AWUI.escapeHtml(kb.name) +
      " · 文档清单</h3>" +
      '<span class="tag blue">' +
      kb.domain +
      "</span></div>" +
      '<table class="data-table"><thead><tr>' +
      "<th>文档名称</th><th>类型</th><th>切片</th><th>状态</th><th>更新时间</th><th>操作</th>" +
      "</tr></thead><tbody>" +
      AWData.documents
        .map(function (d) {
          return (
            "<tr><td>" +
            AWUI.escapeHtml(d.name) +
            "</td><td>" +
            d.type +
            "</td><td>" +
            d.chunks +
            "</td><td>" +
            AWUI.statusTag(d.status) +
            "</td><td>" +
            d.updatedAt +
            '</td><td class="actions">' +
            '<button class="btn btn-ghost btn-sm btn-reindex" data-id="' +
            d.id +
            '">重索引</button>' +
            '<button class="btn btn-ghost btn-sm btn-preview" data-id="' +
            d.id +
            '">预览</button>' +
            "</td></tr>"
          );
        })
        .join("") +
      "</tbody></table></div>" +
      (searchResults
        ? '<div class="panel" style="margin-top:14px"><div class="panel-head"><h3>检索测试结果</h3>' +
          '<button class="btn btn-ghost btn-sm" id="clear-search">清除</button></div>' +
          '<div class="panel-body">' +
          searchResults +
          "</div></div>"
        : "") +
      "</div></div></div>";

    function mini(label, value) {
      return (
        '<div class="stat-card"><div class="label">' +
        label +
        '</div><div class="value" style="font-size:20px">' +
        value +
        "</div></div>"
      );
    }

    container.querySelectorAll(".tree-item").forEach(function (item) {
      item.onclick = function () {
        activeKb = item.getAttribute("data-id");
        searchResults = null;
        render();
      };
    });

    container.querySelector("#kb-new").onclick = function () {
      AWUI.openModal({
        title: "新建知识库",
        body:
          '<div class="field"><label>名称</label><input id="kb-name" placeholder="例如：合规政策库" /></div>' +
          '<div class="field"><label>领域</label><select id="kb-domain"><option>政企</option><option>金融</option><option>医疗</option><option>制造</option></select></div>' +
          '<div class="field"><label>Embedding 模型</label><select><option>bge-m3</option><option>text-embedding-3-large</option><option>企业私有 Embedding</option></select></div>',
        confirmText: "创建",
        onConfirm: function () {
          const name = document.getElementById("kb-name").value.trim() || "新建知识库";
          AWData.knowledgeBases.push({
            id: "kb-" + Date.now(),
            name: name,
            domain: document.getElementById("kb-domain").value,
            docs: 0,
            chunks: 0,
            status: "就绪",
            size: "0 MB"
          });
          AWUI.toast("知识库「" + name + "」已创建");
          render();
        }
      });
    };

    container.querySelector("#kb-upload").onclick = function () {
      AWUI.openModal({
        title: "上传文档",
        body:
          '<div class="field"><label>目标知识库</label><input value="' +
          AWUI.escapeHtml(kb.name) +
          '" disabled /></div>' +
          '<div class="field"><label>选择文件</label><input type="file" id="kb-file" multiple /></div>' +
          '<div class="field"><label>切片策略</label><select><option>智能语义切片</option><option>固定长度（512 tokens）</option><option>按标题层级</option></select></div>' +
          '<p style="font-size:12px;color:var(--text-dim)">支持 PDF / DOCX / MD / XLSX / TXT，上传后自动进入 Embedding 队列。</p>',
        confirmText: "开始上传",
        onConfirm: function () {
          AWData.documents.unshift({
            id: "doc-" + Date.now(),
            name: "新上传文档_" + new Date().toISOString().slice(0, 10) + ".pdf",
            type: "PDF",
            chunks: 0,
            status: "处理中",
            updatedAt: "2026-06-30"
          });
          AWUI.toast("文档已加入向量化队列");
          render();
        }
      });
    };

    container.querySelector("#kb-test").onclick = function () {
      AWUI.openModal({
        title: "RAG 检索测试 — " + kb.name,
        body:
          '<div class="field"><label>查询语句</label><textarea id="rag-q" placeholder="例如：经营贷申请人征信异常如何处理？">' +
          AWUI.escapeHtml(searchQuery) +
          "</textarea></div>" +
          '<div class="field"><label>TopK</label><input type="number" value="5" min="1" max="20" id="rag-k" /></div>',
        confirmText: "执行检索",
        onConfirm: function () {
          searchQuery = document.getElementById("rag-q").value.trim() || "经营贷申请人征信异常如何处理？";
          searchResults =
            '<p style="margin-bottom:12px;font-size:13px">查询：<strong>' +
            AWUI.escapeHtml(searchQuery) +
            "</strong></p>" +
            '<div class="entity-card" style="cursor:default;margin-bottom:8px">' +
            '<div class="card-top"><h4>片段 #1 · 个人贷款管理办法.pdf</h4><span class="tag">相似度 0.91</span></div>' +
            '<p class="desc">当申请人征信报告出现连续逾期记录时，应进入人工复核通道，并要求补充收入与担保材料……</p></div>' +
            '<div class="entity-card" style="cursor:default;margin-bottom:8px">' +
            '<div class="card-top"><h4>片段 #2 · 反洗钱风险提示.md</h4><span class="tag">相似度 0.84</span></div>' +
            '<p class="desc">对异常征信画像客户，系统应保留检索引用链路，确保审核意见可追溯……</p></div>' +
            '<div class="entity-card" style="cursor:default">' +
            '<div class="card-top"><h4>片段 #3 · 征信查询操作规范.docx</h4><span class="tag">相似度 0.79</span></div>' +
            '<p class="desc">征信查询须在授权有效期内完成，查询结果缓存不超过 24 小时……</p></div>';
          AWUI.toast("检索完成，返回 Top 相关片段");
          render();
        }
      });
    };

    const clearBtn = container.querySelector("#clear-search");
    if (clearBtn) {
      clearBtn.onclick = function () {
        searchResults = null;
        render();
      };
    }

    container.querySelectorAll(".btn-reindex").forEach(function (btn) {
      btn.onclick = function () {
        const doc = AWData.documents.find(function (d) {
          return d.id === btn.getAttribute("data-id");
        });
        if (doc) {
          doc.status = "处理中";
          AWUI.toast("已触发重索引：" + doc.name);
          render();
        }
      };
    });

    container.querySelectorAll(".btn-preview").forEach(function (btn) {
      btn.onclick = function () {
        const doc = AWData.documents.find(function (d) {
          return d.id === btn.getAttribute("data-id");
        });
        AWUI.openModal({
          title: "文档预览 — " + doc.name,
          body:
            '<p style="color:var(--text-muted);font-size:13px;line-height:1.7">【占位预览】此处展示文档解析后的文本切片与元数据。正式环境将渲染分页预览与切片边界高亮。<br/><br/>切片数：' +
            doc.chunks +
            " · 状态：" +
            doc.status +
            "</p>",
          confirmText: "关闭",
          cancelText: false
        });
      };
    });
  }

  render();
};
