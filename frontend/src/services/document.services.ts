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