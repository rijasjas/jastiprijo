-- Fix foreign key constraint for order_items to allow CASCADE delete when products are deleted
-- First, drop the existing foreign key constraint
ALTER TABLE public.order_items 
DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;

-- Add the foreign key constraint with CASCADE delete
ALTER TABLE public.order_items 
ADD CONSTRAINT order_items_product_id_fkey 
FOREIGN KEY (product_id) 
REFERENCES public.products(id) 
ON DELETE CASCADE;

