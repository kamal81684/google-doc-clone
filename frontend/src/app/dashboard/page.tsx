"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMe, logout, User } from "@/services/auth.service";
import { createDocument, getDocuments, Document } from "@/services/document.services";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await getMe();
        if (response.success && response.user) {
          setUser(response.user);
          const docsResponse = await getDocuments();
          if (docsResponse.success && docsResponse.documents) {
            setDocuments(docsResponse.documents);
          }
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
  }, [router]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      router.push("/login");
    } catch (error) {
      toast.error("Logout failed");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

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

        <div className="mb-6">
          <Button onClick={handleCreateDocument} disabled={isCreating}>
            + New Document
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Documents</CardTitle>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <p className="text-zinc-600 dark:text-zinc-400">No Documents Yet</p>
            ) : (
              <ul className="space-y-2">
                {documents.map((doc) => (
                  <li key={doc.id}>
                    <button
                      onClick={() => router.push(`/documents/${doc.id}`)}
                      className="w-full text-left p-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <p className="font-medium text-zinc-900 dark:text-zinc-50">{doc.title}</p>
                      <p className="text-sm text-zinc-500">{new Date(doc.updatedAt).toLocaleDateString()}</p>
                    </button>
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
