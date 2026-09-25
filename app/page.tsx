"use client";

import { useState } from "react";
import type { SVGProps } from "react";
import Sidebar from "./components/shared/Sidebar";
import PostCard from "./components/shared/PostCard";
import type { PostCardProps } from "./components/shared/PostCard";
import FeedHeader from "./components/home/FeedHeader";
import FeedInput from "./components/home/FeedInput";
import Counter from "./components/home/Counter";
import CreatePostModal from "./components/home/CreatePostModal";

const seedPosts: PostCardProps[] = [
  {
    type: "LOGRO",
    childName: "Mateo",
    time: "14:20",
    author: "vos",
    recipient: "familia de Mateo",
    text: "¡Usó el orinal solito por primera vez! Estaba feliz de contárselo a todos. Un gran paso.",
    likes: 3,
    comments: 1,
  },
  {
    type: "ACTIVIDAD",
    childName: "Mateo",
    time: "09:40",
    author: "vos",
    recipient: "familia de Mateo",
    text: "Pintamos con témperas esta mañana. Mateo eligió el azul para todo y se concentró un montón mezclando colores.",
    likes: 5,
    comments: 2,
    image: { src: "/fotos/temperas.jpg", alt: "Foto · pintando con témperas" },
  },
  {
    type: "ANUNCIO",
    childName: "Anuncio general",
    time: "07:50",
    author: "vos",
    recipient: "toda la sala",
    text: "El viernes salimos al parque por la mañana. Recuerden mandar gorra y una botellita de agua.",
    likes: 8,
    comments: 0,
  },
];

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [posts, setPosts] = useState<PostCardProps[]>(seedPosts);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createOpenCount, setCreateOpenCount] = useState(0);

  function openCreateModal() {
    setIsSidebarOpen(false);
    setCreateOpenCount((current) => current + 1);
    setIsCreateOpen(true);
  }

  function handlePublish(post: PostCardProps) {
    setPosts((current) => [post, ...current]);
    setIsCreateOpen(false);
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
          <Counter />
          <FeedInput onClick={openCreateModal} />

          <div className="mb-[14px] flex items-center gap-[14px]">
            <span className="text-[12.5px] font-extrabold tracking-[.8px] text-[#8A7C6D]">
              PUBLICADO HOY
            </span>
            <span className="h-px flex-1 bg-divider" />
          </div>

          <div className="flex flex-col gap-4">
            {posts.map((post) => (
              <PostCard key={`${post.type}-${post.time}`} {...post} />
            ))}
          </div>
        </div>
      </main>

      <CreatePostModal
        key={createOpenCount}
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onPublish={handlePublish}
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