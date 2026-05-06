export interface ModalRenderRequest {
  workflowName: "sdxl_instantid_ipadapter" | "flux_pulid_fallback";
  promptEn: string;
  promptSource: string;
  semanticCheckScore: number;
  actorId: string;
  shotId: string;
  seed: number;
}

export interface ModalRenderResult {
  imageR2Key: string;
  metaR2Key: string;
}

export async function triggerModalRender(endpoint: string, token: string, req: ModalRenderRequest): Promise<ModalRenderResult> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify(req)
  });

  if (!res.ok) {
    throw new Error(`modal render failed: ${res.status}`);
  }

  return (await res.json()) as ModalRenderResult;
}
