import { Container, Breadcrumbs } from "@/components/ui";
import { Markdown } from "@/components/markdown";
import { formatDate } from "@/lib/utils";
import type { SitePage } from "@/lib/types";

export function CmsPage({ page, children, aside, showUpdated }: { page: SitePage; children?: React.ReactNode; aside?: React.ReactNode; showUpdated?: boolean }) {
  return (
    <Container className="py-10">
      <Breadcrumbs items={[{ label: page.title }]} />
      <div className={aside ? "mt-6 grid gap-10 lg:grid-cols-[1fr_340px]" : "mt-6"}>
        <article className="max-w-3xl">
          <h1 className="text-3xl font-bold sm:text-4xl">{page.title}</h1>
          {page.summary ? <p className="mt-3 text-lg text-muted">{page.summary}</p> : null}
          {showUpdated ? <p className="mt-3 text-sm text-muted">Last updated: {formatDate(page.updated_at)}</p> : null}
          <div className="mt-8"><Markdown>{page.content}</Markdown></div>
          {children}
        </article>
        {aside ? <aside className="lg:pt-14">{aside}</aside> : null}
      </div>
    </Container>
  );
}
