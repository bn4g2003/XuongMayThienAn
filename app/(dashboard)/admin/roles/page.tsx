'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePermissions } from '@/hooks/usePermissions';
import SearchFilter from '@/components/SearchFilter';

interface Role {
  id: number;
  roleCode: string;
  roleName: string;
  description?: string;
  userCount: number;
}

export default function RolesPage() {
  const { can, loading: permLoading } = usePermissions();
  const [roles, setRoles] = useState<Role[]>([]);
  const [filteredRoles, setFilteredRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    roleCode: '',
    roleName: '',
    description: '',
  });

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const res = await fetch('/api/admin/roles');
      const data = await res.json();
      if (data.success) {
        setRoles(data.data);
        setFilteredRoles(data.data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter roles
  useEffect(() => {
    if (searchTerm) {
      const filtered = roles.filter(role =>
        role.roleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        role.roleCode.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredRoles(filtered);
    } else {
      setFilteredRoles(roles);
    }
  }, [searchTerm, roles]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      
      if (data.success) {
        alert('Tạo vai trò thành công');
        setShowModal(false);
        fetchRoles();
        setFormData({
          roleCode: '',
          roleName: '',
          description: '',
        });
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('Lỗi khi tạo vai trò');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa vai trò này?')) return;

    try {
      const res = await fetch(`/api/admin/roles/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      
      if (data.success) {
        alert('Xóa thành công');
        fetchRoles();
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('Lỗi khi xóa');
    }
  };

  if (loading || permLoading) return <div>Đang tải...</div>;

  // Kiểm tra quyền xem
  if (!can('admin.roles', 'view')) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold text-gray-700 mb-2">Không có quyền truy cập</h2>
        <p className="text-gray-500">Bạn không có quyền xem danh sách vai trò</p>
      </div>
    );
  }

  return (
    <div>
      <SearchFilter
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        placeholder="Tìm theo tên vai trò, mã..."
        actionButton={
          can('admin.roles', 'create') && (
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              + Thêm vai trò
            </button>
          )
        }
      />

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã vai trò</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên vai trò</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mô tả</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số người dùng</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredRoles.map((role) => (
              <tr key={role.id}>
                <td className="px-6 py-4 text-sm font-mono">{role.roleCode}</td>
                <td className="px-6 py-4 text-sm font-medium">{role.roleName}</td>
                <td className="px-6 py-4 text-sm">{role.description || '-'}</td>
                <td className="px-6 py-4 text-sm">{role.userCount}</td>
                <td className="px-6 py-4 text-sm space-x-3">
                  {/* {can('admin.roles', 'edit') && (
                    <Link
                      href={`/admin/roles/${role.id}/permissions`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Phân quyền
                    </Link>
                  )} */}
                  {can('admin.roles', 'delete') && (
                    <button
                      onClick={() => handleDelete(role.id)}
                      className="text-red-600 hover:text-red-800"
                      disabled={role.userCount > 0}
                    >
                      Xóa
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Thêm vai trò mới</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Mã vai trò *</label>
                <input
                  type="text"
                  value={formData.roleCode}
                  onChange={(e) => setFormData({...formData, roleCode: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="VD: MANAGER, STAFF"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tên vai trò *</label>
                <input
                  type="text"
                  value={formData.roleName}
                  onChange={(e) => setFormData({...formData, roleName: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mô tả</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
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
