CREATE POLICY "users can create own rsvps"
ON public.rsvps
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);