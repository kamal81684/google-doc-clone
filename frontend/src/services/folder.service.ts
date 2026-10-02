import api from "./axios";

export interface Folder {
  id: string;
  name: string;
  description?: string | null;
  documentCount: number;
  createdAt: string;
  updatedAt: string;
}

export const getFolders = async () => {
    const response = await api.get("/folders");
    return response.data;
};

export const createFolder = async (name: string) => {
    const response = await api.post("/folders", { name });
    return response.data;
};

export const renameFolder = async (id: string, name: string) => {
    const response = await api.patch(`/folders/${id}`, { name });
    return response.data;
};

export const deleteFolder = async (id: string) => {
    const response = await api.delete(`/folders/${id}`);
    return response.data;
};
