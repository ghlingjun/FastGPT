/**
 * 基于大语言模型的低代码智能体工作流构建系统
 * 模块：多渠道发布、鉴权与状态追踪
 */

export type PublishChannel = 'api' | 'h5' | 'webhook';
export type PublishStatus = 'online' | 'debugging' | 'offline';

export interface PublishRecord {
  id: string;
  name: string;
  channel: PublishChannel;
  workflowId: string;
  workflowName: string;
  endpoint: string;
  status: PublishStatus;
  authMode: 'api_key' | 'jwt' | 'ip_whitelist';
  traceEnabled: boolean;
  callCount: number;
  createdAt: string;
  updatedAt: string;
  config: Record<string, unknown>;
}

export interface TraceItem {
  id: string;
  publishId: string;
  runId: string;
  status: 'success' | 'failed' | 'waiting_human' | 'retrying';
  latencyMs: number | null;
  at: string;
  requestId: string;
}

export interface ApiInvokeRequest {
  apiKey?: string;
  jwt?: string;
  clientIp?: string;
  conversationId: string;
  variables: Record<string, unknown>;
  stream?: boolean;
  dryRun?: boolean;
}

export interface ApiInvokeResponse {
  runId: string;
  status: string;
  data?: unknown;
  error?: string;
  traceId: string;
}

export class PublishError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'PublishError';
  }
}

export function channelLabel(channel: PublishChannel): string {
  if (channel === 'api') return '标准 API';
  if (channel === 'h5') return 'H5 网页';
  return 'Webhook';
}

export function buildEndpoint(channel: PublishChannel, slug: string): string {
  const safe = slug.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
  if (channel === 'h5') {
    return `https://demo.aw-engine.local/h5/${safe}`;
  }
  if (channel === 'webhook') {
    return `https://hooks.aw-engine.local/${safe}`;
  }
  return `/api/v1/agent/${safe}/run`;
}

export class PublishService {
  private records: Map<string, PublishRecord> = new Map();
  private traces: Map<string, TraceItem[]> = new Map();
  private apiKeys: Map<string, string> = new Map();

  create(input: {
    name: string;
    channel: PublishChannel;
    workflowId: string;
    workflowName: string;
    authMode?: PublishRecord['authMode'];
    traceEnabled?: boolean;
    config?: Record<string, unknown>;
  }): PublishRecord {
    if (!input.name.trim()) {
      throw new PublishError('发布名称不能为空', 'NAME_REQUIRED');
    }
    const now = new Date().toISOString();
    const id = `pub_${Date.now()}`;
    const slug = input.name.trim();
    const record: PublishRecord = {
      id,
      name: input.name.trim(),
      channel: input.channel,
      workflowId: input.workflowId,
      workflowName: input.workflowName,
      endpoint: buildEndpoint(input.channel, slug),
      status: 'debugging',
      authMode: input.authMode || 'api_key',
      traceEnabled: input.traceEnabled !== false,
      callCount: 0,
      createdAt: now,
      updatedAt: now,
      config: input.config || {}
    };
    this.records.set(id, record);
    this.traces.set(id, []);
    this.apiKeys.set(id, `awk_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`);
    return record;
  }

  list(): PublishRecord[] {
    return Array.from(this.records.values()).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  }

  get(id: string): PublishRecord {
    const record = this.records.get(id);
    if (!record) {
      throw new PublishError(`发布记录不存在: ${id}`, 'NOT_FOUND');
    }
    return record;
  }

  setStatus(id: string, status: PublishStatus): PublishRecord {
    const record = this.get(id);
    record.status = status;
    record.updatedAt = new Date().toISOString();
    return record;
  }

  getApiKey(id: string): string {
    this.get(id);
    return this.apiKeys.get(id) || '';
  }

  authorize(record: PublishRecord, req: ApiInvokeRequest): void {
    if (record.status === 'offline') {
      throw new PublishError('发布通道已下线', 'OFFLINE');
    }
    if (record.authMode === 'api_key') {
      const expected = this.apiKeys.get(record.id);
      if (!req.apiKey || req.apiKey !== expected) {
        throw new PublishError('API Key 无效', 'UNAUTHORIZED');
      }
    }
    if (record.authMode === 'jwt') {
      if (!req.jwt || req.jwt.split('.').length < 3) {
        throw new PublishError('JWT 无效', 'UNAUTHORIZED');
      }
    }
    if (record.authMode === 'ip_whitelist') {
      const whitelist = (record.config.ipWhitelist as string[]) || [];
      if (whitelist.length && req.clientIp && !whitelist.includes(req.clientIp)) {
        throw new PublishError('IP 未在白名单', 'FORBIDDEN');
      }
    }
  }

  async invoke(publishId: string, req: ApiInvokeRequest): Promise<ApiInvokeResponse> {
    const record = this.get(publishId);
    this.authorize(record, req);

    const runId = `run_${Date.now()}`;
    const traceId = `trc_${runId}`;
    const started = Date.now();

    if (req.dryRun) {
      return {
        runId,
        status: 'dry_run',
        data: { accepted: true, variables: req.variables },
        traceId
      };
    }

    // 演示：模拟执行成功；真实环境将回调工作流运行时
    const latency = 800 + Math.floor(Math.random() * 3000);
    await new Promise((resolve) => setTimeout(resolve, 10));

    const status: TraceItem['status'] =
      Number(req.variables.forceHuman) === 1 ? 'waiting_human' : 'success';

    record.callCount += 1;
    record.updatedAt = new Date().toISOString();

    if (record.traceEnabled) {
      const list = this.traces.get(publishId) || [];
      list.unshift({
        id: `tr_${Date.now()}`,
        publishId,
        runId,
        status,
        latencyMs: status === 'waiting_human' ? null : latency,
        at: new Date().toISOString(),
        requestId: req.conversationId
      });
      this.traces.set(publishId, list.slice(0, 200));
    }

    return {
      runId,
      status,
      data:
        status === 'success'
          ? { decision: 'pass_with_conditions', score: 62, tookMs: Date.now() - started }
          : { waiting: true },
      traceId
    };
  }

  listTraces(publishId: string, limit = 50): TraceItem[] {
    this.get(publishId);
    return (this.traces.get(publishId) || []).slice(0, limit);
  }

  renderOpenApiSnippet(publishId: string): string {
    const record = this.get(publishId);
    return [
      `POST ${record.endpoint} HTTP/1.1`,
      'Host: api.aw-engine.local',
      'Authorization: Bearer <YOUR_API_KEY>',
      'Content-Type: application/json',
      '',
      '{',
      '  "conversationId": "conv_demo_001",',
      '  "variables": {',
      '    "applicantId": "A20260630001",',
      '    "amount": 500000',
      '  },',
      '  "stream": false',
      '}'
    ].join('\n');
  }
}

export default PublishService;
