import Link from "next/link";
import Image from "next/image";
import { formatDate, isOptimizableImage } from "@/lib/utils";
import type { BlogPost } from "@/lib/types";

export function PostCard({ post }: { post: BlogPost }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-card border border-line bg-white">
      {post.cover_image_url ? (
        <div className="relative aspect-[16/9] bg-canvas">
          <Image src={post.cover_image_url} alt={post.cover_image_alt || ""} fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover" unoptimized={!isOptimizableImage(post.cover_image_url)} />
        </div>
      ) : (
        <div aria-hidden className="flex aspect-[16/9] items-end bg-navy-900 p-5">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-500">{post.blog_categories?.name ?? "Findora guides"}</span>
        </div>
      )}
      <div className="flex flex-1 flex-col p-5">
        {post.blog_categories ? <p className="text-xs font-semibold text-emerald-700">{post.blog_categories.name}</p> : null}
        <h3 className="mt-1 text-lg font-semibold leading-snug">
          <Link href={`/blog/${post.slug}`} className="after:absolute after:inset-0 group-hover:text-emerald-700">{post.title}</Link>
        </h3>
        <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-muted">{post.excerpt}</p>
        <p className="mt-4 text-xs text-muted">
          {formatDate(post.published_at)} · {post.reading_minutes} min read
        </p>
      </div>
    </article>
  );
}
