import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/permissions";
import { listCategories } from "@/server/services/course.service";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { DataTable } from "@/components/dashboard";
import { CategoryForm, DeleteCategoryButton } from "@/components/admin/course-forms";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  await requirePermission("course:write");
  const categories = await listCategories();
  return (
    <>
      <PageHeader title="Categories" description="Organise the catalogue and drive recommendations." />
      <Card>
        <CardHeader title="Add a category" />
        <div className="p-5"><CategoryForm /></div>
        <DataTable
          data={categories}
          rowKey={(c) => c.id}
          empty="No categories"
          columns={[
            { header: "Name", cell: (c) => <span className="font-medium">{c.name}</span> },
            { header: "Courses", cell: (c) => c._count.courses, className: "text-right" },
            { header: "", className: "text-right", cell: (c) => <DeleteCategoryButton id={c.id} name={c.name} /> },
          ]}
        />
      </Card>
    </>
  );
}
