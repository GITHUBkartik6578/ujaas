'use client';

import { TaxonomyManager } from '@/components/admin/TaxonomyManager';
import { PageTitle } from '@/components/admin/ui';

export default function CategoriesPage() {
  return (
    <>
      <PageTitle>Categories and topics</PageTitle>
      <TaxonomyManager path="categories" heading="Categories" noun="category" />
      <TaxonomyManager path="topics" heading="Topics" noun="topic" />
    </>
  );
}
