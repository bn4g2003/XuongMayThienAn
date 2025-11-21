'use client';

import { useEffect, useState } from 'react';
import { usePermissions } from '@/hooks/usePermissions';

interface Material {
  id: number;
  materialCode: string;
  materialName: string;
  unit: string;
  description?: string;
  branchName: string;
}

export default function MaterialsPage() {
  const { can, loading: permLoading } = usePermissions();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [formData, setFormData] = useState({
    materialCode: '',
    materialName: '',
    unit: '',
    description: '',
  });

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      const res = await fetch('/api/products/materials');
      const data = await res.json();
      if (data.success) {
        setMaterials(data.data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingMaterial(null);
    setFormData({
      materialCode: '',
      materialName: '',
      unit: '',
      description: '',
    });
    setShowModal(true);
  };

  const handleEdit = (material: Material) => {
    setEditingMaterial(material);
    setFormData({
      materialCode: material.materialCode,
      materialName: material.materialName,
      unit: material.unit,
      description: material.description || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingMaterial 
        ? `/api/products/materials/${editingMaterial.id}`
        : '/api/products/materials';
      
      const method = editingMaterial ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      
      if (data.success) {
        alert(editingMaterial ? 'Cập nhật thành công' : 'Tạo NVL thành công');
        setShowModal(false);
        setSelectedMaterial(null);
        fetchMaterials();
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('Lỗi khi lưu NVL');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa NVL này?')) return;

    try {
      const res = await fetch(`/api/products/materials/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      
      if (data.success) {
        alert('Xóa thành công');
        setSelectedMaterial(null);
        fetchMaterials();
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('Lỗi khi xóa');
    }
  };

  if (loading || permLoading) return <div>Đang tải...</div>;

  // Kiểm tra quyền xem
  if (!can('products.materials', 'view')) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold text-gray-700 mb-2">Không có quyền truy cập</h2>
        <p className="text-gray-500">Bạn không có quyền xem nguyên vật liệu</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-120px)]">
      {/* Main Content */}
      <div className={`flex-1 transition-all ${selectedMaterial ? 'mr-96' : ''}`}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Nguyên vật liệu</h1>
        {can('products.materials', 'create') && (
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + Thêm NVL
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên NVL</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Đơn vị</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mô tả</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chi nhánh</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {materials.map((mat) => (
              <tr 
                key={mat.id}
                className={`hover:bg-blue-50 cursor-pointer transition-colors ${selectedMaterial?.id === mat.id ? 'bg-blue-100' : ''}`}
                onClick={() => setSelectedMaterial(mat)}
              >
                <td className="px-6 py-4 text-sm">{mat.materialCode}</td>
                <td className="px-6 py-4 text-sm font-medium">{mat.materialName}</td>
                <td className="px-6 py-4 text-sm">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                    {mat.unit}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">{mat.description || '-'}</td>
                <td className="px-6 py-4 text-sm">{mat.branchName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>

      {/* Detail Panel */}
      {selectedMaterial && (
        <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl border-l border-gray-200 overflow-y-auto z-40">
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-xl font-bold">Chi tiết NVL</h2>
              <button
                onClick={() => setSelectedMaterial(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 uppercase">Mã NVL</label>
                <p className="text-sm font-medium mt-1">{selectedMaterial.materialCode}</p>
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase">Tên nguyên vật liệu</label>
                <p className="text-sm font-medium mt-1">{selectedMaterial.materialName}</p>
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase">Đơn vị</label>
                <p className="text-sm mt-1">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded font-medium">
                    {selectedMaterial.unit}
                  </span>
                </p>
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase">Mô tả</label>
                <p className="text-sm mt-1">{selectedMaterial.description || '-'}</p>
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase">Chi nhánh</label>
                <p className="text-sm mt-1">{selectedMaterial.branchName}</p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t space-y-3">
              {can('products.materials', 'edit') && (
                <button
                  onClick={() => handleEdit(selectedMaterial)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Chỉnh sửa
                </button>
              )}
              {can('products.materials', 'delete') && (
                <button
                  onClick={() => handleDelete(selectedMaterial.id)}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Xóa NVL
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-gray-500/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold mb-4">
              {editingMaterial ? 'Chỉnh sửa nguyên vật liệu' : 'Thêm nguyên vật liệu'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Mã NVL *</label>
                <input
                  type="text"
                  value={formData.materialCode}
                  onChange={(e) => setFormData({...formData, materialCode: e.target.value})}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={!!editingMaterial}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tên NVL *</label>
                <input
                  type="text"
                  value={formData.materialName}
                  onChange={(e) => setFormData({...formData, materialName: e.target.value})}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Đơn vị *</label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({...formData, unit: e.target.value})}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">-- Chọn đơn vị --</option>
                  <optgroup label="Độ dài">
                    <option value="mét">mét (m)</option>
                    <option value="cm">centimet (cm)</option>
                    <option value="mm">milimét (mm)</option>
                  </optgroup>
                  <optgroup label="Khối lượng">
                    <option value="kg">kilogram (kg)</option>
                    <option value="gram">gram (g)</option>
                    <option value="tấn">tấn</option>
                  </optgroup>
                  <optgroup label="Thể tích">
                    <option value="lít">lít (l)</option>
                    <option value="ml">mililít (ml)</option>
                  </optgroup>
                  <optgroup label="Số lượng">
                    <option value="cái">cái</option>
                    <option value="chiếc">chiếc</option>
                    <option value="bộ">bộ</option>
                    <option value="hộp">hộp</option>
                    <option value="thùng">thùng</option>
                    <option value="cuộn">cuộn</option>
                    <option value="tấm">tấm</option>
                    <option value="viên">viên</option>
                  </optgroup>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Chọn đơn vị phù hợp với loại nguyên vật liệu
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mô tả</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  {editingMaterial ? 'Cập nhật' : 'Tạo'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
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
