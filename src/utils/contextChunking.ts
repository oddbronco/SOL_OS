export interface ChunkStrategy {
  maxTokens: number;
  overlapTokens: number;
  priorityOrder: string[];
}

export interface ContextChunk {
  priority: number;
  type: string;
  content: string;
  tokenEstimate: number;
  metadata?: Record<string, any>;
}

export interface ChunkedContext {
  chunks: ContextChunk[];
  totalTokens: number;
  needsChaining: boolean;
  chainStrategy?: 'sequential' | 'hierarchical';
}

const DEFAULT_STRATEGY: ChunkStrategy = {
  maxTokens: 120000,
  overlapTokens: 2000,
  priorityOrder: [
    'project_summary',
    'custom_prompt',
    'template_prompt',
    'question_answers',
    'stakeholder_profiles',
    'file_content',
    'questions_list',
    'metadata'
  ]
};

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function createContextChunks(
  contextParts: Record<string, string>,
  strategy: Partial<ChunkStrategy> = {}
): ChunkedContext {
  const finalStrategy = { ...DEFAULT_STRATEGY, ...strategy };

  const chunks: ContextChunk[] = [];
  let totalTokens = 0;

  for (const [key, content] of Object.entries(contextParts)) {
    if (!content || content.trim().length === 0) continue;

    const tokenEstimate = estimateTokens(content);
    totalTokens += tokenEstimate;

    const priority = finalStrategy.priorityOrder.indexOf(key);

    chunks.push({
      priority: priority === -1 ? 999 : priority,
      type: key,
      content,
      tokenEstimate,
      metadata: {
        originalLength: content.length
      }
    });
  }

  chunks.sort((a, b) => a.priority - b.priority);

  const needsChaining = totalTokens > finalStrategy.maxTokens;

  return {
    chunks,
    totalTokens,
    needsChaining,
    chainStrategy: needsChaining ? 'sequential' : undefined
  };
}

export function buildPromptWithinLimit(
  chunkedContext: ChunkedContext,
  basePrompt: string,
  maxTokens: number = 120000
): { prompt: string; usedChunks: string[]; droppedChunks: string[] } {
  const baseTokens = estimateTokens(basePrompt);
  let remainingTokens = maxTokens - baseTokens - 1000;

  const usedChunks: string[] = [];
  const droppedChunks: string[] = [];
  let promptParts: string[] = [basePrompt];

  for (const chunk of chunkedContext.chunks) {
    if (chunk.tokenEstimate <= remainingTokens) {
      promptParts.push(`\n\n=== ${chunk.type.toUpperCase().replace(/_/g, ' ')} ===\n${chunk.content}`);
      remainingTokens -= chunk.tokenEstimate;
      usedChunks.push(chunk.type);
    } else {
      droppedChunks.push(chunk.type);
      console.warn(`⚠️ Dropped ${chunk.type} (${chunk.tokenEstimate} tokens) - would exceed limit`);
    }
  }

  return {
    prompt: promptParts.join('\n'),
    usedChunks,
    droppedChunks
  };
}

export async function generateWithChaining<T>(
  chunkedContext: ChunkedContext,
  basePrompt: string,
  generator: (prompt: string) => Promise<T>,
  combiner: (results: T[]) => T,
  maxTokens: number = 120000
): Promise<{ result: T; strategy: string; iterations: number }> {

  if (!chunkedContext.needsChaining) {
    const { prompt } = buildPromptWithinLimit(chunkedContext, basePrompt, maxTokens);
    const result = await generator(prompt);
    return {
      result,
      strategy: 'single-pass',
      iterations: 1
    };
  }

  if (chunkedContext.chainStrategy === 'sequential') {
    return await sequentialChaining(chunkedContext, basePrompt, generator, combiner, maxTokens);
  }

  return await hierarchicalChaining(chunkedContext, basePrompt, generator, combiner, maxTokens);
}

async function sequentialChaining<T>(
  chunkedContext: ChunkedContext,
  basePrompt: string,
  generator: (prompt: string) => Promise<T>,
  combiner: (results: T[]) => T,
  maxTokens: number
): Promise<{ result: T; strategy: string; iterations: number }> {
  console.log('📊 Using sequential chaining for large context');

  const baseTokens = estimateTokens(basePrompt);
  const availablePerChunk = maxTokens - baseTokens - 2000;

  const results: T[] = [];
  let currentBatch: ContextChunk[] = [];
  let currentBatchTokens = 0;
  let iteration = 0;

  for (const chunk of chunkedContext.chunks) {
    if (currentBatchTokens + chunk.tokenEstimate > availablePerChunk && currentBatch.length > 0) {
      iteration++;
      console.log(`  📦 Processing batch ${iteration} (${currentBatch.length} chunks, ~${currentBatchTokens} tokens)`);

      const batchPrompt = basePrompt + '\n\n' +
        currentBatch.map(c => `=== ${c.type.toUpperCase().replace(/_/g, ' ')} ===\n${c.content}`).join('\n\n');

      const result = await generator(batchPrompt);
      results.push(result);

      currentBatch = [];
      currentBatchTokens = 0;
    }

    currentBatch.push(chunk);
    currentBatchTokens += chunk.tokenEstimate;
  }

  if (currentBatch.length > 0) {
    iteration++;
    console.log(`  📦 Processing final batch ${iteration} (${currentBatch.length} chunks, ~${currentBatchTokens} tokens)`);

    const batchPrompt = basePrompt + '\n\n' +
      currentBatch.map(c => `=== ${c.type.toUpperCase().replace(/_/g, ' ')} ===\n${c.content}`).join('\n\n');

    const result = await generator(batchPrompt);
    results.push(result);
  }

  console.log(`✅ Completed ${iteration} iterations, combining results`);

  return {
    result: combiner(results),
    strategy: 'sequential',
    iterations: iteration
  };
}

async function hierarchicalChaining<T>(
  chunkedContext: ChunkedContext,
  basePrompt: string,
  generator: (prompt: string) => Promise<T>,
  combiner: (results: T[]) => T,
  maxTokens: number
): Promise<{ result: T; strategy: string; iterations: number }> {
  console.log('🌳 Using hierarchical chaining for large context');

  const criticalChunks = chunkedContext.chunks.filter(c => c.priority < 3);
  const normalChunks = chunkedContext.chunks.filter(c => c.priority >= 3);

  const criticalContent = criticalChunks.map(c =>
    `=== ${c.type.toUpperCase().replace(/_/g, ' ')} ===\n${c.content}`
  ).join('\n\n');

  console.log(`  🎯 Phase 1: Processing ${criticalChunks.length} critical chunks`);
  const phase1Prompt = `${basePrompt}\n\n${criticalContent}\n\n---\n\nGenerate a summary that captures the key information from the above context.`;
  const phase1Result = await generator(phase1Prompt);

  const phase1Summary = typeof phase1Result === 'string' ? phase1Result : JSON.stringify(phase1Result);
  const phase1Tokens = estimateTokens(phase1Summary);

  console.log(`  📝 Phase 1 summary: ~${phase1Tokens} tokens`);

  const availableForDetail = maxTokens - estimateTokens(basePrompt) - phase1Tokens - 2000;

  let detailBatch: ContextChunk[] = [];
  let detailTokens = 0;
  const detailResults: T[] = [phase1Result];
  let iteration = 1;

  for (const chunk of normalChunks) {
    if (detailTokens + chunk.tokenEstimate > availableForDetail && detailBatch.length > 0) {
      iteration++;
      console.log(`  📦 Phase 2.${iteration}: Processing detail batch (${detailBatch.length} chunks, ~${detailTokens} tokens)`);

      const detailContent = detailBatch.map(c =>
        `=== ${c.type.toUpperCase().replace(/_/g, ' ')} ===\n${c.content}`
      ).join('\n\n');

      const detailPrompt = `${basePrompt}\n\nBASE CONTEXT:\n${phase1Summary}\n\nADDITIONAL DETAILS:\n${detailContent}\n\n---\n\nRefine the output by incorporating these additional details.`;

      const result = await generator(detailPrompt);
      detailResults.push(result);

      detailBatch = [];
      detailTokens = 0;
    }

    detailBatch.push(chunk);
    detailTokens += chunk.tokenEstimate;
  }

  if (detailBatch.length > 0) {
    iteration++;
    console.log(`  📦 Phase 2.${iteration}: Processing final detail batch (${detailBatch.length} chunks, ~${detailTokens} tokens)`);

    const detailContent = detailBatch.map(c =>
      `=== ${c.type.toUpperCase().replace(/_/g, ' ')} ===\n${c.content}`
    ).join('\n\n');

    const detailPrompt = `${basePrompt}\n\nBASE CONTEXT:\n${phase1Summary}\n\nADDITIONAL DETAILS:\n${detailContent}\n\n---\n\nRefine the output by incorporating these additional details.`;

    const result = await generator(detailPrompt);
    detailResults.push(result);
  }

  console.log(`✅ Completed hierarchical processing (${iteration + 1} total phases), combining results`);

  return {
    result: combiner(detailResults),
    strategy: 'hierarchical',
    iterations: iteration + 1
  };
}

export function smartTruncate(text: string, maxLength: number, preserveStructure: boolean = true): string {
  if (text.length <= maxLength) return text;

  if (!preserveStructure) {
    return text.substring(0, maxLength - 3) + '...';
  }

  const lines = text.split('\n');
  let result = '';
  let currentLength = 0;

  for (const line of lines) {
    if (currentLength + line.length + 1 > maxLength) {
      result += '\n\n... [Content truncated to fit context limit] ...';
      break;
    }
    result += (result ? '\n' : '') + line;
    currentLength += line.length + 1;
  }

  return result;
}
