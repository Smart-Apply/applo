export interface LLMProvider {
  /**
   * Generate text completion from a prompt
   * @param prompt - The prompt to generate from
   * @param options - Additional options
   * @returns Generated text
   */
  generateText(prompt: string, options?: GenerateOptions): Promise<string>;

  /**
   * Health check for the LLM provider
   * @returns true if the provider is healthy, false otherwise
   */
  healthCheck?(): Promise<boolean>;
}

export interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
  systemMessage?: string;
  /**
   * Azure OpenAI `response_format` for structured outputs (#8).
   * - `{ type: 'json_object' }` — JSON mode: the model must emit syntactically
   *   valid JSON (no code fences, no prose). Requires the word "json" somewhere
   *   in the messages (the caller guarantees this).
   * - `{ type: 'json_schema', json_schema: {...} }` — schema-constrained output:
   *   responses are valid against the schema by construction (api-version
   *   2024-08-01-preview or newer).
   * Providers that don't support it (mock) ignore this field.
   */
  responseFormat?: ResponseFormat;
}

export type ResponseFormat =
  | { type: 'json_object' }
  | {
      type: 'json_schema';
      json_schema: {
        name: string;
        strict: boolean;
        schema: Record<string, unknown>;
      };
    };
