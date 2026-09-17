import Link from "next/link";
import type { SVGProps } from "react";
import PhotoPlaceholder from "./PhotoPlaceholder";

type PostType = "LOGRO" | "ACTIVIDAD" | "ANUNCIO";

type PostImage = {
  src: string;
  alt: string;
};

type PostCardProps = {
  type: PostType;
  childName: string;
  time: string;
  author: string;
  text: string;
  recipient: string;
  likes: number;
  comments: number;
  image?: PostImage;
};

const badgeStyles: Record<PostType, { container: string; dot: string; label: string }> = {
  LOGRO: { container: "bg-success-bg", dot: "bg-success", label: "text-success" },
  ACTIVIDAD: { container: "bg-info-bg", dot: "bg-info", label: "text-info" },
  ANUNCIO: { container: "bg-announce-bg", dot: "bg-announce", label: "text-announce" },
};

export default function PostCard({
  type,
  childName,
  time,
  author,
  text,
  recipient,
  likes,
  comments,
  image,
}: PostCardProps) {
  const isAnnouncement = type === "ANUNCIO";
  const badge = badgeStyles[type];

  return (
    <article className="rounded-[20px] border border-border bg-surface px-[22px] py-5 shadow-[0_4px_16px_-12px_rgba(120,90,60,.5)]">
      <div className="mb-[14px] flex items-center gap-3 pb-4">
        <div
          className={`flex h-11 w-11 flex-none items-center justify-center rounded-full font-heading text-[17px] font-semibold ${
            isAnnouncement ? "bg-announce-bg text-announce" : "bg-avatar-sky-bg text-avatar-sky-ink"
          }`}
        >
          {isAnnouncement ? <MegaphoneIcon /> : childName.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-heading text-[16.5px] font-semibold text-ink">
            {childName}
          </div>
          <div className="text-[12.5px] text-ink-soft">
            {time} · publicado por {author}
          </div>
        </div>
        <div className={`flex flex-none items-center gap-[7px] rounded-full px-3 py-1.5 ${badge.container}`}>
          <span className={`h-2 w-2 rounded-full ${badge.dot}`} />
          <span className={`text-xs font-extrabold tracking-[.5px] ${badge.label}`}>{type}</span>
        </div>
      </div>

      <div className="mb-2.5 text-[12.5px] text-ink-soft">Para: {recipient}</div>
      <p className="text-[15.5px] leading-relaxed text-ink-post">{text}</p>

      {image && <PhotoPlaceholder src={image.src} alt={image.alt} />}

      <div className="mt-4 flex items-center gap-[18px] border-t border-border-soft pt-[14px]">
        <span className="flex items-center gap-[7px] text-[14px] font-bold text-coral">
          <HeartIcon />
          {likes}
        </span>
        <Link
          href="/detalle-publicacion"
          className="flex items-center gap-[7px] text-[14px] font-bold text-ink-muted"
        >
          <CommentIcon />
          {comments}
        </Link>
        <span className="flex-1" />
        <Link href="/crear-publicacion" className="text-[14px] font-extrabold text-coral-deep">
          Editar
        </Link>
      </div>
    </article>
  );
}

function HeartIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="#E0654A"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  );
}

function CommentIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" />
    </svg>
  );
}

function MegaphoneIcon(props: SVGProps<SVGSVGElement>) {
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
      <path d="m3 11 18-5v12L3 14v-3zM11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </svg>
  );
}