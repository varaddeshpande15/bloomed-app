"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UseMutateFunction } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import { useAuth } from "@clerk/nextjs";
import { Bookmark } from "lucide-react";
import { useUIStore } from "@/lib/stores";
import GenerateButton from "@/components/flow-components/generate-button";
import ModelSelect from "@/components/flow-components/model-select";
import type { Node } from "@/lib/shared/types/common";

interface Props {
  title?: string;
  isPending: boolean;
  renderFlow: string;
  mutate: UseMutateFunction<any, AxiosError<unknown, any>, any, unknown>;
  /** Latest generated tree from `/api/v1/roadmap`; used by Save. */
  treeToSave?: Node[] | null;
}

export const GeneratorControls = (props: Props) => {
  const {
    title,
    mutate,
    isPending,
    renderFlow,
    treeToSave,
  } = props;
  const { isSignedIn, getToken } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  );

  const { model, query, setModelApiKey, setQuery, modelApiKey } = useUIStore(
    useShallow((state) => ({
      model: state.model,
      query: state.query,
      modelApiKey: state.modelApiKey,
      setModelApiKey: state.setModelApiKey,
      setQuery: state.setQuery,
    })),
  );

  useEffect(() => {
    const storedKey = localStorage.getItem(`${model.toUpperCase()}_API_KEY`);
    if (storedKey != null && storedKey !== "") {
      setModelApiKey(storedKey);
    }
  }, [model, setModelApiKey]);

  useEffect(() => {
    if (isPending) {
      setSaveStatus("idle");
    }
  }, [isPending]);

  useEffect(() => {
    setSaveStatus("idle");
  }, [treeToSave]);

  const onSaveRoadmap = async () => {
    if (!treeToSave?.length) {
      toast.error("Nothing to save", {
        description: "Generate a roadmap first.",
      });
      return;
    }
    if (!query?.trim()) {
      toast.error("Missing title", {
        description: "Enter a topic in the search box.",
      });
      return;
    }
    if (!isSignedIn) {
      toast.error("Sign in required", {
        description: "Sign in to save roadmaps to your account.",
      });
      return;
    }

    setSaveStatus("saving");
    try {
      const token = await getToken();
      const res = await fetch("/api/v1/roadmap/save", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ title: query.trim(), tree: treeToSave }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok) {
        toast.error("Could not save", {
          description: payload.error ?? res.statusText,
        });
        setSaveStatus("idle");
        return;
      }
      toast.success("Roadmap saved", {
        description: "You can find it in your saved list.",
      });
      setSaveStatus("saved");
    } catch {
      toast.error("Could not save");
      setSaveStatus("idle");
    }
  };

  const onSubmit = async (
    e:
      | React.MouseEvent<HTMLButtonElement, MouseEvent>
      | React.FormEvent<HTMLFormElement>
      | React.KeyboardEvent<HTMLInputElement>,
  ) => {
    e.preventDefault();
    try {
      setIsGenerating(true);
      if (!query) {
        return toast.error("Please enter a query", {
          description: "We need a query to generate a roadmap.",
          duration: 4000,
        });
      }

      toast.info("Generating roadmap", {
        description: "We are generating a roadmap for you.",
        duration: 4000,
      });

      mutate(
        {
          body: { query },
        },
        {
          onSuccess: () => {
            toast.success("Success", {
              description: "Roadmap generated successfully.",
              duration: 4000,
            });
          },
          onError: (error: any) => {
            const data = error.response?.data;
            const description =
              data?.detail ||
              data?.message ||
              "Unknown error occurred";
            toast.error("Something went wrong", {
              description,
              duration: 8000,
            });
          },
        },
      );
    } catch (e: any) {
      console.error("api error", e);
    } finally {
      setIsGenerating(false);
    }
  };

  const disableUI = isGenerating || isPending;
  const canSave =
    Boolean(treeToSave?.length) &&
    Boolean(query?.trim()) &&
    isSignedIn &&
    saveStatus !== "saving";

  return (
    <div className="container flex flex-col items-start justify-between gap-3 py-4 sm:flex-row sm:items-center md:h-auto md:min-h-16">
      <div className="flex w-full flex-col gap-2 sm:mx-6 md:mx-14 md:flex-row md:flex-wrap md:items-center md:justify-end">
        <Input
          className="min-w-0 flex-1 md:max-w-md"
          type="text"
          disabled={disableUI}
          placeholder="e.g. Try searching for Frontend or Backend"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onSubmit(e);
            }
          }}
        />

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <ModelSelect disabled={disableUI} />
          <GenerateButton onClick={onSubmit} disabled={disableUI} />
          <Button
            type="button"
            variant="secondary"
            size="default"
            className="shrink-0 gap-1.5"
            disabled={!canSave || saveStatus === "saved"}
            onClick={onSaveRoadmap}
            aria-busy={saveStatus === "saving"}
          >
            <Bookmark
              className="size-4"
              aria-hidden
            />
            {saveStatus === "saved"
              ? "Saved"
              : saveStatus === "saving"
                ? "Saving…"
                : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
};
