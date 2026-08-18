import { google } from 'googleapis';

const REQUIRED_GOOGLE_ENV = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_REFRESH_TOKEN'
] as const;

export class GoogleAuthConfigurationError extends Error {
  constructor(public readonly missingVariables: string[]) {
    super(`Missing Google OAuth environment variables: ${missingVariables.join(', ')}`);
    this.name = 'GoogleAuthConfigurationError';
  }
}

export function createGoogleAuthFromEnv(env: NodeJS.ProcessEnv = process.env) {
  const missing = REQUIRED_GOOGLE_ENV.filter(name => !env[name]?.trim());
  if (missing.length > 0) throw new GoogleAuthConfigurationError([...missing]);

  const client = new google.auth.OAuth2(env.GOOGLE_CLIENT_ID!, env.GOOGLE_CLIENT_SECRET!);
  client.setCredentials({ refresh_token: env.GOOGLE_REFRESH_TOKEN! });
  return client;
}
