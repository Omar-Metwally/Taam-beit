import api from "./client";

// ── Chef profile application ──────────────────────────────────────────────────

export interface ApplyAsChefPayload {
  latitude: number;
  longitude: number;
  addressLine?: string;
}

export const chefApi = {
  apply: (payload: ApplyAsChefPayload) =>
    api.post("/me/chef-profile", payload).then((r) => r.data),

  uploadDocument: (documentType: 0 | 1, file: File) => {
    const form = new FormData();
    form.append("document", file);
    return api
      .post<{
        objectKey: string;
      }>(`/me/chef-documents?documentType=${documentType}`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },
};
