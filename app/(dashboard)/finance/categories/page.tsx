'use client';

import { useEffect, useState } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import Modal from '@/components/Modal';

interface FinancialCategory {
  id: number;
  categoryCode: string;
  categoryName: string;
  type: 'THU' | 'CHI';
  description: string;
  isActive: boolean;
  createdAt: string;
}

export default function FinancialCategoriesPage() {
  const { can } = usePermissions();
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FinancialCategory | null>(null);
  const [filterType, setFilterType] = useState<'ALL' | 'THU' | 'CHI'>('ALL');

  const [formData, setFormData] = useState({
    categoryCode: '',
    categoryName: '',
    type: 'THU' as 'THU' | 'CHI',
    description: '',
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/finance/categories');
      const data = await res.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingCategory
        ? `/api/finance/categories/${editingCategory.id}`
        : '/api/finance/categories';
      
      const method = editingCategory ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        alert(editingCategory ? 'Cập nhật thành công!' : 'Tạo danh mục thành công!');
        setShowModal(false);
        resetForm();
        fetchCategories();
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Có lỗi xảy ra');
    }
  };

  const handleEdit = (category: FinancialCategory) => {
    setEditingCategory(category);
    setFormData({
      categoryCode: category.categoryCode,
      categoryName: category.categoryName,
      type: category.type,
      description: category.description,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa danh mục này?')) return;

    try {
      const res = await fetch(`/api/finance/categories/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        alert('Xóa thành công!');
        fetchCategories();
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Có lỗi xảy ra');
    }
  };

  const resetForm = () => {
    setFormData({
      categoryCode: '',
      categoryName: '',
      type: 'THU',
      description: '',
    });
    setEditingCategory(null);
  };

  const filteredCategories = categories.filter(cat => 
    filterType === 'ALL' || cat.type === filterType
  );

  if (loading) return <div>Đang tải...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Danh mục tài chính</h1>
        {can('finance.categories', 'create') && (
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + Thêm danh mục
          </button>
        )}
      </div>

      {/* Filter */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setFilterType('ALL')}
          className={`px-4 py-2 rounded ${filterType === 'ALL' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          Tất cả
        </button>
        <button
          onClick={() => setFilterType('THU')}
          className={`px-4 py-2 rounded ${filterType === 'THU' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
        >
          Thu
        </button>
        <button
          onClick={() => setFilterType('CHI')}
          className={`px-4 py-2 rounded ${filterType === 'CHI' ? 'bg-red-600 text-white' : 'bg-gray-200'}`}
        >
          Chi
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên danh mục</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loại</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mô tả</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
              {(can('finance.categories', 'edit') || can('finance.categories', 'delete')) && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thao tác</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredCategories.map((category) => (
              <tr key={category.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{category.categoryCode}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{category.categoryName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 py-1 rounded text-xs ${
                    category.type === 'THU' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {category.type}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{category.description}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 py-1 rounded text-xs ${
                    category.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {category.isActive ? 'Hoạt động' : 'Ngừng'}
                  </span>
                </td>
                {(can('finance.categories', 'edit') || can('finance.categories', 'delete')) && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {can('finance.categories', 'edit') && (
                      <button
                        onClick={() => handleEdit(category)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        Sửa
                      </button>
                    )}
                    {can('finance.categories', 'delete') && (
                      <button
                        onClick={() => handleDelete(category.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Xóa
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingCategory ? 'Sửa danh mục' : 'Thêm danh mục'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Mã danh mục *</label>
            <input
              type="text"
              value={formData.categoryCode}
              onChange={(e) => setFormData({ ...formData, categoryCode: e.target.value })}
              className="w-full px-3 py-2 border rounded"
              required
              disabled={!!editingCategory}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tên danh mục *</label>
            <input
              type="text"
              value={formData.categoryName}
              onChange={(e) => setFormData({ ...formData, categoryName: e.target.value })}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Loại *</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as 'THU' | 'CHI' })}
              className="w-full px-3 py-2 border rounded"
              required
            >
              <option value="THU">Thu</option>
              <option value="CHI">Chi</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Mô tả</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border rounded"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {editingCategory ? 'Cập nhật' : 'Tạo mới'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
