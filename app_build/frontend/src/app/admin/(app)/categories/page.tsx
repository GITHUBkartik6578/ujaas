'use client';

import { TaxonomyManager } from '@/components/admin/TaxonomyManager';
import { PageTitle } from '@/components/admin/ui';

export default function CategoriesPage() {
  return (
    <>
      <PageTitle>श्रेणियाँ</PageTitle>
      <TaxonomyManager path="categories" heading="श्रेणियाँ" noun="श्रेणी" />
    </>
  );
}
