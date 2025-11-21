'use client';

import { useEffect, useState } from 'react';

interface Branch {
  id: number;
  branchCode: string;
  branchName: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  createdAt: string;
}

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState({
    branchCode: '',
    branchName: '',
    address: '',
    phone: '',
    email: '',
    isActive: true,
  });

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const res = await fetch('/api/admin/branches');
      const data = await res.json();
      if (data.success) {
        setBranches(data.data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingBranch(null);
    setFormData({
      branchCode: '',
      branchName: '',
      address: '',
      phone: '',
      email: '',
      isActive: true,
    });
    setShowModal(true);
  };

  const handleEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      branchCode: branch.branchCode,
      branchName: branch.branchName,
      address: branch.address || '',
      phone: branch.phone || '',
      email: branch.email || '',
      isActive: branch.isActive,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingBranch 
        ? `/api/admin/branches/${editingBranch.id}`
        : '/api/admin/branches';
      
      const method = editingBranch ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      
      if (data.success) {
        alert(editingBranch ? 'Cập nhật thành công' : 'Tạo chi nhánh thành công');
        setShowModal(false);
        setSelectedBranch(null);
        fetchBranches();
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('Lỗi khi lưu chi nhánh');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa chi nhánh này?')) return;

    try {
      const res = await fetch(`/api/admin/branches/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      
      if (data.success) {
        alert('Xóa thành công');
        setSelectedBranch(null);
        fetchBranches();
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('Lỗi khi xóa');
    }
  };

  if (loading) return <div>Đang tải...</div>;

  return (
    <div className="flex h-[calc(100vh-120px)]">
      {/* Main Content */}
      <div className={`flex-1 transition-all ${selectedBranch ? 'mr-96' : ''}`}>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Quản lý chi nhánh</h1>
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + Thêm chi nhánh
          </button>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên chi nhánh</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Địa chỉ</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Điện thoại</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {branches.map((branch) => (
                <tr 
                  key={branch.id} 
                  className={`hover:bg-blue-50 cursor-pointer transition-colors ${selectedBranch?.id === branch.id ? 'bg-blue-100' : ''}`}
                  onClick={() => setSelectedBranch(branch)}
                >
                  <td className="px-6 py-4 text-sm">{branch.branchCode}</td>
                  <td className="px-6 py-4 text-sm font-medium">{branch.branchName}</td>
                  <td className="px-6 py-4 text-sm">{branch.address || '-'}</td>
                  <td className="px-6 py-4 text-sm">{branch.phone || '-'}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${branch.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {branch.isActive ? 'Hoạt động' : 'Khóa'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Panel */}
      {selectedBranch && (
        <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl border-l border-gray-200 overflow-y-auto z-40">
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-xl font-bold">Chi tiết chi nhánh</h2>
              <button
                onClick={() => setSelectedBranch(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 uppercase">Mã chi nhánh</label>
                <p className="text-sm font-medium mt-1">{selectedBranch.branchCode}</p>
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase">Tên chi nhánh</label>
                <p className="text-sm font-medium mt-1">{selectedBranch.branchName}</p>
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase">Địa chỉ</label>
                <p className="text-sm mt-1">{selectedBranch.address || '-'}</p>
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase">Điện thoại</label>
                <p className="text-sm mt-1">{selectedBranch.phone || '-'}</p>
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase">Email</label>
                <p className="text-sm mt-1">{selectedBranch.email || '-'}</p>
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase">Trạng thái</label>
                <p className="text-sm mt-1">
                  <span className={`px-2 py-1 rounded text-xs ${selectedBranch.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {selectedBranch.isActive ? 'Hoạt động' : 'Khóa'}
                  </span>
                </p>
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase">Ngày tạo</label>
                <p className="text-sm mt-1">{new Date(selectedBranch.createdAt).toLocaleString('vi-VN')}</p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t space-y-3">
              <button
                onClick={() => handleEdit(selectedBranch)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Chỉnh sửa
              </button>
              <button
                onClick={() => handleDelete(selectedBranch.id)}
                className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Xóa chi nhánh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-500/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold mb-4">
              {editingBranch ? 'Chỉnh sửa chi nhánh' : 'Thêm chi nhánh mới'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Mã chi nhánh *</label>
                <input
                  type="text"
                  value={formData.branchCode}
                  onChange={(e) => setFormData({...formData, branchCode: e.target.value})}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={!!editingBranch}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tên chi nhánh *</label>
                <input
                  type="text"
                  value={formData.branchName}
                  onChange={(e) => setFormData({...formData, branchName: e.target.value})}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Địa chỉ</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Điện thoại</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              {editingBranch && (
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                      className="mr-2 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium">Chi nhánh hoạt động</span>
                  </label>
                </div>
              )}
              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  {editingBranch ? 'Cập nhật' : 'Tạo'}
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
