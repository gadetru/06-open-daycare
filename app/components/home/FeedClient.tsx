"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SVGProps } from "react";
import Sidebar from "../shared/Sidebar";
import PostCard from "../shared/PostCard";
import FeedHeader from "./FeedHeader";
import FeedInput from "./FeedInput";
import CreatePostModal from "./CreatePostModal";
import type { PostChildOption } from "./CreatePostModal";
import { createPost, type CreatePostInput } from "@/app/actions/posts";
import type { PostDayGroup } from "@/app/lib/posts-utils";

type FeedClientProps = {
  roomName: string | null;
  kids: PostChildOption[];
  dayGroups: PostDayGroup[];
  notice: string | null;
};

export default function FeedClient({
  roomName,
  kids,
  dayGroups,
  notice,
}: FeedClientProps) {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createOpenCount, setCreateOpenCount] = useState(0);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  function openCreateModal() {
    setIsSidebarOpen(false);
    setCreateOpenCount((current) => current + 1);
    setPublishError(null);
    setIsCreateOpen(true);
  }

  function closeCreateModal() {
    setIsCreateOpen(false);
  }

  async function handlePublish(fields: CreatePostInput) {
    setIsPublishing(true);
    setPublishError(null);

    try {
      const result = await createPost(fields);

      if (result.ok) {
        setIsCreateOpen(false);
        router.refresh();
      } else {
        setPublishError(result.error);
      }
    } catch {
      setPublishError("No se pudo publicar");
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <div className="flex min-h-full bg-background">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onNewPost={openCreateModal}
      />

      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-ink lg:hidden"
          aria-label="Abrir menú"
        >
          <MenuIcon />
        </button>
      )}

      <main className="h-screen min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[760px] px-6 pb-20 pt-[34px] sm:px-10">
          <FeedHeader />
          <FeedInput onClick={openCreateModal} />

          {notice && (
            <p
              role="alert"
              className="mb-[18px] rounded-[14px] border border-error-border bg-surface px-4 py-3 text-[13.5px] font-semibold text-error-text"
            >
              {notice}
            </p>
          )}

          {dayGroups.map((dayGroup) => (
            <section key={dayGroup.dayKey} className="mb-[22px]">
              <div className="mb-[14px] flex items-center gap-[14px]">
                <span className="text-[12.5px] font-extrabold tracking-[.8px] text-[#8A7C6D]">
                  {dayGroup.label.toUpperCase()}
                </span>
                <span className="h-px flex-1 bg-divider" />
              </div>

              <div className="flex flex-col gap-4">
                {dayGroup.posts.map((post) => (
                  <PostCard key={post.id} {...post} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>

      <CreatePostModal
        key={createOpenCount}
        isOpen={isCreateOpen}
        roomName={roomName}
        kids={kids}
        onClose={closeCreateModal}
        onPublish={handlePublish}
        isPublishing={isPublishing}
        publishError={publishError}
      />
    </div>
  );
}

function MenuIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}
