import WarehouseReportDetail from "@/components/WarehouseReportDetail";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  const warehouseId = parseInt(id);

  return <WarehouseReportDetail warehouseId={warehouseId} />;
}
