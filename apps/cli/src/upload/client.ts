export interface UploadResult {
  run_id: string;
  status: string;
  run_url: string;
}

export async function uploadBundle(bundlePath: string): Promise<UploadResult> {
  // TODO: Implement real upload when backend is ready
  // POST /api/v0/runs with multipart/form-data containing the bundle zip

  const bundleId = bundlePath
    .split("/")
    .pop()
    ?.replace(".zip", "")
    .split("_")
    .pop();

  console.log("[stub] Upload endpoint not yet configured.");
  console.log(`[stub] Bundle would be uploaded: ${bundlePath}`);

  return {
    run_id: `r_${bundleId}`,
    status: "Community",
    run_url: `https://whatcani.run/runs/r_${bundleId}`,
  };
}
