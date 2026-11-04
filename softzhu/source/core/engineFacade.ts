/**
 * 基于大语言模型的低代码智能体工作流构建系统
 * 模块：系统引导、依赖装配与 REST 风格门面
 */

import type {
  AgentEntity,
  CreateAgentInput,
  IndustryDomain,
  AgentType
} from './agentLifecycle';
import AgentLifecycleService from './agentLifecycle';
import type {
  WorkflowDefinition} from './workflowEngine';
import WorkflowRuntime, {
  WorkflowValidator,
  createNode,
  createEdge,
  WorkflowGraph
} from './workflowEngine';
import type { ChunkStrategy } from './knowledgeRag';
import KnowledgeBaseService from './knowledgeRag';
import type { DecisionInput} from './decisionRisk';
import DecisionRiskService, { DEFAULT_RISK_POLICY } from './decisionRisk';
import type { PublishChannel } from './publishService';
import PublishService from './publishService';

export interface EngineBootstrapOptions {
  tenantId: string;
  tenantName: string;
  enableAudit?: boolean;
}

export interface EngineHealth {
  status: 'ok' | 'degraded';
  modules: Record<string, 'up' | 'down'>;
  checkedAt: string;
}

export class AgentWorkflowEngineFacade {
  readonly agents: AgentLifecycleService;
  readonly workflows: WorkflowRuntime;
  readonly validator: WorkflowValidator;
  readonly knowledge: KnowledgeBaseService;
  readonly decisions: DecisionRiskService;
  readonly publish: PublishService;
  readonly tenantId: string;
  readonly tenantName: string;

  private workflowStore: Map<string, WorkflowDefinition> = new Map();

  constructor(options: EngineBootstrapOptions) {
    this.tenantId = options.tenantId;
    this.tenantName = options.tenantName;
    this.agents = new AgentLifecycleService();
    this.validator = new WorkflowValidator();
    this.workflows = new WorkflowRuntime(this.validator);
    this.knowledge = new KnowledgeBaseService();
    this.decisions = new DecisionRiskService({
      ...DEFAULT_RISK_POLICY,
      auditEnabled: options.enableAudit !== false
    });
    this.publish = new PublishService();
    this.seedDemoData();
  }

  health(): EngineHealth {
    return {
      status: 'ok',
      modules: {
        agents: 'up',
        workflows: 'up',
        knowledge: 'up',
        decisions: 'up',
        publish: 'up'
      },
      checkedAt: new Date().toISOString()
    };
  }

  createAgent(input: CreateAgentInput): AgentEntity {
    return this.agents.create(input);
  }

  createWorkflowForAgent(agentId: string, name: string): WorkflowDefinition {
    const agent = this.agents.get(agentId);
    const start = createNode('llm', '意图识别', 40, 80, {
      prompt: `识别与「${agent.name}」相关的用户意图`
    });
    const kb = createNode('knowledge', '知识检索', 280, 80, { topK: 5 });
    const branch = createNode('branch', '风险分支', 520, 80, { expression: 'score >= 70' });
    const human = createNode('human', '人工确认', 760, 40, { timeout: '30m' });
    const output = createNode('output', '结果输出', 1000, 80, { format: 'json' });

    const definition: WorkflowDefinition = {
      id: `wf_${Date.now()}`,
      name,
      agentId,
      version: 'v1.0.0',
      status: 'draft',
      nodes: [start, kb, branch, human, output],
      edges: [
        createEdge(start.id, kb.id),
        createEdge(kb.id, branch.id),
        createEdge(branch.id, human.id, 'true'),
        createEdge(branch.id, output.id, 'false'),
        createEdge(human.id, output.id)
      ],
      variables: {},
      updatedAt: new Date().toISOString()
    };
    this.workflowStore.set(definition.id, definition);
    return definition;
  }

  getWorkflow(workflowId: string): WorkflowDefinition {
    const wf = this.workflowStore.get(workflowId);
    if (!wf) {
      throw new Error(`工作流不存在: ${workflowId}`);
    }
    return wf;
  }

  listWorkflows(): WorkflowDefinition[] {
    return Array.from(this.workflowStore.values());
  }

  openGraph(workflowId: string): WorkflowGraph {
    return new WorkflowGraph(this.getWorkflow(workflowId));
  }

  async ingestKnowledge(kbId: string, filename: string, content: string, strategy?: ChunkStrategy) {
    return this.knowledge.ingestDocument(kbId, filename, content, strategy);
  }

  async askWithRag(kbId: string, question: string, topK = 5): Promise<string> {
    const result = await this.knowledge.retrieve({
      knowledgeBaseId: kbId,
      query: question,
      topK
    });
    return this.knowledge.buildAugmentedPrompt(question, result.hits);
  }

  evaluateDecision(input: DecisionInput) {
    return this.decisions.evaluate(input);
  }

  publishWorkflow(workflowId: string, channel: PublishChannel, name: string) {
    const wf = this.getWorkflow(workflowId);
    return this.publish.create({
      name,
      channel,
      workflowId: wf.id,
      workflowName: wf.name
    });
  }

  private seedDemoData(): void {
    const domains: IndustryDomain[] = ['finance', 'medical', 'government', 'manufacturing'];
    const types: AgentType[] = ['workflow', 'chat', 'multimodal', 'tool'];
    const names = ['信贷初审助手', '诊疗路径导诊', '政务办事引导', '产线异常诊断'];

    names.forEach((name, index) => {
      const agent = this.agents.create({
        name,
        domain: domains[index],
        type: types[index],
        owner: '系统初始化',
        description: `${name}演示实例`
      });
      const wf = this.createWorkflowForAgent(agent.id, `${name}主流程`);
      this.workflowStore.set(wf.id, wf);
    });

    const kb = this.knowledge.createKnowledgeBase('信贷制度汇编', '金融', 'bge-m3');
    void this.knowledge.ingestDocument(
      kb.id,
      '个人贷款管理办法.md',
      [
        '# 个人贷款管理办法',
        '## 征信异常处理',
        '当申请人征信报告出现连续逾期记录时，应进入人工复核通道，并要求补充收入与担保材料。',
        '## 授权时效',
        '征信查询须在授权有效期内完成，查询结果缓存不超过 24 小时。'
      ].join('\n')
    );
  }
}

export function createEngine(tenantId: string, tenantName: string): AgentWorkflowEngineFacade {
  return new AgentWorkflowEngineFacade({ tenantId, tenantName, enableAudit: true });
}

export default AgentWorkflowEngineFacade;
