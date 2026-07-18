import api from "./axios";

export interface Document {
  id: string;
  title: string;
  content: any;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export const createDocument = async () => {
    const response = await api.post("/documents");
    return response.data;
};

export const getDocumentById = async (id: string) => {
    const response = await api.get(`/documents/${id}`);
    return response.data;
};

export const getDocuments = async () => {
    const response = await api.get("/documents");
    return response.data;
};

export const getMyDocuments = async () => {
    const response = await api.get("/documents/user");
    return response.data;
};

export const updateDocument = async (
    id: string,
    data: {
        title?: string;
        content?: any;
    }
) => {
    const response = await api.patch(
        `/documents/${id}`,
        data
    );

    return response.data;
};

export const downloadDocument = async (
    id: string,
    format: "txt" | "pdf"
) => {
    const response = await api.get(
        `/documents/${id}/download/${format}`,
        {
            responseType: "blob",
        }
    );

    const contentType = Array.isArray(response.headers["content-type"])
        ? response.headers["content-type"][0]
        : response.headers["content-type"];
    // if (contentType && contentType.includes("application/json")) {
    //     const text = await (response.data as Blob).text();
    //     const json = JSON.parse(text);
    //     throw new Error(json.message || "Download failed");
    // }

    return response.data;
};