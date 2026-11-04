/**
 * 生成软著配套 Word 文档：
 * 1. 操作手册.docx
 * 2. 源代码.docx（前后各 30 页，每页 50 行）
 */
const fs = require("fs");
const path = require("path");
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Header,
  Footer,
  AlignmentType,
  HeadingLevel,
  PageNumber,
  PageBreak,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
  LevelFormat
} = require("docx");

const ROOT = path.join(__dirname, "..");
const DOCS = path.join(ROOT, "docs");
const SOFTWARE_NAME = "基于大语言模型的低代码智能体工作流构建系统";
const SOFTWARE_SHORT = "智能体工作流引擎";
const VERSION = "V1.0";

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const thin = { style: BorderStyle.SINGLE, size: 4, color: "999999" };
const placeholderBorders = { top: thin, bottom: thin, left: thin, right: thin };

function ensureDocsDir() {
  if (!fs.existsSync(DOCS)) fs.mkdirSync(DOCS, { recursive: true });
}

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: opts.after ?? 120, before: opts.before ?? 0, line: opts.line },
    alignment: opts.align,
    ...opts.paragraph,
    children: [
      new TextRun({
        text,
        font: opts.font || "宋体",
        size: opts.size || 21, // 10.5pt
        bold: opts.bold,
        italics: opts.italics,
        color: opts.color
      })
    ]
  });
}

function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({
    heading: level,
    spacing: { before: 240, after: 160 },
    children: [new TextRun({ text, font: "黑体", bold: true, size: level === HeadingLevel.HEADING_1 ? 28 : 24 })]
  });
}

function screenshotPlaceholder(caption) {
  return new Table({
    width: { size: 9000, type: WidthType.DXA },
    columnWidths: [9000],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: placeholderBorders,
            width: { size: 9000, type: WidthType.DXA },
            shading: { fill: "F5F7FA", type: ShadingType.CLEAR },
            margins: { top: 200, bottom: 200, left: 160, right: 160 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 200, after: 80 },
                children: [
                  new TextRun({
                    text: "【截图占位】",
                    font: "微软雅黑",
                    size: 20,
                    bold: true,
                    color: "666666"
                  })
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 200 },
                children: [
                  new TextRun({
                    text: caption,
                    font: "宋体",
                    size: 18,
                    color: "888888"
                  })
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 200 },
                children: [
                  new TextRun({
                    text: "（请在此粘贴系统实际运行截图，建议分辨率 ≥ 1280×720）",
                    font: "宋体",
                    size: 16,
                    color: "AAAAAA",
                    italics: true
                  })
                ]
              })
            ]
          })
        ]
      })
    ]
  });
}

function bullet(text, reference = "manual-bullets") {
  return new Paragraph({
    numbering: { reference, level: 0 },
    spacing: { after: 80 },
    children: [new TextRun({ text, font: "宋体", size: 21 })]
  });
}

async function buildManual() {
  const children = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200, before: 400 },
      children: [new TextRun({ text: SOFTWARE_NAME, font: "黑体", size: 36, bold: true })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: `（${SOFTWARE_SHORT} ${VERSION}）`, font: "黑体", size: 28, bold: true })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [new TextRun({ text: "软件操作手册", font: "黑体", size: 32, bold: true })]
    }),
    p(`文档版本：${VERSION}`, { align: AlignmentType.CENTER, after: 60 }),
    p("软件完成日期：2026年6月30日", { align: AlignmentType.CENTER, after: 60 }),
    p("适用范围：系统管理员、业务配置人员、开发集成人员", { align: AlignmentType.CENTER, after: 400 }),

    new Paragraph({ children: [new PageBreak()] }),

    heading("1 概述"),
    heading("1.1 软件简介", HeadingLevel.HEADING_2),
    p(
      `${SOFTWARE_NAME}（以下简称「${SOFTWARE_SHORT}」）是一款基于大语言模型的低代码智能体与工作流可视化构建系统。系统面向政企、金融、医疗及制造等行业，通过结构化编排将大模型能力融入企业核心业务，降低大模型应用开发门槛，实现复杂业务流程的智能化编排与多智能体高效协同。`
    ),
    heading("1.2 运行环境", HeadingLevel.HEADING_2),
    p("硬件环境：CPU 8核及以上，内存 64GB及以上，硬盘 1TB SSD及以上。"),
    p("操作系统：Linux、Windows、macOS。"),
    p("支撑软件：Docker 20.10+，Node.js 16+，PostgreSQL 14+，Redis 6.0+，向量数据库 Milvus。"),
    heading("1.3 手册说明", HeadingLevel.HEADING_2),
    p(
      "本手册功能描述与系统原型界面保持一致，覆盖登录与工作台、多智能体管理、可视化工作流编排、私有知识库、动态决策风控、多渠道发布与集成等模块。文中「【截图占位】」处请替换为实际界面截图。"
    ),

    heading("2 登录与工作台总览"),
    heading("2.1 登录系统", HeadingLevel.HEADING_2),
    p("打开系统访问地址后进入登录页，输入账号与密码，点击「进入工作台」。演示环境可使用预填账号直接登录。"),
    screenshotPlaceholder("图 2-1 系统登录界面"),
    p(""),
    heading("2.2 工作台总览", HeadingLevel.HEADING_2),
    p("登录成功后进入工作台总览，可查看智能体总数、工作流数量、知识库文档数、今日执行次数与成功率等关键指标，并处理人工确认待办与知识库向量化进度提醒。"),
    bullet("顶部提供全局搜索，可按名称定位智能体、知识库或工作流。"),
    bullet("点击「新建智能体」可跳转至多智能体管理并打开创建对话框。"),
    bullet("点击「通知」可查看执行完成、向量化完成、人工确认等系统消息。"),
    screenshotPlaceholder("图 2-2 工作台总览界面"),

    heading("3 多智能体全生命周期管理"),
    p(
      "本模块支持多类型、多领域智能体的在线创建、属性配置、权限控制及版本备份，满足企业多场景智能应用的隔离与协同需求。"
    ),
    heading("3.1 浏览与筛选", HeadingLevel.HEADING_2),
    p("在「多智能体管理」页面，可通过状态页签（全部/已发布/运行中/草稿/已归档）与关键词搜索快速定位目标智能体。卡片展示领域、类型、版本、负责人与更新时间。"),
    screenshotPlaceholder("图 3-1 多智能体列表界面"),
    p(""),
    heading("3.2 创建智能体", HeadingLevel.HEADING_2),
    p("点击「创建智能体」，填写名称、所属领域（政企/金融/医疗/制造）、智能体类型与描述后确认创建。新建智能体默认状态为「草稿」，版本为 v0.1.0。"),
    screenshotPlaceholder("图 3-2 创建智能体对话框"),
    p(""),
    heading("3.3 属性配置、版本与权限", HeadingLevel.HEADING_2),
    bullet("配置：设置模型提供方、温度、系统提示词、关联知识库等。"),
    bullet("版本：查看历史备份并创建新备份，系统保留最近 10 个版本，支持回滚。"),
    bullet("权限：配置可见范围、可编辑角色与可调用角色。"),
    screenshotPlaceholder("图 3-3 智能体属性配置界面"),

    heading("4 可视化工作流编排引擎"),
    p(
      "本模块提供流式节点编排画布，支持将复杂业务流程拆解为可自动执行的步骤序列。用户可自由组合大模型节点、知识库节点、外部插件及 MCP 服务，并使用条件分支、循环回退、并行执行、人工确认与自动评估等控制结构。"
    ),
    heading("4.1 画布操作", HeadingLevel.HEADING_2),
    bullet("从左侧「节点组件」拖拽节点到画布空白处新增步骤。"),
    bullet("拖动已有节点调整布局；点击节点在右侧检查器中编辑属性。"),
    bullet("使用「保存草稿」「校验编排」「试运行」完成配置与验证。"),
    screenshotPlaceholder("图 4-1 工作流可视化编排画布"),
    p(""),
    heading("4.2 编排校验与试运行", HeadingLevel.HEADING_2),
    p("点击「校验编排」可检查起始节点、可达性、分支表达式与人工确认超时策略等。点击「试运行」输入 JSON 业务变量后启动一次模拟执行，系统返回执行 ID 便于追踪。"),
    screenshotPlaceholder("图 4-2 编排校验与试运行对话框"),

    heading("5 企业级私有知识库管理"),
    p(
      "本模块支持多源异构文档的向量化处理与精准检索。通过 RAG（检索增强生成）架构，将企业内部文档、业务规则与实时数据作为推理输入，为智能体提供本地化、私有化知识支撑，降低幻觉并提升可追溯性。"
    ),
    heading("5.1 知识库与文档管理", HeadingLevel.HEADING_2),
    p("在左侧选择或新建知识库，右侧查看文档清单、切片数、容量与状态。支持上传 PDF/DOCX/MD/XLSX/TXT，选择切片策略后进入 Embedding 队列。可对文档执行重索引与预览。"),
    screenshotPlaceholder("图 5-1 私有知识库文档管理界面"),
    p(""),
    heading("5.2 检索测试", HeadingLevel.HEADING_2),
    p("点击「检索测试」，输入查询语句与 TopK，系统返回带相似度分数的文本片段，便于验证 RAG 效果后再挂接到工作流知识库节点。"),
    screenshotPlaceholder("图 5-2 RAG 检索测试结果界面"),

    heading("6 动态决策与风险控制机制"),
    p(
      "本模块在结构化工作流中嵌入智能决策节点，可根据中间结果动态调整后续流程走向；在关键节点支持人工确认与自动评估，对不合格输出触发重试或路径调整，拦截长链路累积误差。"
    ),
    heading("6.1 待处理决策", HeadingLevel.HEADING_2),
    p("在「待处理」页签查看需人工确认或转人工复核的事件，展示风险分、原因摘要。可执行「通过」「驳回」或查看审计追踪详情。"),
    screenshotPlaceholder("图 6-1 动态决策待处理列表"),
    p(""),
    heading("6.2 风控策略配置", HeadingLevel.HEADING_2),
    bullet("高风险阈值：达到或超过该分数时转人工。"),
    bullet("模型置信度下限：低于阈值进入待确认。"),
    bullet("自动评估未通过：回退重试 / 转人工 / 终止告警。"),
    bullet("并行分支合并策略：全部成功 / 任一成功 / 权重投票。"),
    screenshotPlaceholder("图 6-2 风控策略配置界面"),

    heading("7 多渠道应用集成与发布"),
    p(
      "本模块支持将构建完成的智能体工作流一键发布为标准 API、H5 网页，并可通过 Webhook 对接第三方业务系统。系统提供接口协议说明与状态追踪机制。"
    ),
    heading("7.1 选择渠道并发布", HeadingLevel.HEADING_2),
    p("选择「标准 API」「H5 网页」或「Webhook」，关联工作流，配置访问控制与状态追踪后发布。新发布默认处于「调试中」，确认无误后可切换为「在线」。"),
    screenshotPlaceholder("图 7-1 多渠道发布界面"),
    p(""),
    heading("7.2 接口文档与状态追踪", HeadingLevel.HEADING_2),
    p("在已发布列表中可查看接口文档、复制调用示例，并按 RunId 追踪成功、待人工、重试中等执行状态，便于与 ERP/OA/业务中台联调。"),
    screenshotPlaceholder("图 7-2 API 调用示例与状态追踪"),

    heading("8 典型操作流程（端到端）"),
    p("推荐按以下顺序完成从构建到上线的闭环："),
    bullet("步骤 1：创建智能体并完成模型与权限配置。"),
    bullet("步骤 2：建设私有知识库，上传制度/规范文档并完成向量化。"),
    bullet("步骤 3：在工作流画布中编排大模型、知识库、分支、人工确认与评估节点。"),
    bullet("步骤 4：配置风控阈值，试运行并处理人工确认队列。"),
    bullet("步骤 5：发布为 API 或 H5，开启状态追踪并对接业务系统。"),
    screenshotPlaceholder("图 8-1 端到端构建与发布流程示意（可用原型各模块拼图）"),

    heading("9 常见问题"),
    p("Q1：拖拽节点后看不到连线？"),
    p("A：演示原型中连线根据预置边关系绘制；新增节点后可通过保存草稿并在正式环境使用连线工具完成连接。"),
    p("Q2：知识库一直显示「向量化中」？"),
    p("A：请确认 Embedding 服务与 Milvus 可用，文档体积较大时请耐心等待或分批上传。"),
    p("Q3：发布后调用返回未授权？"),
    p("A：检查 API Key / JWT / IP 白名单配置是否与调用方一致，并确认通道状态为「在线」。"),

    heading("10 附则"),
    p(`软件名称：${SOFTWARE_NAME}`),
    p(`软件简称：${SOFTWARE_SHORT}`),
    p(`版本号：${VERSION}`),
    p("本手册与系统原型功能一致，仅供软件著作权登记及内部培训使用。")
  ];

  const doc = new Document({
    styles: {
      default: { document: { run: { font: "宋体", size: 21 } } },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 28, bold: true, font: "黑体" },
          paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 0 }
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 24, bold: true, font: "黑体" },
          paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 1 }
        }
      ]
    },
    numbering: {
      config: [
        {
          reference: "manual-bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 420, hanging: 210 } } }
            }
          ]
        }
      ]
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 }
          }
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${SOFTWARE_SHORT} ${VERSION} 操作手册`,
                    font: "宋体",
                    size: 16,
                    color: "666666"
                  })
                ]
              })
            ]
          })
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: "第 ", font: "宋体", size: 16 }),
                  new TextRun({ children: [PageNumber.CURRENT], font: "宋体", size: 16 }),
                  new TextRun({ text: " 页", font: "宋体", size: 16 })
                ]
              })
            ]
          })
        },
        children
      }
    ]
  });

  const out = path.join(DOCS, "智能体工作流引擎_V1.0_操作手册.docx");
  fs.writeFileSync(out, await Packer.toBuffer(doc));
  console.log("Wrote", out);
}

function collectSourceLines() {
  const files = [
    "source/core/agentLifecycle.ts",
    "source/core/workflowEngine.ts",
    "source/core/knowledgeRag.ts",
    "source/core/decisionRisk.ts",
    "source/core/publishService.ts",
    "source/core/engineFacade.ts",
    "prototype/js/data.js",
    "prototype/js/ui.js",
    "prototype/js/app.js",
    "prototype/js/pages-dashboard.js",
    "prototype/js/pages-agents.js",
    "prototype/js/pages-workflow.js",
    "prototype/js/pages-knowledge.js",
    "prototype/js/pages-decision.js",
    "prototype/js/pages-publish.js",
    "prototype/css/styles.css",
    "prototype/index.html"
  ];

  const lines = [];
  for (const rel of files) {
    const full = path.join(ROOT, rel);
    if (!fs.existsSync(full)) continue;
    const content = fs.readFileSync(full, "utf8");
    const fileLines = content.replace(/\r\n/g, "\n").split("\n");
    lines.push(`// ===== FILE: ${rel} =====`);
    for (const line of fileLines) {
      // Soft著一般不需要特别长的空行浪费，但保留结构；截断过长行
      const clipped = line.length > 100 ? line.slice(0, 97) + "..." : line;
      lines.push(clipped.length ? clipped : " ");
    }
    lines.push(" ");
  }
  return lines;
}

function paginate(lines, linesPerPage = 50) {
  const pages = [];
  for (let i = 0; i < lines.length; i += linesPerPage) {
    pages.push(lines.slice(i, i + linesPerPage));
  }
  // 最后一页不足 50 行时补空，便于排版稳定
  if (pages.length) {
    const last = pages[pages.length - 1];
    while (last.length < linesPerPage) last.push(" ");
  }
  return pages;
}

async function buildSourceDoc() {
  const allLines = collectSourceLines();
  const pages = paginate(allLines, 50);
  const totalPages = pages.length;
  if (totalPages < 60) {
    throw new Error(`源码分页不足 60 页，当前 ${totalPages} 页，请补充源码。`);
  }

  const first30 = pages.slice(0, 30);
  const last30 = pages.slice(totalPages - 30);
  const selected = [...first30, ...last30];

  const children = [];
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: SOFTWARE_NAME, font: "黑体", size: 28, bold: true })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new TextRun({ text: `源代码（${VERSION}）`, font: "黑体", size: 26, bold: true })]
    }),
    p(
      `说明：本文件按软著登记惯例提交连续源程序的前 30 页与后 30 页，每页约 50 行。`,
      { size: 18, after: 200 }
    )
  );

  selected.forEach((pageLines, pageIndex) => {
    if (pageIndex > 0) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }

    pageLines.forEach((line) => {
      children.push(
        new Paragraph({
          spacing: { after: 0, before: 0, line: 240 },
          children: [
            new TextRun({
              text: line,
              font: "Courier New",
              size: 21 // 五号 = 10.5pt
            })
          ]
        })
      );
    });
  });

  const doc = new Document({
    styles: {
      default: { document: { run: { font: "Courier New", size: 21 } } }
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 720, right: 720, bottom: 720, left: 720 }
          }
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${SOFTWARE_NAME} ${VERSION}`,
                    font: "宋体",
                    size: 14,
                    color: "666666"
                  })
                ]
              })
            ]
          })
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: "提交页码 ", font: "宋体", size: 14 }),
                  new TextRun({ children: [PageNumber.CURRENT], font: "宋体", size: 14 }),
                  new TextRun({ text: " / ", font: "宋体", size: 14 }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], font: "宋体", size: 14 })
                ]
              })
            ]
          })
        },
        children
      }
    ]
  });

  const out = path.join(DOCS, "智能体工作流引擎_V1.0_源代码.docx");
  fs.writeFileSync(out, await Packer.toBuffer(doc));
  console.log("Wrote", out, `(source pages total=${totalPages}, submitted=60, lines=${allLines.length})`);
}

async function main() {
  ensureDocsDir();
  await buildManual();
  await buildSourceDoc();
  // README
  const readme = `# 软著交付包说明

## 软件信息
- 全称：${SOFTWARE_NAME}
- 简称：${SOFTWARE_SHORT}
- 版本：${VERSION}
- 完成日期：2026-06-30

## 目录结构
- \`prototype/\`：高保真可交互系统原型（浏览器直接打开 \`index.html\`）
- \`source/core/\`：TypeScript 核心引擎源码（智能体 / 工作流 / 知识库 / 风控 / 发布）
- \`docs/\`：操作手册与源代码 Word 文档

## 使用方式
1. 用浏览器打开 \`prototype/index.html\`（建议 Chrome / Edge）
2. 点击「进入工作台」体验六大模块
3. 操作手册与源代码文档见 \`docs/\` 目录

## 重新生成文档
\`\`\`bash
cd softzhu
node scripts/generate-docs.js
\`\`\`
`;
  fs.writeFileSync(path.join(ROOT, "README.md"), readme, "utf8");
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
