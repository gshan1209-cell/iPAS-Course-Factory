import { describe, expect, it } from 'vitest';
import {
  EmptyGenerationError,
  GenerationConfigurationError,
  OpenAIGenerationAdapter,
  createOpenAIGenerationAdapterFromEnv
} from '../src/openai-adapter.js';

const request = {
  artifactKind: 'SOURCE_BRIEF',
  systemInstructions: 'Use only governed sources.',
  prompt: 'Create the brief.',
  sourceIds: ['guide']
};

describe('OpenAIGenerationAdapter', () => {
  it('maps model, instructions and input and captures response ID', async () => {
    const calls: unknown[] = [];
    const client = { responses: { async create(input: unknown) { calls.push(input); return { id: 'resp_1', output_text: 'brief text' }; } } };
    const adapter = new OpenAIGenerationAdapter(client, 'configured-model');
    const result = await adapter.generate(request);

    expect(calls).toEqual([{ model: 'configured-model', instructions: request.systemInstructions, input: request.prompt }]);
    expect(result).toEqual({ text: 'brief text', provider: 'openai', model: 'configured-model', responseId: 'resp_1' });
  });

  it('rejects empty generated text', async () => {
    const client = { responses: { async create() { return { id: 'resp_empty', output_text: '   ' }; } } };
    await expect(new OpenAIGenerationAdapter(client, 'configured-model').generate(request)).rejects.toThrow(EmptyGenerationError);
  });

  it('requires API key and model when constructed from environment', () => {
    expect(() => createOpenAIGenerationAdapterFromEnv({})).toThrow(GenerationConfigurationError);
    expect(() => createOpenAIGenerationAdapterFromEnv({ OPENAI_API_KEY: 'key' })).toThrow(/OPENAI_MODEL/);
  });
});
