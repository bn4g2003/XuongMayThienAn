'use client';

import { useEffect, useState } from 'react';

interface Warehouse {
  id: number;
  warehouseCode: string;
  warehouseName: string;
  branchId: number;
  branchName: string;
  address?: string;
  warehouseType: 'NVL' | 'THANH_PHAM';
  isActive: boolean;
}

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    warehouseCode: '',
    warehouseName: '',
    branchId: '',
    address: '',
    warehouseType: 'THANH_PHAM' as 'NVL' | 'THANH_PHAM',
  });

  useEffect(() => {
    fetchWarehouses();
    fetchBranches();
  }, []);

  const fetchWarehouses = async () => {
    try {
      const res = await fetch('/api/admin/warehouses');
      const data = await res.json();
      if (data.success) {
        setWarehouses(data.data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    const res = await fetch('/api/admin/branches');
    const data = await res.json();
    if (data.success) setBranches(data.data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const res = await fetch('/api/admin/warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      
      if (data.success) {
        alert('Tạo kho thành công');
        setShowModal(false);
        fetchWarehouses();
        setFormData({
          warehouseCode: '',
          warehouseName: '',
          branchId: '',
          address: '',
          warehouseType: 'THANH_PHAM',
        });
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('Lỗi khi tạo kho');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa kho này?')) return;

    try {
      const res = await fetch(`/api/admin/warehouses/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      
      if (data.success) {
        alert('Xóa thành công');
        fetchWarehouses();
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('Lỗi khi xóa');
    }
  };

  if (loading) return <div>Đang tải...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Quản lý kho hàng</h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + Thêm kho
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã kho</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên kho</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loại kho</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chi nhánh</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Địa chỉ</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {warehouses.map((wh) => (
              <tr key={wh.id}>
                <td className="px-6 py-4 text-sm">{wh.warehouseCode}</td>
                <td className="px-6 py-4 text-sm font-medium">{wh.warehouseName}</td>
                <td className="px-6 py-4 text-sm">
                  <span className={`px-2 py-1 rounded text-xs ${wh.warehouseType === 'NVL' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                    {wh.warehouseType === 'NVL' ? '📦 Nguyên vật liệu' : '✨ Thành phẩm'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">{wh.branchName}</td>
                <td className="px-6 py-4 text-sm">{wh.address || '-'}</td>
                <td className="px-6 py-4 text-sm">
                  <span className={`px-2 py-1 rounded text-xs ${wh.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {wh.isActive ? 'Hoạt động' : 'Khóa'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">
                  <button
                    onClick={() => handleDelete(wh.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-500/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Thêm kho mới</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Mã kho *</label>
                <input
                  type="text"
                  value={formData.warehouseCode}
                  onChange={(e) => setFormData({...formData, warehouseCode: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tên kho *</label>
                <input
                  type="text"
                  value={formData.warehouseName}
                  onChange={(e) => setFormData({...formData, warehouseName: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Loại kho *</label>
                <select
                  value={formData.warehouseType}
                  onChange={(e) => setFormData({...formData, warehouseType: e.target.value as 'NVL' | 'THANH_PHAM'})}
                  className="w-full px-3 py-2 border rounded"
                  required
                >
                  <option value="THANH_PHAM">✨ Kho thành phẩm</option>
                  <option value="NVL">📦 Kho nguyên vật liệu</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Kho NVL: Lưu nguyên vật liệu (vải, chỉ, cúc...)<br/>
                  Kho thành phẩm: Lưu sản phẩm đã may xong
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Chi nhánh *</label>
                <select
                  value={formData.branchId}
                  onChange={(e) => setFormData({...formData, branchId: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                  required
                >
                  <option value="">Chọn chi nhánh</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>{branch.branchName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Địa chỉ</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Tạo
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
