'use client';

import { useEffect, useState } from 'react';
import { usePermissions } from '@/hooks/usePermissions';

interface Category {
  id: number;
  categoryCode: string;
  categoryName: string;
  parentId?: number;
  parentName?: string;
  description?: string;
}

export default function CategoriesPage() {
  const { can, loading: permLoading } = usePermissions();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    categoryCode: '',
    categoryName: '',
    parentId: '',
    description: '',
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/products/categories');
      const data = await res.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingCategory(null);
    setFormData({
      categoryCode: '',
      categoryName: '',
      parentId: '',
      description: '',
    });
    setShowModal(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      categoryCode: category.categoryCode,
      categoryName: category.categoryName,
      parentId: category.parentId?.toString() || '',
      description: category.description || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingCategory 
        ? `/api/products/categories/${editingCategory.id}`
        : '/api/products/categories';
      
      const method = editingCategory ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      
      if (data.success) {
        alert(editingCategory ? 'Cập nhật thành công' : 'Tạo danh mục thành công');
        setShowModal(false);
        setSelectedCategory(null);
        fetchCategories();
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('Lỗi khi lưu danh mục');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa danh mục này?')) return;

    try {
      const res = await fetch(`/api/products/categories/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      
      if (data.success) {
        alert('Xóa thành công');
        setSelectedCategory(null);
        fetchCategories();
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('Lỗi khi xóa');
    }
  };

  if (loading || permLoading) return <div>Đang tải...</div>;

  // Kiểm tra quyền xem
  if (!can('products.categories', 'view')) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold text-gray-700 mb-2">Không có quyền truy cập</h2>
        <p className="text-gray-500">Bạn không có quyền xem danh mục sản phẩm</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-120px)]">
      {/* Main Content */}
      <div className={`flex-1 transition-all ${selectedCategory ? 'mr-96' : ''}`}>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Danh mục sản phẩm</h1>
          {can('products.categories', 'create') && (
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              + Thêm danh mục
            </button>
          )}
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên danh mục</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Danh mục cha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mô tả</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {categories.map((cat) => (
                <tr 
                  key={cat.id}
                  className={`hover:bg-blue-50 cursor-pointer transition-colors ${selectedCategory?.id === cat.id ? 'bg-blue-100' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  <td className="px-6 py-4 text-sm">{cat.categoryCode}</td>
                  <td className="px-6 py-4 text-sm font-medium">{cat.categoryName}</td>
                  <td className="px-6 py-4 text-sm">{cat.parentName || '-'}</td>
                  <td className="px-6 py-4 text-sm">{cat.description || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Panel */}
      {selectedCategory && (
        <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl border-l border-gray-200 overflow-y-auto z-40">
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-xl font-bold">Chi tiết danh mục</h2>
              <button
                onClick={() => setSelectedCategory(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 uppercase">Mã danh mục</label>
                <p className="text-sm font-medium mt-1">{selectedCategory.categoryCode}</p>
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase">Tên danh mục</label>
                <p className="text-sm font-medium mt-1">{selectedCategory.categoryName}</p>
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase">Danh mục cha</label>
                <p className="text-sm mt-1">{selectedCategory.parentName || '-'}</p>
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase">Mô tả</label>
                <p className="text-sm mt-1">{selectedCategory.description || '-'}</p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t space-y-3">
              {can('products.categories', 'edit') && (
                <button
                  onClick={() => handleEdit(selectedCategory)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Chỉnh sửa
                </button>
              )}
              {can('products.categories', 'delete') && (
                <button
                  onClick={() => handleDelete(selectedCategory.id)}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Xóa danh mục
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-500/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold mb-4">
              {editingCategory ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Mã danh mục *</label>
                <input
                  type="text"
                  value={formData.categoryCode}
                  onChange={(e) => setFormData({...formData, categoryCode: e.target.value})}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={!!editingCategory}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tên danh mục *</label>
                <input
                  type="text"
                  value={formData.categoryName}
                  onChange={(e) => setFormData({...formData, categoryName: e.target.value})}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Danh mục cha</label>
                <select
                  value={formData.parentId}
                  onChange={(e) => setFormData({...formData, parentId: e.target.value})}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">-- Không có --</option>
                  {categories.filter(c => c.id !== editingCategory?.id).map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.categoryName}</option>
                  ))}
                </select>
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
                  {editingCategory ? 'Cập nhật' : 'Tạo'}
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
