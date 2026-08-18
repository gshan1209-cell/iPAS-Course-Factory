export interface GenerationRequest {
  artifactKind: string;
  systemInstructions: string;
  prompt: string;
  sourceIds: string[];
}

export interface GenerationResult {
  text: string;
  provider: string;
  model: string;
  responseId: string | null;
}

export interface GenerationPort {
  generate(request: GenerationRequest): Promise<GenerationResult>;
}
