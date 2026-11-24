import type { Metadata } from "next";
import { getBlogCategories, getBlogPosts } from "@/lib/data";
import { BlogIndex } from "@/components/blog-index";

export const revalidate = 300;

type Props = { searchParams: Promise<{ page?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { page } = await searchParams;
  return {
    title: "Findora Blog — guides for customers and small businesses",
    description: "Practical, original guides on finding reliable service providers, growing a small business and building trust with customers in South Africa.",
    alternates: { canonical: "/blog" },
    robots: page && page !== "1" ? { index: false, follow: true } : undefined,
  };
}

export default async function BlogPage({ searchParams }: Props) {
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const [{ posts, total }, cats] = await Promise.all([getBlogPosts({ page, pageSize: 9 }), getBlogCategories()]);
  return <BlogIndex title="The Findora Blog" description="Practical guides for customers choosing service providers and for South African small businesses that want to grow." posts={posts} total={total} page={page} cats={cats} base="/blog" />;
}

