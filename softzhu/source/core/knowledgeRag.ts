/**
 * 基于大语言模型的低代码智能体工作流构建系统
 * 模块：企业级私有知识库与 RAG 检索增强
 */

export type DocumentType = 'pdf' | 'docx' | 'md' | 'xlsx' | 'txt' | 'html';
export type DocumentStatus = 'pending' | 'processing' | 'indexed' | 'failed';
export type KnowledgeBaseStatus = 'ready' | 'embedding' | 'error';

export interface KnowledgeBase {
  id: string;
  name: string;
  domain: string;
  embeddingModel: string;
  status: KnowledgeBaseStatus;
  documentCount: number;
  chunkCount: number;
  sizeBytes: number;
  progress?: number;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeDocument {
  id: string;
  knowledgeBaseId: string;
  name: string;
  type: DocumentType;
  status: DocumentStatus;
  chunkCount: number;
  sizeBytes: number;
  checksum: string;
  metadata: Record<string, string>;
  updatedAt: string;
}

export interface TextChunk {
  id: string;
  documentId: string;
  knowledgeBaseId: string;
  content: string;
  index: number;
  tokenCount: number;
  embedding?: number[];
  metadata: Record<string, string>;
}

export interface ChunkStrategy {
  mode: 'semantic' | 'fixed' | 'heading';
  chunkSize: number;
  overlap: number;
}

export interface RetrievalQuery {
  knowledgeBaseId: string;
  query: string;
  topK: number;
  scoreThreshold?: number;
  filters?: Record<string, string>;
}

export interface RetrievalHit {
  chunkId: string;
  documentId: string;
  documentName: string;
  content: string;
  score: number;
  metadata: Record<string, string>;
}

export interface RetrievalResult {
  query: string;
  hits: RetrievalHit[];
  tookMs: number;
  embeddingModel: string;
}

export class KnowledgeError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'KnowledgeError';
  }
}

export function detectDocumentType(filename: string): DocumentType {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return 'pdf';
    case 'docx':
    case 'doc':
      return 'docx';
    case 'md':
    case 'markdown':
      return 'md';
    case 'xlsx':
    case 'xls':
    case 'csv':
      return 'xlsx';
    case 'html':
    case 'htm':
      return 'html';
    default:
      return 'txt';
  }
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return `h_${Math.abs(hash).toString(16)}`;
}

/**
 * 文本切片器：支持固定长度与按标题层级的简易实现
 */
export class TextChunker {
  constructor(private strategy: ChunkStrategy) {}

  chunk(text: string, documentId: string, knowledgeBaseId: string): TextChunk[] {
    const normalized = text.replace(/\r\n/g, '\n').trim();
    if (!normalized) {
      return [];
    }
    if (this.strategy.mode === 'heading') {
      return this.chunkByHeading(normalized, documentId, knowledgeBaseId);
    }
    return this.chunkFixed(normalized, documentId, knowledgeBaseId);
  }

  private chunkFixed(text: string, documentId: string, knowledgeBaseId: string): TextChunk[] {
    const size = Math.max(64, this.strategy.chunkSize);
    const overlap = Math.min(this.strategy.overlap, size - 1);
    const chunks: TextChunk[] = [];
    let index = 0;
    let cursor = 0;
    while (cursor < text.length) {
      const end = Math.min(text.length, cursor + size);
      const content = text.slice(cursor, end).trim();
      if (content) {
        chunks.push({
          id: `${documentId}_chk_${index}`,
          documentId,
          knowledgeBaseId,
          content,
          index,
          tokenCount: Math.ceil(content.length / 2),
          metadata: { strategy: 'fixed' }
        });
        index += 1;
      }
      if (end >= text.length) {
        break;
      }
      cursor = end - overlap;
    }
    return chunks;
  }

  private chunkByHeading(text: string, documentId: string, knowledgeBaseId: string): TextChunk[] {
    const parts = text.split(/\n(?=#{1,3}\s)/);
    const chunks: TextChunk[] = [];
    parts.forEach((part, index) => {
      const content = part.trim();
      if (!content) return;
      if (content.length <= this.strategy.chunkSize) {
        chunks.push({
          id: `${documentId}_chk_${index}`,
          documentId,
          knowledgeBaseId,
          content,
          index: chunks.length,
          tokenCount: Math.ceil(content.length / 2),
          metadata: { strategy: 'heading' }
        });
      } else {
        const sub = this.chunkFixed(content, `${documentId}_${index}`, knowledgeBaseId);
        sub.forEach((item) => {
          chunks.push({
            ...item,
            id: `${documentId}_chk_${chunks.length}`,
            documentId,
            index: chunks.length,
            metadata: { strategy: 'heading+fixed' }
          });
        });
      }
    });
    return chunks;
  }
}

/**
 * 简易向量工具（演示用）：实际部署对接 Milvus / 企业向量库
 */
export class EmbeddingClient {
  constructor(
    private readonly model: string = 'bge-m3',
    private readonly dim: number = 64
  ) {}

  getModel(): string {
    return this.model;
  }

  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((text) => this.embedOne(text));
  }

  embedOne(text: string): number[] {
    const vector = new Array(this.dim).fill(0);
    for (let i = 0; i < text.length; i += 1) {
      const code = text.charCodeAt(i);
      vector[i % this.dim] += (code % 97) / 97;
    }
    const norm = Math.sqrt(vector.reduce((s, v) => s + v * v, 0)) || 1;
    return vector.map((v) => v / norm);
  }

  cosine(a: number[], b: number[]): number {
    const len = Math.min(a.length, b.length);
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (let i = 0; i < len; i += 1) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    const denom = Math.sqrt(na) * Math.sqrt(nb) || 1;
    return dot / denom;
  }
}

export class KnowledgeBaseService {
  private bases: Map<string, KnowledgeBase> = new Map();
  private documents: Map<string, KnowledgeDocument> = new Map();
  private chunks: Map<string, TextChunk[]> = new Map();
  private embedding = new EmbeddingClient();

  createKnowledgeBase(name: string, domain: string, embeddingModel = 'bge-m3'): KnowledgeBase {
    if (!name.trim()) {
      throw new KnowledgeError('知识库名称不能为空', 'NAME_REQUIRED');
    }
    const now = new Date().toISOString();
    const kb: KnowledgeBase = {
      id: `kb_${Date.now()}`,
      name: name.trim(),
      domain,
      embeddingModel,
      status: 'ready',
      documentCount: 0,
      chunkCount: 0,
      sizeBytes: 0,
      createdAt: now,
      updatedAt: now
    };
    this.bases.set(kb.id, kb);
    this.embedding = new EmbeddingClient(embeddingModel);
    return kb;
  }

  listKnowledgeBases(): KnowledgeBase[] {
    return Array.from(this.bases.values()).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  }

  getKnowledgeBase(id: string): KnowledgeBase {
    const kb = this.bases.get(id);
    if (!kb) {
      throw new KnowledgeError(`知识库不存在: ${id}`, 'KB_NOT_FOUND');
    }
    return kb;
  }

  async ingestDocument(
    knowledgeBaseId: string,
    filename: string,
    content: string,
    strategy: ChunkStrategy = { mode: 'semantic', chunkSize: 512, overlap: 64 }
  ): Promise<KnowledgeDocument> {
    const kb = this.getKnowledgeBase(knowledgeBaseId);
    kb.status = 'embedding';
    kb.progress = 10;

    const doc: KnowledgeDocument = {
      id: `doc_${Date.now()}`,
      knowledgeBaseId,
      name: filename,
      type: detectDocumentType(filename),
      status: 'processing',
      chunkCount: 0,
      sizeBytes: Buffer.byteLength(content, 'utf8'),
      checksum: simpleHash(content),
      metadata: { filename },
      updatedAt: new Date().toISOString()
    };
    this.documents.set(doc.id, doc);

    const effective: ChunkStrategy =
      strategy.mode === 'semantic'
        ? { mode: 'fixed', chunkSize: strategy.chunkSize, overlap: strategy.overlap }
        : strategy;
    const chunker = new TextChunker(effective);
    const chunks = chunker.chunk(content, doc.id, knowledgeBaseId);
    kb.progress = 45;

    const vectors = await this.embedding.embed(chunks.map((c) => c.content));
    chunks.forEach((chunk, idx) => {
      chunk.embedding = vectors[idx];
    });
    this.chunks.set(doc.id, chunks);

    doc.status = 'indexed';
    doc.chunkCount = chunks.length;
    doc.updatedAt = new Date().toISOString();

    kb.documentCount += 1;
    kb.chunkCount += chunks.length;
    kb.sizeBytes += doc.sizeBytes;
    kb.status = 'ready';
    kb.progress = 100;
    kb.updatedAt = new Date().toISOString();

    return doc;
  }

  listDocuments(knowledgeBaseId: string): KnowledgeDocument[] {
    return Array.from(this.documents.values())
      .filter((d) => d.knowledgeBaseId === knowledgeBaseId)
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  }

  async reindex(documentId: string): Promise<KnowledgeDocument> {
    const doc = this.documents.get(documentId);
    if (!doc) {
      throw new KnowledgeError(`文档不存在: ${documentId}`, 'DOC_NOT_FOUND');
    }
    doc.status = 'processing';
    doc.updatedAt = new Date().toISOString();
    const existing = this.chunks.get(documentId) || [];
    const vectors = await this.embedding.embed(existing.map((c) => c.content));
    existing.forEach((chunk, idx) => {
      chunk.embedding = vectors[idx];
    });
    doc.status = 'indexed';
    doc.updatedAt = new Date().toISOString();
    return doc;
  }

  async retrieve(query: RetrievalQuery): Promise<RetrievalResult> {
    const started = Date.now();
    const kb = this.getKnowledgeBase(query.knowledgeBaseId);
    const qVec = this.embedding.embedOne(query.query);
    const allChunks: TextChunk[] = [];

    for (const doc of this.listDocuments(kb.id)) {
      const list = this.chunks.get(doc.id) || [];
      for (const chunk of list) {
        if (query.filters) {
          const ok = Object.entries(query.filters).every(
            ([k, v]) => chunk.metadata[k] === v || doc.metadata[k] === v
          );
          if (!ok) continue;
        }
        allChunks.push(chunk);
      }
    }

    const scored: RetrievalHit[] = allChunks
      .map((chunk) => {
        const score = chunk.embedding ? this.embedding.cosine(qVec, chunk.embedding) : 0;
        const doc = this.documents.get(chunk.documentId);
        return {
          chunkId: chunk.id,
          documentId: chunk.documentId,
          documentName: doc?.name || 'unknown',
          content: chunk.content,
          score,
          metadata: chunk.metadata
        };
      })
      .filter((hit) => hit.score >= (query.scoreThreshold ?? 0))
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(1, query.topK));

    return {
      query: query.query,
      hits: scored,
      tookMs: Date.now() - started,
      embeddingModel: kb.embeddingModel
    };
  }

  buildAugmentedPrompt(userQuestion: string, hits: RetrievalHit[], maxChars = 3000): string {
    const lines: string[] = ['【检索知识】'];
    let used = 0;
    hits.forEach((hit, index) => {
      const block = `#${index + 1} (${hit.documentName}, score=${hit.score.toFixed(2)})\n${hit.content}`;
      if (used + block.length > maxChars) {
        return;
      }
      lines.push(block);
      used += block.length;
    });
    lines.push('【用户问题】');
    lines.push(userQuestion);
    lines.push('请仅依据检索知识作答，并标注引用来源编号；知识不足时明确说明。');
    return lines.join('\n\n');
  }
}

export default KnowledgeBaseService;
