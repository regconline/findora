import { ActionForm, SelectField, SubmitButton, TextField, TextareaField } from "@/components/form";
import { ImageUpload } from "@/components/image-upload";
import { Card, CardHeader } from "@/components/ui";
import { uploadSiteImageAction } from "@/app/admin/actions";
import type { ActionState, BlogPost } from "@/lib/types";

type Action = (s: ActionState, fd: FormData) => Promise<ActionState>;

/** Renders a timestamp for <input type="datetime-local"> in South African time (UTC+2, no DST). */
const toLocal = (iso: string | null | undefined) => (iso ? new Date(new Date(iso).getTime() + 2 * 3600_000).toISOString().slice(0, 16) : "");

export function PostEditor({ action, post, categories }: { action: Action; post?: BlogPost | null; categories: { id: string; name: string }[] }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <Card className="p-5 sm:p-6">
        <ActionForm action={action} className="space-y-5">
          <TextField name="title" label="Title" defaultValue={post?.title} required maxLength={160} />
          <TextField name="slug" label="URL slug" defaultValue={post?.slug} required hint="Lowercase words separated by hyphens, e.g. how-to-choose-a-plumber" />
          <TextareaField name="excerpt" label="Excerpt" rows={2} defaultValue={post?.excerpt} required maxLength={320} hint="Shown on article cards and as the default meta description." />
          <TextareaField name="content" label="Content (Markdown)" rows={24} defaultValue={post?.content} required className="[&_textarea]:font-mono [&_textarea]:text-sm" hint="Use ## for section headings, - for lists, **bold**, [links](/businesses). HTML is not rendered." />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField name="category_id" label="Category" optional defaultValue={post?.category_id} placeholder="Uncategorised" options={categories.map((c) => ({ value: c.id, label: c.name }))} />
            <TextField name="author_name" label="Author" defaultValue={post?.author_name ?? "Findora Editorial Team"} />
            <TextField name="cover_image_url" label="Featured image URL" optional defaultValue={post?.cover_image_url} hint="Upload in the panel on the right, then paste the URL." />
            <TextField name="cover_image_alt" label="Featured image alt text" optional defaultValue={post?.cover_image_alt} />
            <TextField name="seo_title" label="SEO title" optional defaultValue={post?.seo_title} maxLength={70} />
            <TextField name="seo_description" label="SEO description" optional defaultValue={post?.seo_description} maxLength={170} />
            <SelectField name="status" label="Status" defaultValue={post?.status ?? "draft"} options={[
              { value: "draft", label: "Draft" }, { value: "published", label: "Published" }, { value: "scheduled", label: "Scheduled" }, { value: "archived", label: "Archived" },
            ]} />
            <TextField name="published_at" label="Publication date & time" optional type="datetime-local" defaultValue={toLocal(post?.published_at)} hint="South African time (SAST). Required for scheduling; leave blank to publish now." />
          </div>
          <SubmitButton size="lg" pendingText="Saving…">Save article</SubmitButton>
        </ActionForm>
      </Card>
      <div className="space-y-6">
        <Card>
          <CardHeader title="Images" description="Uploaded images are resized and converted to WebP." />
          <div className="p-5"><ImageUpload action={uploadSiteImageAction} label="Upload an image" aspect="wide" /></div>
        </Card>
      </div>
    </div>
  );
}
