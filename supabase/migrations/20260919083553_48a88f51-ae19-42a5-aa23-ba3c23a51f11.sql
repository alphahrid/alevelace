DROP POLICY IF EXISTS "Published posts are public" ON public.blog_posts;

CREATE POLICY "Anyone can read published posts" ON public.blog_posts
  FOR SELECT TO anon, authenticated USING (published = true);

CREATE POLICY "Admins can read drafts" ON public.blog_posts
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));