/**
 * llmClient.ts — LLM 适配层
 *
 * 统一接口，当前接 DeepSeek（OpenAI 兼容格式）。
 * 后续可切换 Claude / 其他 provider。
 */

import OpenAI from 'openai';

export interface LlmResponse {
  content: string;
  model: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}

const client = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env['DEEPSEEK_API_KEY'] || '',
});

/**
 * 调用 LLM 生成结构化 JSON 输出
 */
export async function generateJson(systemPrompt: string, userPrompt: string): Promise<LlmResponse> {
  const apiKey = process.env['DEEPSEEK_API_KEY'] || '';
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY environment variable not set');
  }

  const response = await client.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 2000,
    temperature: 0.3,
  });

  const choice = response.choices[0];
  const content = choice?.message?.content || '';

  if (!content) {
    throw new Error('LLM returned empty content');
  }

  return {
    content,
    model: response.model,
    usage: response.usage ? {
      promptTokens: response.usage.prompt_tokens,
      completionTokens: response.usage.completion_tokens,
      totalTokens: response.usage.total_tokens,
    } : undefined,
  };
}
