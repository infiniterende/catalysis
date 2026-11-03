/**
 * Gemini on Vertex AI. There is no API key: the client signs in as whoever the
 * server runs as. On Cloud Run that is the service's own account (it needs the
 * Vertex AI User role); on a developer's machine it is their Application Default
 * Credentials (`gcloud auth application-default login`).
 *
 * GOOGLE_CLOUD_PROJECT turns it on. GOOGLE_CLOUD_LOCATION defaults to `global`,
 * the endpoint where Google serves its newest Gemini models.
 */
import { ApiError, GoogleGenAI } from '@google/genai';

export const vertexConfigured = () => Boolean(process.env.GOOGLE_CLOUD_PROJECT);

let client: GoogleGenAI | undefined;

export function vertex(): GoogleGenAI {
  if (!client) {
    const project = process.env.GOOGLE_CLOUD_PROJECT;
    client = new GoogleGenAI({
      vertexai: true,
      project,
      location: process.env.GOOGLE_CLOUD_LOCATION || 'global',
      // Bill and count quota against this project, whatever project a developer's own credentials name.
      googleAuthOptions: { projectId: project, clientOptions: { quotaProjectId: project } },
    });
  }
  return client;
}

/** The HTTP status of a Vertex AI error, if it carries one. */
export function vertexStatus(error: unknown): number | undefined {
  return error instanceof ApiError ? error.status : undefined;
}

/** True for a failure to find or use credentials, before any request is made. */
export function isCredentialsError(error: unknown): boolean {
  return error instanceof Error && /default credentials|could not load the default|invalid_grant|reauth/i.test(error.message);
}
