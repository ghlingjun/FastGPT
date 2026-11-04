/**
 * 基于大语言模型的低代码智能体工作流构建系统
 * 模块：可视化工作流编排引擎 — 节点、边、校验与执行运行时
 */

export type NodeType =
  | 'llm'
  | 'knowledge'
  | 'plugin'
  | 'mcp'
  | 'branch'
  | 'loop'
  | 'parallel'
  | 'human'
  | 'eval'
  | 'output'
  | 'start'
  | 'end';

export type RunStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'failed'
  | 'waiting_human'
  | 'retrying'
  | 'cancelled';

export interface WorkflowNode {
  id: string;
  type: NodeType;
  title: string;
  x: number;
  y: number;
  config: Record<string, unknown>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourcePort?: string;
  targetPort?: string;
  condition?: string;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  agentId: string;
  version: string;
  status: 'draft' | 'published' | 'archived';
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables: Record<string, unknown>;
  updatedAt: string;
}

export interface ValidationIssue {
  level: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  nodeId?: string;
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
}

export interface NodeExecutionResult {
  nodeId: string;
  status: RunStatus;
  output?: unknown;
  error?: string;
  startedAt: string;
  finishedAt?: string;
  retryCount: number;
}

export interface WorkflowRunContext {
  runId: string;
  workflowId: string;
  input: Record<string, unknown>;
  variables: Record<string, unknown>;
  nodeResults: Map<string, NodeExecutionResult>;
  status: RunStatus;
  currentNodeIds: string[];
  createdAt: string;
  updatedAt: string;
}

export class WorkflowValidationError extends Error {
  constructor(
    message: string,
    public readonly issues: ValidationIssue[]
  ) {
    super(message);
    this.name = 'WorkflowValidationError';
  }
}

const CONTROL_TYPES: NodeType[] = ['branch', 'loop', 'parallel'];
const TERMINAL_TYPES: NodeType[] = ['output', 'end'];

export function createNode(
  type: NodeType,
  title: string,
  x: number,
  y: number,
  config: Record<string, unknown> = {}
): WorkflowNode {
  return {
    id: `node_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    title,
    x,
    y,
    config: { ...defaultConfigFor(type), ...config }
  };
}

export function defaultConfigFor(type: NodeType): Record<string, unknown> {
  switch (type) {
    case 'llm':
      return { prompt: '', temperature: 0.3, model: 'enterprise-llm-v2' };
    case 'knowledge':
      return { knowledgeBaseId: '', topK: 5, scoreThreshold: 0.6 };
    case 'plugin':
      return { pluginId: '', timeoutMs: 15000 };
    case 'mcp':
      return { serverId: '', toolName: '' };
    case 'branch':
      return { expression: 'true', truePort: 'yes', falsePort: 'no' };
    case 'loop':
      return { maxIterations: 3, breakExpression: 'done == true' };
    case 'parallel':
      return { joinPolicy: 'all' };
    case 'human':
      return { timeout: '30m', assignees: [] };
    case 'eval':
      return { threshold: 0.8, onFail: 'retry' };
    case 'output':
      return { format: 'json' };
    default:
      return {};
  }
}

export function createEdge(source: string, target: string, condition?: string): WorkflowEdge {
  return {
    id: `edge_${source}_${target}_${Math.random().toString(36).slice(2, 6)}`,
    source,
    target,
    condition
  };
}

export class WorkflowGraph {
  constructor(private definition: WorkflowDefinition) {}

  getDefinition(): WorkflowDefinition {
    return this.definition;
  }

  getNode(nodeId: string): WorkflowNode | undefined {
    return this.definition.nodes.find((n) => n.id === nodeId);
  }

  getOutgoing(nodeId: string): WorkflowEdge[] {
    return this.definition.edges.filter((e) => e.source === nodeId);
  }

  getIncoming(nodeId: string): WorkflowEdge[] {
    return this.definition.edges.filter((e) => e.target === nodeId);
  }

  addNode(node: WorkflowNode): void {
    this.definition.nodes.push(node);
    this.touch();
  }

  updateNode(nodeId: string, patch: Partial<WorkflowNode>): WorkflowNode {
    const node = this.getNode(nodeId);
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`);
    }
    Object.assign(node, patch);
    if (patch.config) {
      node.config = { ...node.config, ...patch.config };
    }
    this.touch();
    return node;
  }

  removeNode(nodeId: string): void {
    this.definition.nodes = this.definition.nodes.filter((n) => n.id !== nodeId);
    this.definition.edges = this.definition.edges.filter(
      (e) => e.source !== nodeId && e.target !== nodeId
    );
    this.touch();
  }

  addEdge(edge: WorkflowEdge): void {
    const exists = this.definition.edges.some(
      (e) => e.source === edge.source && e.target === edge.target
    );
    if (exists) {
      return;
    }
    this.definition.edges.push(edge);
    this.touch();
  }

  private touch(): void {
    this.definition.updatedAt = new Date().toISOString();
  }
}

export class WorkflowValidator {
  validate(definition: WorkflowDefinition): ValidationResult {
    const issues: ValidationIssue[] = [];
    if (!definition.name || definition.name.trim().length < 2) {
      issues.push({ level: 'error', code: 'NAME_REQUIRED', message: '工作流名称不能为空' });
    }
    if (definition.nodes.length === 0) {
      issues.push({ level: 'error', code: 'EMPTY_GRAPH', message: '工作流至少包含一个节点' });
    }

    const ids = new Set<string>();
    for (const node of definition.nodes) {
      if (ids.has(node.id)) {
        issues.push({
          level: 'error',
          code: 'DUPLICATE_NODE',
          message: `重复节点 ID: ${node.id}`,
          nodeId: node.id
        });
      }
      ids.add(node.id);
      this.validateNodeConfig(node, issues);
    }

    for (const edge of definition.edges) {
      if (!ids.has(edge.source) || !ids.has(edge.target)) {
        issues.push({
          level: 'error',
          code: 'DANGLING_EDGE',
          message: `边引用了不存在的节点: ${edge.source} -> ${edge.target}`
        });
      }
    }

    const startCandidates = definition.nodes.filter(
      (n) => this.getIncomingCount(definition, n.id) === 0
    );
    if (startCandidates.length === 0) {
      issues.push({ level: 'error', code: 'NO_START', message: '未找到起始节点' });
    } else if (startCandidates.length > 1) {
      issues.push({
        level: 'warning',
        code: 'MULTI_START',
        message: `存在多个起始节点: ${startCandidates.map((n) => n.title).join(', ')}`
      });
    }

    const reachable = this.collectReachable(definition, startCandidates[0]?.id);
    for (const node of definition.nodes) {
      if (!reachable.has(node.id)) {
        issues.push({
          level: 'warning',
          code: 'UNREACHABLE',
          message: `节点不可达: ${node.title}`,
          nodeId: node.id
        });
      }
    }

    const hasTerminal = definition.nodes.some((n) => TERMINAL_TYPES.includes(n.type));
    if (!hasTerminal) {
      issues.push({
        level: 'warning',
        code: 'NO_TERMINAL',
        message: '建议至少配置一个结果输出节点'
      });
    }

    const evalNodes = definition.nodes.filter((n) => n.type === 'eval');
    for (const node of evalNodes) {
      const outs = definition.edges.filter((e) => e.source === node.id);
      if (outs.length < 1) {
        issues.push({
          level: 'warning',
          code: 'EVAL_NO_FALLBACK',
          message: `建议为「${node.title}」配置失败回退边`,
          nodeId: node.id
        });
      }
    }

    const ok = !issues.some((i) => i.level === 'error');
    return { ok, issues };
  }

  private validateNodeConfig(node: WorkflowNode, issues: ValidationIssue[]): void {
    if (node.type === 'llm' && !String(node.config.prompt || '').trim()) {
      issues.push({
        level: 'warning',
        code: 'LLM_PROMPT_EMPTY',
        message: `大模型节点「${node.title}」提示词为空`,
        nodeId: node.id
      });
    }
    if (node.type === 'knowledge' && !node.config.knowledgeBaseId) {
      issues.push({
        level: 'error',
        code: 'KB_REQUIRED',
        message: `知识库节点「${node.title}」未绑定知识库`,
        nodeId: node.id
      });
    }
    if (node.type === 'branch' && !String(node.config.expression || '').trim()) {
      issues.push({
        level: 'error',
        code: 'BRANCH_EXPR',
        message: `条件分支「${node.title}」缺少表达式`,
        nodeId: node.id
      });
    }
    if (node.type === 'human' && !node.config.timeout) {
      issues.push({
        level: 'warning',
        code: 'HUMAN_TIMEOUT',
        message: `人工确认节点「${node.title}」未配置超时`,
        nodeId: node.id
      });
    }
    if (node.type === 'eval') {
      const threshold = Number(node.config.threshold);
      if (Number.isNaN(threshold) || threshold < 0 || threshold > 1) {
        issues.push({
          level: 'error',
          code: 'EVAL_THRESHOLD',
          message: `评估阈值非法: ${node.title}`,
          nodeId: node.id
        });
      }
    }
  }

  private getIncomingCount(definition: WorkflowDefinition, nodeId: string): number {
    return definition.edges.filter((e) => e.target === nodeId).length;
  }

  private collectReachable(definition: WorkflowDefinition, startId?: string): Set<string> {
    const result = new Set<string>();
    if (!startId) {
      return result;
    }
    const queue = [startId];
    while (queue.length) {
      const current = queue.shift()!;
      if (result.has(current)) {
        continue;
      }
      result.add(current);
      for (const edge of definition.edges.filter((e) => e.source === current)) {
        queue.push(edge.target);
      }
    }
    return result;
  }
}

export type NodeExecutor = (
  node: WorkflowNode,
  ctx: WorkflowRunContext
) => Promise<{ output?: unknown; status?: RunStatus; error?: string }>;

export class WorkflowRuntime {
  private runs: Map<string, WorkflowRunContext> = new Map();

  constructor(
    private readonly validator: WorkflowValidator = new WorkflowValidator(),
    private readonly executors: Partial<Record<NodeType, NodeExecutor>> = {}
  ) {}

  registerExecutor(type: NodeType, executor: NodeExecutor): void {
    this.executors[type] = executor;
  }

  async start(
    definition: WorkflowDefinition,
    input: Record<string, unknown>
  ): Promise<WorkflowRunContext> {
    const validation = this.validator.validate(definition);
    if (!validation.ok) {
      throw new WorkflowValidationError('工作流校验失败，无法执行', validation.issues);
    }

    const startNode = definition.nodes.find(
      (n) => definition.edges.every((e) => e.target !== n.id) || n.type === 'start'
    );
    if (!startNode) {
      throw new Error('无法定位起始节点');
    }

    const now = new Date().toISOString();
    const ctx: WorkflowRunContext = {
      runId: `run_${Date.now()}`,
      workflowId: definition.id,
      input,
      variables: { ...definition.variables, ...input },
      nodeResults: new Map(),
      status: 'running',
      currentNodeIds: [startNode.id],
      createdAt: now,
      updatedAt: now
    };
    this.runs.set(ctx.runId, ctx);

    await this.executeFrom(definition, ctx, startNode.id);
    return ctx;
  }

  getRun(runId: string): WorkflowRunContext | undefined {
    return this.runs.get(runId);
  }

  async resumeHuman(
    runId: string,
    nodeId: string,
    decision: 'approve' | 'reject',
    payload?: unknown
  ): Promise<WorkflowRunContext> {
    const ctx = this.runs.get(runId);
    if (!ctx) {
      throw new Error(`Run not found: ${runId}`);
    }
    const result = ctx.nodeResults.get(nodeId);
    if (!result || result.status !== 'waiting_human') {
      throw new Error('当前节点不在人工确认状态');
    }

    if (decision === 'reject') {
      result.status = 'retrying';
      result.output = { decision, payload };
      result.retryCount += 1;
      ctx.status = 'retrying';
    } else {
      result.status = 'success';
      result.output = { decision, payload };
      result.finishedAt = new Date().toISOString();
      ctx.status = 'running';
    }
    ctx.updatedAt = new Date().toISOString();
    return ctx;
  }

  private async executeFrom(
    definition: WorkflowDefinition,
    ctx: WorkflowRunContext,
    nodeId: string
  ): Promise<void> {
    const node = definition.nodes.find((n) => n.id === nodeId);
    if (!node) {
      ctx.status = 'failed';
      return;
    }

    const startedAt = new Date().toISOString();
    const baseResult: NodeExecutionResult = {
      nodeId,
      status: 'running',
      startedAt,
      retryCount: ctx.nodeResults.get(nodeId)?.retryCount || 0
    };
    ctx.nodeResults.set(nodeId, baseResult);
    ctx.currentNodeIds = [nodeId];
    ctx.updatedAt = startedAt;

    try {
      if (node.type === 'human') {
        baseResult.status = 'waiting_human';
        ctx.status = 'waiting_human';
        return;
      }

      const executor = this.executors[node.type];
      let output: unknown = { passthrough: true };
      let status: RunStatus = 'success';
      let error: string | undefined;

      if (executor) {
        const execResult = await executor(node, ctx);
        output = execResult.output;
        status = execResult.status || 'success';
        error = execResult.error;
      } else {
        output = await this.defaultExecute(node, ctx);
      }

      if (node.type === 'eval') {
        const score = Number((output as { score?: number })?.score ?? 1);
        const threshold = Number(node.config.threshold ?? 0.8);
        if (score < threshold) {
          const onFail = String(node.config.onFail || 'retry');
          if (onFail === 'retry' && baseResult.retryCount < 2) {
            baseResult.retryCount += 1;
            baseResult.status = 'retrying';
            ctx.status = 'retrying';
            await this.executeFrom(definition, ctx, nodeId);
            return;
          }
          status = 'failed';
          error = `自动评估未通过: score=${score}, threshold=${threshold}`;
        }
      }

      if (node.type === 'branch') {
        const expression = String(node.config.expression || 'true');
        const passed = this.evalCondition(expression, ctx.variables);
        const outs = definition.edges.filter((e) => e.source === node.id);
        const next =
          outs.find((e) => (passed ? e.condition !== 'false' : e.condition === 'false')) || outs[0];
        baseResult.status = 'success';
        baseResult.output = { passed, expression };
        baseResult.finishedAt = new Date().toISOString();
        if (next) {
          await this.executeFrom(definition, ctx, next.target);
        } else {
          ctx.status = 'success';
        }
        return;
      }

      baseResult.status = status;
      baseResult.output = output;
      baseResult.error = error;
      baseResult.finishedAt = new Date().toISOString();

      if (status === 'failed') {
        ctx.status = 'failed';
        return;
      }

      if (TERMINAL_TYPES.includes(node.type)) {
        ctx.status = 'success';
        return;
      }

      if (node.type === 'parallel') {
        const outs = definition.edges.filter((e) => e.source === node.id);
        await Promise.all(outs.map((edge) => this.executeFrom(definition, ctx, edge.target)));
        const joinPolicy = String(node.config.joinPolicy || 'all');
        const childResults = outs.map((e) => ctx.nodeResults.get(e.target));
        const allOk = childResults.every((r) => r && r.status === 'success');
        const anyOk = childResults.some((r) => r && r.status === 'success');
        ctx.status =
          joinPolicy === 'any' ? (anyOk ? 'success' : 'failed') : allOk ? 'success' : 'failed';
        return;
      }

      const nextEdges = definition.edges.filter((e) => e.source === node.id);
      if (nextEdges.length === 0) {
        ctx.status = 'success';
        return;
      }
      for (const edge of nextEdges) {
        await this.executeFrom(definition, ctx, edge.target);
      }
    } catch (err) {
      baseResult.status = 'failed';
      baseResult.error = err instanceof Error ? err.message : String(err);
      baseResult.finishedAt = new Date().toISOString();
      ctx.status = 'failed';
    }
  }

  private async defaultExecute(node: WorkflowNode, ctx: WorkflowRunContext): Promise<unknown> {
    if (node.type === 'llm') {
      return {
        text: `LLM mock output for ${node.title}`,
        prompt: node.config.prompt,
        variables: ctx.variables
      };
    }
    if (node.type === 'knowledge') {
      return {
        chunks: [
          { content: '示例检索片段', score: 0.91 },
          { content: '第二条相关制度', score: 0.84 }
        ],
        topK: node.config.topK
      };
    }
    if (node.type === 'plugin' || node.type === 'mcp') {
      return { ok: true, plugin: node.config.pluginId || node.config.serverId };
    }
    if (node.type === 'eval') {
      return { score: 0.92, passed: true };
    }
    if (node.type === 'output') {
      return { final: ctx.variables, format: node.config.format };
    }
    return { skipped: false, type: node.type };
  }

  private evalCondition(expression: string, variables: Record<string, unknown>): boolean {
    try {
      const score = Number(variables.score ?? variables.riskScore ?? 0);
      if (expression.includes('>=')) {
        const parts = expression.split('>=');
        const left = parts[0].trim();
        const right = Number(parts[1].trim());
        const leftVal =
          left === 'score' || left === 'riskScore' ? score : Number(variables[left] ?? 0);
        return leftVal >= right;
      }
      if (expression.trim() === 'true') {
        return true;
      }
      if (expression.trim() === 'false') {
        return false;
      }
      return Boolean(variables[expression]);
    } catch {
      return false;
    }
  }
}

export function serializeDefinition(definition: WorkflowDefinition): string {
  return JSON.stringify(definition, null, 2);
}

export function deserializeDefinition(raw: string): WorkflowDefinition {
  const parsed = JSON.parse(raw) as WorkflowDefinition;
  if (!parsed.id || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
    throw new Error('非法工作流定义');
  }
  return parsed;
}

export function estimateComplexity(definition: WorkflowDefinition): {
  nodeCount: number;
  edgeCount: number;
  controlNodes: number;
  score: number;
} {
  const controlNodes = definition.nodes.filter((n) => CONTROL_TYPES.includes(n.type)).length;
  const nodeCount = definition.nodes.length;
  const edgeCount = definition.edges.length;
  const score = nodeCount * 1.2 + edgeCount * 0.8 + controlNodes * 2.5;
  return { nodeCount, edgeCount, controlNodes, score: Math.round(score * 10) / 10 };
}

export default WorkflowRuntime;
