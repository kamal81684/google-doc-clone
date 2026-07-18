"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Search, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getMe, logout, User } from "@/services/auth.service";
import {
  createDocument,
  getDocuments,
  deleteDocument,
  Document,
} from "@/services/document.services";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  const fetchDocuments = useCallback(async (searchTerm?: string) => {
    try {
      const response = await getDocuments(searchTerm);
      if (response.success && response.documents) {
        setDocuments(response.documents);
      }
    } catch (error) {
      toast.error("Failed to fetch documents");
    }
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await getMe();
        if (response.success && response.user) {
          setUser(response.user);
          await fetchDocuments();
        } else {
          router.push("/login");
        }
      } catch (error) {
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [router, fetchDocuments]);

  useEffect(() => {
    if (!user) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchDocuments(search || undefined);
    }, 400);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [search, user, fetchDocuments]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      router.push("/login");
    } catch (error) {
      toast.error("Logout failed");
    }
  };

  const handleCreateDocument = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const response = await createDocument();
      if (response.success && response.document) {
        setDocuments((prev) => [response.document, ...prev]);
        router.push(`/documents/${response.document.id}`);
      } else {
        toast.error("Failed to create document");
      }
    } catch (error) {
      toast.error("Failed to create document");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteDocument = async (
    e: React.MouseEvent,
    docId: string
  ) => {
    e.stopPropagation();

    if (!confirm("Are you sure you want to delete this document?")) return;

    setDeletingId(docId);
    try {
      const response = await deleteDocument(docId);
      if (response.success) {
        setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
        toast.success("Document deleted");
      } else {
        toast.error("Failed to delete document");
      }
    } catch (error) {
      toast.error("Failed to delete document");
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Welcome {user?.name || "User"}
          </h1>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>

        <div className="flex gap-3 mb-6">
          <Button onClick={handleCreateDocument} disabled={isCreating}>
            + New Document
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Documents</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                <Input
                  type="text"
                  placeholder="Search by title..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <p className="text-zinc-600 dark:text-zinc-400">
                {search ? "No documents match your search" : "No Documents Yet"}
              </p>
            ) : (
              <ul className="space-y-2">
                {documents.map((doc) => (
                  <li key={doc.id}>
                    <div
                      onClick={() => router.push(`/documents/${doc.id}`)}
                      className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer group"
                    >
                      <div>
                        <p className="font-medium text-zinc-900 dark:text-zinc-50">
                          {doc.title}
                        </p>
                        <p className="text-sm text-zinc-500">
                          {new Date(doc.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-red-600"
                        onClick={(e) => handleDeleteDocument(e, doc.id)}
                        disabled={deletingId === doc.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
