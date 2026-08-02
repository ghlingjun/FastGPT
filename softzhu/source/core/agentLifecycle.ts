/**
 * 基于大语言模型的低代码智能体工作流构建系统
 * 软件简称：智能体工作流引擎 V1.0
 * 模块：智能体领域模型与生命周期服务
 */

export type AgentStatus = 'draft' | 'running' | 'published' | 'archived';
export type AgentType = 'chat' | 'workflow' | 'tool' | 'multimodal';
export type IndustryDomain = 'government' | 'finance' | 'medical' | 'manufacturing';

export interface AgentPermission {
  visibility: 'department' | 'tenant' | 'cross_tenant_readonly';
  editableRoles: string[];
  callableRoles: string[];
  apiKeyRequired: boolean;
}

export interface AgentVersionSnapshot {
  version: string;
  createdAt: string;
  createdBy: string;
  checksum: string;
  changeLog: string;
  configJson: string;
}

export interface AgentModelConfig {
  provider: 'enterprise' | 'openai_compatible' | 'private';
  modelName: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  systemPrompt: string;
  knowledgeBaseIds: string[];
  toolIds: string[];
}

export interface AgentEntity {
  id: string;
  name: string;
  domain: IndustryDomain;
  type: AgentType;
  status: AgentStatus;
  version: string;
  owner: string;
  description: string;
  permission: AgentPermission;
  modelConfig: AgentModelConfig;
  versions: AgentVersionSnapshot[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgentInput {
  name: string;
  domain: IndustryDomain;
  type: AgentType;
  owner: string;
  description?: string;
}

export interface UpdateAgentConfigInput {
  agentId: string;
  modelConfig?: Partial<AgentModelConfig>;
  permission?: Partial<AgentPermission>;
  description?: string;
}

export class AgentValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(message);
    this.name = 'AgentValidationError';
  }
}

export class AgentNotFoundError extends Error {
  constructor(public readonly agentId: string) {
    super(`Agent not found: ${agentId}`);
    this.name = 'AgentNotFoundError';
  }
}

const DOMAIN_LABEL: Record<IndustryDomain, string> = {
  government: '政企',
  finance: '金融',
  medical: '医疗',
  manufacturing: '制造'
};

const TYPE_LABEL: Record<AgentType, string> = {
  chat: '对话智能体',
  workflow: '业务流程智能体',
  tool: '工具型智能体',
  multimodal: '多模态智能体'
};

export function getDomainLabel(domain: IndustryDomain): string {
  return DOMAIN_LABEL[domain];
}

export function getTypeLabel(type: AgentType): string {
  return TYPE_LABEL[type];
}

export function bumpPatchVersion(version: string): string {
  const matched = version.replace(/^v/i, '').split('.');
  if (matched.length !== 3) {
    return 'v0.1.0';
  }
  const major = Number(matched[0]) || 0;
  const minor = Number(matched[1]) || 0;
  const patch = Number(matched[2]) || 0;
  return `v${major}.${minor}.${patch + 1}`;
}

export function createDefaultPermission(): AgentPermission {
  return {
    visibility: 'tenant',
    editableRoles: ['admin', 'developer'],
    callableRoles: ['authenticated'],
    apiKeyRequired: true
  };
}

export function createDefaultModelConfig(name: string, domain: IndustryDomain): AgentModelConfig {
  return {
    provider: 'enterprise',
    modelName: 'enterprise-llm-v2',
    temperature: 0.3,
    maxTokens: 4096,
    topP: 0.9,
    systemPrompt: `你是「${name}」，面向${getDomainLabel(domain)}场景提供专业、可追溯的答复。严格依据知识库与工具结果，禁止臆造。`,
    knowledgeBaseIds: [],
    toolIds: []
  };
}

export function validateCreateAgentInput(input: CreateAgentInput): void {
  if (!input.name || input.name.trim().length < 2) {
    throw new AgentValidationError('智能体名称至少 2 个字符', 'name');
  }
  if (input.name.trim().length > 64) {
    throw new AgentValidationError('智能体名称不能超过 64 个字符', 'name');
  }
  if (!input.owner) {
    throw new AgentValidationError('必须指定负责人', 'owner');
  }
  const domains: IndustryDomain[] = ['government', 'finance', 'medical', 'manufacturing'];
  if (!domains.includes(input.domain)) {
    throw new AgentValidationError('不支持的领域类型', 'domain');
  }
}

export function buildAgentEntity(input: CreateAgentInput, idFactory: () => string): AgentEntity {
  validateCreateAgentInput(input);
  const now = new Date().toISOString();
  const name = input.name.trim();
  return {
    id: idFactory(),
    name,
    domain: input.domain,
    type: input.type,
    status: 'draft',
    version: 'v0.1.0',
    owner: input.owner,
    description: input.description?.trim() || '新建智能体，待完善配置。',
    permission: createDefaultPermission(),
    modelConfig: createDefaultModelConfig(name, input.domain),
    versions: [],
    createdAt: now,
    updatedAt: now
  };
}

export class AgentLifecycleService {
  private store: Map<string, AgentEntity> = new Map();

  constructor(
    private readonly idFactory: () => string = () =>
      `ag_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  ) {}

  list(filter?: {
    status?: AgentStatus;
    domain?: IndustryDomain;
    keyword?: string;
  }): AgentEntity[] {
    let items = Array.from(this.store.values());
    if (filter?.status) {
      items = items.filter((item) => item.status === filter.status);
    }
    if (filter?.domain) {
      items = items.filter((item) => item.domain === filter.domain);
    }
    if (filter?.keyword) {
      const q = filter.keyword.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.owner.toLowerCase().includes(q)
      );
    }
    return items.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  }

  get(agentId: string): AgentEntity {
    const entity = this.store.get(agentId);
    if (!entity) {
      throw new AgentNotFoundError(agentId);
    }
    return entity;
  }

  create(input: CreateAgentInput): AgentEntity {
    const entity = buildAgentEntity(input, this.idFactory);
    this.store.set(entity.id, entity);
    return entity;
  }

  updateConfig(input: UpdateAgentConfigInput): AgentEntity {
    const entity = this.get(input.agentId);
    if (input.description !== undefined) {
      entity.description = input.description;
    }
    if (input.modelConfig) {
      entity.modelConfig = { ...entity.modelConfig, ...input.modelConfig };
    }
    if (input.permission) {
      entity.permission = { ...entity.permission, ...input.permission };
    }
    entity.updatedAt = new Date().toISOString();
    this.store.set(entity.id, entity);
    return entity;
  }

  createVersionBackup(agentId: string, operator: string, changeLog: string): AgentVersionSnapshot {
    const entity = this.get(agentId);
    const snapshot: AgentVersionSnapshot = {
      version: entity.version,
      createdAt: new Date().toISOString(),
      createdBy: operator,
      checksum: this.computeChecksum(entity),
      changeLog,
      configJson: JSON.stringify({
        modelConfig: entity.modelConfig,
        permission: entity.permission,
        description: entity.description
      })
    };
    entity.versions.unshift(snapshot);
    if (entity.versions.length > 10) {
      entity.versions = entity.versions.slice(0, 10);
    }
    entity.version = bumpPatchVersion(entity.version);
    entity.updatedAt = new Date().toISOString();
    this.store.set(entity.id, entity);
    return snapshot;
  }

  rollback(agentId: string, version: string): AgentEntity {
    const entity = this.get(agentId);
    const snapshot = entity.versions.find((item) => item.version === version);
    if (!snapshot) {
      throw new AgentValidationError(`版本不存在: ${version}`, 'version');
    }
    const parsed = JSON.parse(snapshot.configJson) as {
      modelConfig: AgentModelConfig;
      permission: AgentPermission;
      description: string;
    };
    entity.modelConfig = parsed.modelConfig;
    entity.permission = parsed.permission;
    entity.description = parsed.description;
    entity.version = snapshot.version;
    entity.updatedAt = new Date().toISOString();
    this.store.set(entity.id, entity);
    return entity;
  }

  publish(agentId: string): AgentEntity {
    const entity = this.get(agentId);
    if (!entity.modelConfig.systemPrompt) {
      throw new AgentValidationError('发布前必须配置系统提示词', 'systemPrompt');
    }
    entity.status = 'published';
    entity.updatedAt = new Date().toISOString();
    this.store.set(entity.id, entity);
    return entity;
  }

  archive(agentId: string): AgentEntity {
    const entity = this.get(agentId);
    entity.status = 'archived';
    entity.updatedAt = new Date().toISOString();
    this.store.set(entity.id, entity);
    return entity;
  }

  private computeChecksum(entity: AgentEntity): string {
    const raw = `${entity.id}|${entity.version}|${entity.modelConfig.modelName}|${entity.updatedAt}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i += 1) {
      hash = (hash << 5) - hash + raw.charCodeAt(i);
      hash |= 0;
    }
    return `ck_${Math.abs(hash).toString(16)}`;
  }
}

export default AgentLifecycleService;
