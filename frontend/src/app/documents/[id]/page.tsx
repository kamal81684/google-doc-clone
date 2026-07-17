"use client";

import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { getDocumentById, Document, updateDocument } from "@/services/document.services";
import DocumentEditor from "@/components/editor/DocumentEditor";

export default function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [document, setDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        const response = await getDocumentById(id);
        if (response.success && response.document) {
          setDocument(response.document);
        } else {
          toast.error("Document not found");
          router.push("/dashboard");
        }
      } catch (error) {
        toast.error("Failed to load document");
        router.push("/dashboard");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocument();
  }, [id, router]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleChange = (content: any) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await updateDocument(id, { content });
      } catch (error) {
        toast.error("Failed to save document");
      }
    }, 1000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  if (!document) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-zinc-900 mb-4">
          {document.title}
        </h1>
        <div className="text-sm text-zinc-500 mb-8">
          Document ID: {document.id}
        </div>
        <div className="prose prose-zinc max-w-none">
          <DocumentEditor
            initialContent={document.content}
            onChange={handleChange}
          />
        </div>
      </div>
    </div>
  );
}
