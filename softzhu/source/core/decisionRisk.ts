/**
 * 基于大语言模型的低代码智能体工作流构建系统
 * 模块：动态决策与风险控制
 */

export type DecisionResult =
  | 'auto_pass'
  | 'human_review'
  | 'pending_confirm'
  | 'retry'
  | 'terminate';

export interface RiskPolicy {
  highRiskThreshold: number;
  confidenceFloor: number;
  onEvalFail: 'retry' | 'human' | 'terminate';
  maxRetry: number;
  parallelJoin: 'all' | 'any' | 'vote';
  auditEnabled: boolean;
}

export interface DecisionEvent {
  id: string;
  workflowId: string;
  workflowName: string;
  runId: string;
  nodeId: string;
  nodeName: string;
  result: DecisionResult;
  riskScore: number;
  confidence: number;
  reason: string;
  operator?: string;
  createdAt: string;
  resolvedAt?: string;
  traceId: string;
}

export interface DecisionInput {
  workflowId: string;
  workflowName: string;
  runId: string;
  nodeId: string;
  nodeName: string;
  riskScore: number;
  confidence: number;
  fieldCompleteness: number;
  ruleViolations: string[];
  rawOutput?: unknown;
}

export interface AuditRecord {
  traceId: string;
  eventId: string;
  action: string;
  detail: string;
  at: string;
  actor: string;
}

export const DEFAULT_RISK_POLICY: RiskPolicy = {
  highRiskThreshold: 70,
  confidenceFloor: 0.75,
  onEvalFail: 'retry',
  maxRetry: 2,
  parallelJoin: 'all',
  auditEnabled: true
};

export class DecisionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DecisionError';
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function decideByPolicy(
  input: DecisionInput,
  policy: RiskPolicy
): {
  result: DecisionResult;
  reason: string;
} {
  if (input.ruleViolations.length > 0) {
    return {
      result: 'human_review',
      reason: `规则命中: ${input.ruleViolations.join('; ')}`
    };
  }

  if (input.fieldCompleteness < 0.9) {
    return {
      result: policy.onEvalFail === 'terminate' ? 'terminate' : 'retry',
      reason: `关键字段完整度不足: ${input.fieldCompleteness}`
    };
  }

  if (input.confidence < policy.confidenceFloor) {
    return {
      result: 'pending_confirm',
      reason: `模型置信度低于阈值 ${policy.confidenceFloor}`
    };
  }

  if (input.riskScore >= policy.highRiskThreshold) {
    return {
      result: 'human_review',
      reason: `风险分 ${input.riskScore} ≥ 高风险阈值 ${policy.highRiskThreshold}`
    };
  }

  return {
    result: 'auto_pass',
    reason: '风险与置信度均在安全区间，自动通过'
  };
}

export class DecisionRiskService {
  private policy: RiskPolicy;
  private events: Map<string, DecisionEvent> = new Map();
  private audits: AuditRecord[] = [];
  private retryCounter: Map<string, number> = new Map();

  constructor(policy: RiskPolicy = { ...DEFAULT_RISK_POLICY }) {
    this.policy = policy;
  }

  getPolicy(): RiskPolicy {
    return { ...this.policy };
  }

  updatePolicy(patch: Partial<RiskPolicy>): RiskPolicy {
    if (patch.highRiskThreshold !== undefined) {
      this.policy.highRiskThreshold = clamp(patch.highRiskThreshold, 0, 100);
    }
    if (patch.confidenceFloor !== undefined) {
      this.policy.confidenceFloor = clamp(patch.confidenceFloor, 0, 1);
    }
    if (patch.maxRetry !== undefined) {
      this.policy.maxRetry = Math.max(0, Math.floor(patch.maxRetry));
    }
    if (patch.onEvalFail) {
      this.policy.onEvalFail = patch.onEvalFail;
    }
    if (patch.parallelJoin) {
      this.policy.parallelJoin = patch.parallelJoin;
    }
    if (patch.auditEnabled !== undefined) {
      this.policy.auditEnabled = patch.auditEnabled;
    }
    this.writeAudit('system', 'policy_update', 'n/a', JSON.stringify(this.policy));
    return this.getPolicy();
  }

  evaluate(input: DecisionInput): DecisionEvent {
    const decided = decideByPolicy(input, this.policy);
    let result = decided.result;
    let reason = decided.reason;

    if (result === 'retry') {
      const key = `${input.runId}:${input.nodeId}`;
      const count = (this.retryCounter.get(key) || 0) + 1;
      this.retryCounter.set(key, count);
      if (count > this.policy.maxRetry) {
        result = this.policy.onEvalFail === 'terminate' ? 'terminate' : 'human_review';
        reason = `${reason}；已超过最大重试次数 ${this.policy.maxRetry}`;
      }
    }

    const event: DecisionEvent = {
      id: `dec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      workflowId: input.workflowId,
      workflowName: input.workflowName,
      runId: input.runId,
      nodeId: input.nodeId,
      nodeName: input.nodeName,
      result,
      riskScore: clamp(input.riskScore, 0, 100),
      confidence: clamp(input.confidence, 0, 1),
      reason,
      createdAt: new Date().toISOString(),
      traceId: `trc_${input.runId}_${input.nodeId}`
    };
    this.events.set(event.id, event);
    this.writeAudit('system', 'decision_evaluate', event.id, reason);
    return event;
  }

  confirm(eventId: string, operator: string, approve: boolean, comment?: string): DecisionEvent {
    const event = this.events.get(eventId);
    if (!event) {
      throw new DecisionError(`决策事件不存在: ${eventId}`);
    }
    if (event.result !== 'pending_confirm' && event.result !== 'human_review') {
      throw new DecisionError('当前事件不在待人工处理状态');
    }
    event.result = approve ? 'auto_pass' : 'retry';
    event.operator = operator;
    event.resolvedAt = new Date().toISOString();
    if (comment) {
      event.reason = `${event.reason} | 人工意见: ${comment}`;
    }
    if (!approve) {
      event.riskScore = Math.max(event.riskScore, this.policy.highRiskThreshold);
    } else {
      event.riskScore = Math.min(event.riskScore, 30);
    }
    this.writeAudit(operator, approve ? 'human_approve' : 'human_reject', event.id, comment || '');
    return event;
  }

  list(filter?: { result?: DecisionResult; pendingOnly?: boolean }): DecisionEvent[] {
    let items = Array.from(this.events.values());
    if (filter?.result) {
      items = items.filter((e) => e.result === filter.result);
    }
    if (filter?.pendingOnly) {
      items = items.filter((e) => e.result === 'pending_confirm' || e.result === 'human_review');
    }
    return items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  get(eventId: string): DecisionEvent {
    const event = this.events.get(eventId);
    if (!event) {
      throw new DecisionError(`决策事件不存在: ${eventId}`);
    }
    return event;
  }

  getAudits(traceId?: string): AuditRecord[] {
    if (!traceId) {
      return [...this.audits];
    }
    return this.audits.filter((a) => a.detail.includes(traceId) || a.eventId.includes(traceId));
  }

  summarize(): {
    pending: number;
    autoPass: number;
    retry: number;
    avgRisk: number;
  } {
    const all = Array.from(this.events.values());
    const pending = all.filter(
      (e) => e.result === 'pending_confirm' || e.result === 'human_review'
    ).length;
    const autoPass = all.filter((e) => e.result === 'auto_pass').length;
    const retry = all.filter((e) => e.result === 'retry').length;
    const avgRisk = all.length
      ? Math.round(all.reduce((s, e) => s + e.riskScore, 0) / all.length)
      : 0;
    return { pending, autoPass, retry, avgRisk };
  }

  private writeAudit(actor: string, action: string, eventId: string, detail: string): void {
    if (!this.policy.auditEnabled) {
      return;
    }
    this.audits.unshift({
      traceId: `audit_${Date.now()}`,
      eventId,
      action,
      detail,
      at: new Date().toISOString(),
      actor
    });
    if (this.audits.length > 1000) {
      this.audits = this.audits.slice(0, 1000);
    }
  }
}

export function resultLabel(result: DecisionResult): string {
  const map: Record<DecisionResult, string> = {
    auto_pass: '自动通过',
    human_review: '转人工复核',
    pending_confirm: '待确认',
    retry: '触发重试',
    terminate: '终止'
  };
  return map[result];
}

export default DecisionRiskService;
