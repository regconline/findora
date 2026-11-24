#!/usr/bin/env python3
"""Builds supabase/migrations/*_seed_content.sql from /content (articles, pages) plus FAQs and settings.

Run: python3 scripts/gen_content.py
Content is inserted with ON CONFLICT DO NOTHING so admins' later edits are never overwritten.
"""
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "supabase/migrations/20261124000009_content_v2.sql"  # 07 is the original seed already applied

BLOG_CATEGORIES = [
    ("finding-services", "Finding Services", "How to find, compare and hire reliable businesses and professionals.", 10),
    ("business-growth", "Business Growth", "Marketing, visibility, communication and trust for small businesses.", 20),
    ("starting-a-business", "Starting a Business", "Practical guidance for new South African entrepreneurs.", 30),
    ("business-technology", "Business Technology", "Affordable tools and digital skills for small businesses.", 40),
    ("local-economy", "Local Economy", "Local business discovery and economic development in South Africa.", 50),
]

FAQS = [
    ("general", True, "What is Findora?", "Findora is a South African business discovery platform. Customers can search for businesses and services, compare profiles and contact businesses directly. Businesses can create a free listing to be found by new customers."),
    ("general", True, "Is Findora free?", "Yes. Searching and contacting businesses is free for customers, and business listings are free. In future we may offer optional premium features for businesses, which will always be clearly explained before any charge."),
    ("general", False, "Does Findora check the businesses listed?", "Every listing is reviewed by our team before it is published, and anyone can report a listing. A **verification badge** is only shown when we have completed an additional verification process. A listing on Findora is not an endorsement — always confirm qualifications, prices and terms directly with the business."),
    ("general", False, "Does Findora publish reviews or ratings?", "Not at this stage. We will never publish fake reviews or ratings. If we introduce reviews in future, they will come from genuine customers and be clearly moderated."),
    ("customers", True, "Do I need an account to contact a business?", "No. You can call, WhatsApp or send an enquiry without an account. A free account lets you save businesses and see your enquiry history."),
    ("customers", False, "What happens after I send an enquiry?", "The business receives your enquiry by email and in its dashboard, and replies to you directly using the contact details you provided. You'll also receive a confirmation email from Findora."),
    ("customers", False, "Who can see my contact details when I send an enquiry?", "Only the business you contacted. Findora administrators can see limited information about enquiries where it's needed to prevent abuse. We never publish your contact details or sell your information."),
    ("customers", False, "How do I report a suspicious business?", "Open the business profile and choose **Report this listing**, or use our [report page](/report). Our moderation team reviews every report."),
    ("businesses", True, "How do I list my business?", "[Register your business](/register/business), verify your email and follow the step-by-step setup: business details, location, contact details and hours, photos and services. Then submit your listing for review."),
    ("businesses", True, "How long does approval take?", "Most listings are reviewed within two working days. We'll email you as soon as your listing is approved, or explain what needs to change if it can't be approved yet."),
    ("businesses", False, "Can I manage more than one business?", "Yes. One account can manage several businesses. Go to **Dashboard → My Businesses → Add a business**."),
    ("businesses", False, "Do I have to show my prices?", "No. Each service can be marked as fixed price, starting from, hourly, quotation required or free. Showing 'starting from' prices helps customers decide to contact you, but it's your choice."),
    ("businesses", False, "Can I hide my home address?", "Yes. Untick **Show my street address publicly** in the location step. You'll still appear in searches for your town and service areas."),
    ("businesses", False, "Where do the statistics in my dashboard come from?", "From real visitor activity on your profile: profile views, service views, phone, WhatsApp, email, website and directions clicks, and enquiries. Views are counted once per visitor per day and known bots are excluded."),
    ("businesses", False, "How do I remove my listing?", "Open your listing in the dashboard and choose **Unpublish listing** to hide it temporarily, or **Delete listing** to remove it."),
]

SETTINGS = {
    "site_name": "Findora",
    "contact_email": "hello@findora.co.za",
    "privacy_email": "privacy@findora.co.za",
    "contact_phone": "",
    "physical_address": "",
    "social": {},
    "registration_open": True,
    "business_registration_open": True,
    "seo_default_title": "Findora — Discover Businesses. Connect with Confidence.",
    "seo_default_description": "Search South African businesses, explore services and contact trusted providers directly. Free listings for businesses.",
    "ads_enabled": False,
    "announcement": "",
}


def q(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"


def dq(s: str) -> str:
    tag = "$md$"
    assert tag not in s
    return f"{tag}{s}{tag}"


def parse(path: pathlib.Path):
    raw = path.read_text(encoding="utf-8")
    m = re.match(r"^---\n(.*?)\n---\n(.*)$", raw, re.S)
    assert m, path
    meta = {}
    for line in m.group(1).splitlines():
        k, v = line.split(":", 1)
        meta[k.strip()] = v.strip().strip('"')
    return meta, m.group(2).strip() + "\n"


def main():
    out = ["-- Seed: editorial content, site pages, FAQs and platform settings (generated by scripts/gen_content.py)"]
    for slug, name, desc, order in BLOG_CATEGORIES:
        out.append(f"insert into public.blog_categories (slug, name, description, sort_order) values ({q(slug)}, {q(name)}, {q(desc)}, {order}) on conflict (slug) do nothing;")

    articles = sorted((ROOT / "content/articles").glob("*.md"))
    for i, path in enumerate(articles):
        meta, body = parse(path)
        words = len(body.split())
        days_ago = (len(articles) - i) * 3
        out.append(
            "insert into public.blog_posts (slug, title, excerpt, content, category_id, author_name, status, published_at, seo_title, seo_description, reading_minutes, cover_image_url, cover_image_alt) "
            f"select {q(meta['slug'])}, {q(meta['title'])}, {q(meta['excerpt'])}, {dq(body)}, c.id, 'Findora Editorial Team', 'published', now() - interval '{days_ago} days', "
            f"{q(meta['title'][:70])}, {q(meta['excerpt'][:170])}, {max(1, round(words / 220))}, {q('/blog/covers/' + meta['slug'] + '.webp')}, {q('Illustration for the article: ' + meta['title'])} "
            f"from public.blog_categories c where c.slug = {q(meta['category'])} on conflict (slug) do nothing;"
        )
        # Attach covers to articles seeded earlier (never overwrite an admin-chosen image)
        out.append(
            f"update public.blog_posts set cover_image_url = {q('/blog/covers/' + meta['slug'] + '.webp')}, "
            f"cover_image_alt = {q('Illustration for the article: ' + meta['title'])} "
            f"where slug = {q(meta['slug'])} and cover_image_url is null;"
        )

    for path in sorted((ROOT / "content/pages").glob("*.md")):
        meta, body = parse(path)
        out.append(
            "insert into public.site_pages (slug, title, summary, content, seo_title, seo_description, is_published, show_in_footer) values "
            f"({q(meta['slug'])}, {q(meta['title'])}, {q(meta.get('summary', ''))}, {dq(body)}, {q(meta['title'][:70])}, {q(meta.get('summary', '')[:170])}, true, {str(meta.get('footer') == 'true').lower()}) "
            "on conflict (slug) do nothing;"
        )

    for i, (aud, home, question, answer) in enumerate(FAQS):
        out.append(
            f"insert into public.faqs (question, answer, audience, sort_order, is_published, show_on_home) "
            f"select {q(question)}, {q(answer)}, {q(aud)}, {(i + 1) * 10}, true, {str(home).lower()} "
            f"where not exists (select 1 from public.faqs where question = {q(question)});"
        )

    for k, v in SETTINGS.items():
        out.append(f"insert into public.platform_settings (key, value) values ({q(k)}, {q(json.dumps(v, ensure_ascii=False))}::jsonb) on conflict (key) do nothing;")

    OUT.write_text("\n".join(out) + "\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}: {len(articles)} articles, {len(list((ROOT / 'content/pages').glob('*.md')))} pages, {len(FAQS)} FAQs")


if __name__ == "__main__":
    main()
