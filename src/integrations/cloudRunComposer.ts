export interface ComposeRequest {
  jobId: string;
  projectId: string;
  shotAssets: Array<{
    shotId: string;
    imageR2Key: string;
    audioR2Key: string;
    durationSec: number;
  }>;
  subtitleSrtR2Key?: string;
}

export interface ComposeResponse {
  outputR2Key: string;
}

export async function triggerCloudRunCompose(url: string, idToken: string, req: ComposeRequest): Promise<ComposeResponse> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify(req)
  });

  if (!res.ok) {
    throw new Error(`cloud run compose failed: ${res.status}`);
  }

  return (await res.json()) as ComposeResponse;
}
