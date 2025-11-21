export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm">Tổng đơn hàng</h3>
          <p className="text-3xl font-bold mt-2">0</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm">Doanh thu</h3>
          <p className="text-3xl font-bold mt-2">0đ</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm">Khách hàng</h3>
          <p className="text-3xl font-bold mt-2">0</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm">Sản phẩm</h3>
          <p className="text-3xl font-bold mt-2">0</p>
        </div>
      </div>
    </div>
  );
}
