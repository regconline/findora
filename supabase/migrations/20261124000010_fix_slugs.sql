-- Cleaner, SEO-friendly subcategory slugs (old URLs 301-redirect in next.config.ts)
update public.subcategories set slug = 'bed-and-breakfasts', name = 'Bed and Breakfasts' where slug = 'bandbs';
update public.subcategories set slug = 'decor-and-hire' where slug = 'd-cor-and-hire';
