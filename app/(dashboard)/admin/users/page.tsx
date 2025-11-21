'use client';

import { useEffect, useState } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import SearchFilter from '@/components/SearchFilter';

interface User {
  id: number;
  userCode: string;
  username: string;
  fullName: string;
  email?: string;
  phone?: string;
  branchId: number;
  branchName: string;
  roleId: number;
  roleName: string;
  isActive: boolean;
  createdAt: string;
}

export default function UsersPage() {
  const { can, loading: permLoading } = usePermissions();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    userCode: '',
    username: '',
    password: '',
    fullName: '',
    email: '',
    phone: '',
    branchId: '',
    roleId: '',
    isActive: true,
  });

  useEffect(() => {
    fetchUsers();
    fetchRoles();
    fetchBranches();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      console.log('[fetchUsers] Response:', data);
      
      if (data.success) {
        console.log('[fetchUsers] Users count:', data.data.users.length);
        setUsers(data.data.users);
        setFilteredUsers(data.data.users);
      } else {
        console.error('[fetchUsers] Error:', data.error);
        alert('Lỗi: ' + data.error);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      alert('Lỗi kết nối: ' + error);
    } finally {
      setLoading(false);
    }
  };

  // Filter users
  useEffect(() => {
    let filtered = users;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.userCode.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Role filter
    if (filterRole) {
      filtered = filtered.filter(user => user.roleId.toString() === filterRole);
    }

    setFilteredUsers(filtered);
  }, [searchTerm, filterRole, users]);

  const fetchRoles = async () => {
    const res = await fetch('/api/admin/roles');
    const data = await res.json();
    if (data.success) setRoles(data.data);
  };

  const fetchBranches = async () => {
    const res = await fetch('/api/admin/branches');
    const data = await res.json();
    if (data.success) setBranches(data.data);
  };

  const handleAdd = () => {
    setEditingUser(null);
    setFormData({
      userCode: '',
      username: '',
      password: '',
      fullName: '',
      email: '',
      phone: '',
      branchId: '',
      roleId: '',
      isActive: true,
    });
    setShowModal(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      userCode: user.userCode,
      username: user.username,
      password: '',
      fullName: user.fullName,
      email: user.email || '',
      phone: user.phone || '',
      branchId: user.branchId.toString(),
      roleId: user.roleId.toString(),
      isActive: user.isActive,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingUser 
        ? `/api/admin/users/${editingUser.id}`
        : '/api/admin/users';
      
      const method = editingUser ? 'PUT' : 'POST';
      
      const body = editingUser
        ? { 
            fullName: formData.fullName,
            email: formData.email,
            phone: formData.phone,
            branchId: formData.branchId,
            roleId: formData.roleId,
            isActive: formData.isActive,
          }
        : formData;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      
      if (data.success) {
        alert(editingUser ? 'Cập nhật thành công' : 'Tạo người dùng thành công');
        setShowModal(false);
        setSelectedUser(null);
        fetchUsers();
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('Lỗi khi lưu người dùng');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa người dùng này?')) return;

    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      
      if (data.success) {
        alert('Xóa thành công');
        setSelectedUser(null);
        fetchUsers();
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('Lỗi khi xóa người dùng');
    }
  };

  if (loading || permLoading) return <div>Đang tải...</div>;

  // Kiểm tra quyền xem
  if (!can('admin.users', 'view')) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold text-gray-700 mb-2">Không có quyền truy cập</h2>
        <p className="text-gray-500">Bạn không có quyền xem danh sách người dùng</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-180px)]">
      {/* Main Content */}
      <div className={`flex-1 transition-all ${selectedUser ? 'mr-96' : ''}`}>
        <SearchFilter
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          placeholder="Tìm theo tên, username, mã..."
          actionButton={
            can('admin.users', 'create') && (
              <button
                onClick={handleAdd}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                + Thêm người dùng
              </button>
            )
          }
          filterContent={
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Vai trò</label>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Tất cả vai trò</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>{role.roleName}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterRole('');
                  }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  Xóa bộ lọc
                </button>
              </div>
            </div>
          }
        />

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên đăng nhập</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Họ tên</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chi nhánh</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vai trò</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr 
                  key={user.id} 
                  className={`hover:bg-blue-50 cursor-pointer transition-colors ${selectedUser?.id === user.id ? 'bg-blue-100' : ''}`}
                  onClick={() => setSelectedUser(user)}
                >
                  <td className="px-6 py-4 text-sm">{user.userCode}</td>
                  <td className="px-6 py-4 text-sm">{user.username}</td>
                  <td className="px-6 py-4 text-sm font-medium">{user.fullName}</td>
                  <td className="px-6 py-4 text-sm">{user.branchName}</td>
                  <td className="px-6 py-4 text-sm">{user.roleName}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {user.isActive ? 'Hoạt động' : 'Khóa'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Panel */}
      {selectedUser && (
        <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl border-l border-gray-200 overflow-y-auto z-40">
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-xl font-bold">Chi tiết người dùng</h2>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 uppercase">Mã người dùng</label>
                <p className="text-sm font-medium mt-1">{selectedUser.userCode}</p>
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase">Tên đăng nhập</label>
                <p className="text-sm font-medium mt-1">{selectedUser.username}</p>
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase">Họ tên</label>
                <p className="text-sm font-medium mt-1">{selectedUser.fullName}</p>
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase">Email</label>
                <p className="text-sm mt-1">{selectedUser.email || '-'}</p>
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase">Số điện thoại</label>
                <p className="text-sm mt-1">{selectedUser.phone || '-'}</p>
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase">Chi nhánh</label>
                <p className="text-sm mt-1">{selectedUser.branchName}</p>
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase">Vai trò</label>
                <p className="text-sm mt-1">{selectedUser.roleName}</p>
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase">Trạng thái</label>
                <p className="text-sm mt-1">
                  <span className={`px-2 py-1 rounded text-xs ${selectedUser.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {selectedUser.isActive ? 'Hoạt động' : 'Khóa'}
                  </span>
                </p>
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase">Ngày tạo</label>
                <p className="text-sm mt-1">{new Date(selectedUser.createdAt).toLocaleString('vi-VN')}</p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t space-y-3">
              {can('admin.users', 'edit') && (
                <button
                  onClick={() => handleEdit(selectedUser)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Chỉnh sửa
                </button>
              )}
              {can('admin.users', 'delete') && (
                <button
                  onClick={() => handleDelete(selectedUser.id)}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Xóa người dùng
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal thêm/sửa user */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-500/20 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
              <h2 className="text-xl font-bold text-gray-900">
                {editingUser ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6">
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Mã người dùng</label>
                <input
                  type="text"
                  value={formData.userCode}
                  onChange={(e) => setFormData({...formData, userCode: e.target.value})}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={!!editingUser}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tên đăng nhập</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={!!editingUser}
                  required
                />
              </div>
              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium mb-1">Mật khẩu</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Họ tên</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
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
              <div>
                <label className="block text-sm font-medium mb-1">Số điện thoại</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Chi nhánh</label>
                <select
                  value={formData.branchId}
                  onChange={(e) => setFormData({...formData, branchId: e.target.value})}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Chọn chi nhánh</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>{branch.branchName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Vai trò</label>
                <select
                  value={formData.roleId}
                  onChange={(e) => setFormData({...formData, roleId: e.target.value})}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Chọn vai trò</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>{role.roleName}</option>
                  ))}
                </select>
              </div>
              {editingUser && (
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                      className="mr-2 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium">Tài khoản hoạt động</span>
                  </label>
                </div>
              )}
              <div className="col-span-2 flex gap-2 pt-4 border-t">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  {editingUser ? 'Cập nhật' : 'Tạo'}
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
        </div>
      )}
    </div>
  );
}
