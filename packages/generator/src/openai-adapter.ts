import OpenAI from 'openai';
import type { GenerationPort, GenerationRequest, GenerationResult } from './port.js';

export interface OpenAIResponsesClient {
  responses: {
    create(input: { model: string; instructions: string; input: string }): Promise<{
      id?: string | null;
      output_text: string;
    }>;
  };
}

export class EmptyGenerationError extends Error {
  constructor(public readonly artifactKind: string) {
    super(`OpenAI returned empty text for artifact: ${artifactKind}`);
    this.name = 'EmptyGenerationError';
  }
}

export class GenerationConfigurationError extends Error {
  constructor(public readonly missingVariables: string[]) {
    super(`Missing generation environment variables: ${missingVariables.join(', ')}`);
    this.name = 'GenerationConfigurationError';
  }
}

export class OpenAIGenerationAdapter implements GenerationPort {
  constructor(
    private readonly client: OpenAIResponsesClient,
    private readonly model: string
  ) {
    if (!model.trim()) throw new GenerationConfigurationError(['OPENAI_MODEL']);
  }

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    const response = await this.client.responses.create({
      model: this.model,
      instructions: request.systemInstructions,
      input: request.prompt
    });
    if (!response.output_text.trim()) throw new EmptyGenerationError(request.artifactKind);

    return {
      text: response.output_text,
      provider: 'openai',
      model: this.model,
      responseId: response.id ?? null
    };
  }
}

export function createOpenAIGenerationAdapterFromEnv(
  env: Record<string, string | undefined> = process.env,
  clientFactory: (apiKey: string) => OpenAIResponsesClient = apiKey => new OpenAI({ apiKey }) as OpenAIResponsesClient
): OpenAIGenerationAdapter {
  const missing = ['OPENAI_API_KEY', 'OPENAI_MODEL'].filter(name => !env[name]?.trim());
  if (missing.length > 0) throw new GenerationConfigurationError(missing);
  return new OpenAIGenerationAdapter(clientFactory(env.OPENAI_API_KEY!.trim()), env.OPENAI_MODEL!.trim());
}
