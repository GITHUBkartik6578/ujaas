'use client';

import { TaxonomyManager } from '@/components/admin/TaxonomyManager';
import { PageTitle } from '@/components/admin/ui';

export default function CategoriesPage() {
  return (
    <>
      <PageTitle>Categories</PageTitle>
      <TaxonomyManager path="categories" heading="Categories" noun="category" />
    </>
  );
}
