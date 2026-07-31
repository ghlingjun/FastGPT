/**
 * 智能体工作流引擎 V1.0 — 演示数据层
 * 基于大语言模型的低代码智能体工作流构建系统
 */
window.AWData = {
  agents: [
    {
      id: "ag-001",
      name: "信贷初审助手",
      domain: "金融",
      type: "业务流程智能体",
      status: "已发布",
      version: "v2.3.1",
      owner: "风控中心",
      desc: "对接征信与内部规则库，完成贷款申请材料核验、风险评分与初审意见生成。",
      updatedAt: "2026-06-18"
    },
    {
      id: "ag-002",
      name: "诊疗路径导诊",
      domain: "医疗",
      type: "对话智能体",
      status: "运行中",
      version: "v1.8.0",
      owner: "互联网医院",
      desc: "基于科室知识库与症状描述，输出分诊建议并联动预约挂号流程。",
      updatedAt: "2026-06-22"
    },
    {
      id: "ag-003",
      name: "政务办事引导",
      domain: "政企",
      type: "多模态智能体",
      status: "草稿",
      version: "v0.9.2",
      owner: "数字政务办",
      desc: "覆盖高频政务事项问答，支持材料清单核对与一网通办跳转。",
      updatedAt: "2026-06-25"
    },
    {
      id: "ag-004",
      name: "产线异常诊断",
      domain: "制造",
      type: "工具型智能体",
      status: "已发布",
      version: "v3.1.0",
      owner: "智能制造部",
      desc: "结合设备日志与工艺知识库，定位产线异常并生成处置工单。",
      updatedAt: "2026-06-12"
    },
    {
      id: "ag-005",
      name: "合同条款审查",
      domain: "政企",
      type: "业务流程智能体",
      status: "运行中",
      version: "v1.4.5",
      owner: "法务合规部",
      desc: "对合同文本进行条款抽取、风险点标注与合规意见输出。",
      updatedAt: "2026-06-28"
    },
    {
      id: "ag-006",
      name: "客服工单分流",
      domain: "金融",
      type: "对话智能体",
      status: "已归档",
      version: "v2.0.0",
      owner: "客户服务中心",
      desc: "识别意图并分流至人工坐席或自动化处理链路。",
      updatedAt: "2026-05-30"
    }
  ],

  workflows: [
    {
      id: "wf-001",
      name: "信贷材料核验流程",
      agentId: "ag-001",
      status: "已发布",
      nodes: 12,
      runs: 1842,
      updatedAt: "2026-06-20"
    },
    {
      id: "wf-002",
      name: "症状分诊与挂号",
      agentId: "ag-002",
      status: "运行中",
      nodes: 9,
      runs: 3260,
      updatedAt: "2026-06-24"
    },
    {
      id: "wf-003",
      name: "合同风险扫描",
      agentId: "ag-005",
      status: "草稿",
      nodes: 15,
      runs: 96,
      updatedAt: "2026-06-28"
    }
  ],

  knowledgeBases: [
    {
      id: "kb-001",
      name: "信贷制度汇编",
      domain: "金融",
      docs: 128,
      chunks: 14560,
      status: "就绪",
      size: "2.4 GB"
    },
    {
      id: "kb-002",
      name: "临床路径手册",
      domain: "医疗",
      docs: 86,
      chunks: 9820,
      status: "就绪",
      size: "1.1 GB"
    },
    {
      id: "kb-003",
      name: "政务办事指南",
      domain: "政企",
      docs: 210,
      chunks: 22100,
      status: "向量化中",
      size: "3.6 GB",
      progress: 72
    },
    {
      id: "kb-004",
      name: "设备工艺规范",
      domain: "制造",
      docs: 64,
      chunks: 5400,
      status: "就绪",
      size: "890 MB"
    }
  ],

  documents: [
    { id: "doc-01", name: "个人贷款管理办法.pdf", type: "PDF", chunks: 420, status: "已索引", updatedAt: "2026-06-10" },
    { id: "doc-02", name: "征信查询操作规范.docx", type: "DOCX", chunks: 186, status: "已索引", updatedAt: "2026-06-12" },
    { id: "doc-03", name: "反洗钱风险提示.md", type: "MD", chunks: 54, status: "已索引", updatedAt: "2026-06-15" },
    { id: "doc-04", name: "担保物评估细则.xlsx", type: "XLSX", chunks: 98, status: "处理中", updatedAt: "2026-06-29" },
    { id: "doc-05", name: "2026Q2制度更新说明.pdf", type: "PDF", chunks: 32, status: "待向量化", updatedAt: "2026-06-30" }
  ],

  decisions: [
    {
      id: "dec-001",
      flow: "信贷材料核验流程",
      node: "风险评分决策",
      result: "转人工复核",
      risk: 78,
      time: "2026-06-30 09:12:44",
      reason: "申请人征信异常次数超阈值，触发高风险分支"
    },
    {
      id: "dec-002",
      flow: "合同风险扫描",
      node: "条款合规评估",
      result: "自动通过",
      risk: 22,
      time: "2026-06-30 08:55:10",
      reason: "未发现高风险条款，评估分数低于阈值"
    },
    {
      id: "dec-003",
      flow: "症状分诊与挂号",
      node: "人工确认",
      result: "待确认",
      risk: 45,
      time: "2026-06-30 08:40:02",
      reason: "模型置信度低于 0.75，等待医师确认分诊结果"
    },
    {
      id: "dec-004",
      flow: "信贷材料核验流程",
      node: "输出质量评估",
      result: "触发重试",
      risk: 61,
      time: "2026-06-29 21:18:33",
      reason: "关键字段缺失，自动评估未通过，已回退至资料抽取节点"
    }
  ],

  publications: [
    {
      id: "pub-001",
      name: "信贷初审 API",
      channel: "标准 API",
      endpoint: "/api/v1/agent/credit-review/run",
      status: "在线",
      calls: 12840,
      updatedAt: "2026-06-20"
    },
    {
      id: "pub-002",
      name: "诊疗导诊 H5",
      channel: "H5 网页",
      endpoint: "https://demo.aw-engine.local/h5/triage",
      status: "在线",
      calls: 5621,
      updatedAt: "2026-06-24"
    },
    {
      id: "pub-003",
      name: "合同审查 Webhook",
      channel: "Webhook",
      endpoint: "https://erp.example.com/hooks/contract",
      status: "调试中",
      calls: 210,
      updatedAt: "2026-06-28"
    }
  ],

  paletteNodes: [
    { type: "llm", label: "大模型节点", color: "#2ec4b6" },
    { type: "knowledge", label: "知识库检索", color: "#3d8bfd" },
    { type: "plugin", label: "外部插件", color: "#f0a202" },
    { type: "mcp", label: "MCP 服务", color: "#9b5de5" },
    { type: "branch", label: "条件分支", color: "#ef476f" },
    { type: "loop", label: "循环回退", color: "#ffd166" },
    { type: "parallel", label: "并行执行", color: "#06d6a0" },
    { type: "human", label: "人工确认", color: "#8fa3bf" },
    { type: "eval", label: "自动评估", color: "#ff6b6b" },
    { type: "output", label: "结果输出", color: "#4cc9f0" }
  ],

  flowNodes: [
    { id: "n1", type: "llm", title: "意图识别", x: 40, y: 80, prompt: "识别用户贷款咨询意图与关键字段" },
    { id: "n2", type: "knowledge", title: "制度检索", x: 280, y: 80, kb: "信贷制度汇编", topK: 5 },
    { id: "n3", type: "plugin", title: "征信查询", x: 520, y: 40, plugin: "credit-bureau-api" },
    { id: "n4", type: "branch", title: "风险分支", x: 520, y: 180, condition: "score >= 70" },
    { id: "n5", type: "human", title: "人工确认", x: 760, y: 40, timeout: "30m" },
    { id: "n6", type: "eval", title: "质量评估", x: 760, y: 180, threshold: 0.8 },
    { id: "n7", type: "output", title: "初审结论", x: 1000, y: 110, format: "JSON" }
  ],

  flowEdges: [
    ["n1", "n2"],
    ["n2", "n3"],
    ["n2", "n4"],
    ["n3", "n5"],
    ["n4", "n6"],
    ["n5", "n7"],
    ["n6", "n7"]
  ],

  dashboardStats: {
    agents: 26,
    workflows: 48,
    knowledgeDocs: 488,
    todayRuns: 1326,
    successRate: "97.4%",
    pendingHuman: 7
  },

  recentRuns: [
    { id: "run-88421", flow: "信贷材料核验流程", status: "成功", duration: "4.2s", time: "10:24:11" },
    { id: "run-88420", flow: "症状分诊与挂号", status: "成功", duration: "2.8s", time: "10:23:55" },
    { id: "run-88419", flow: "合同风险扫描", status: "待人工", duration: "—", time: "10:21:03" },
    { id: "run-88418", flow: "信贷材料核验流程", status: "重试中", duration: "6.1s", time: "10:18:40" },
    { id: "run-88417", flow: "产线异常诊断", status: "成功", duration: "5.5s", time: "10:15:22" }
  ]
};
