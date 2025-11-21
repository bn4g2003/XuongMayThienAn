'use client';

import { useEffect, useState } from 'react';
import { usePermissions } from '@/hooks/usePermissions';

interface Customer {
  id: number;
  customerCode: string;
  customerName: string;
  phone: string;
  email: string;
  address: string;
  groupName: string;
  debtAmount: number;
  isActive: boolean;
}

export default function CustomersPage() {
  const { can, loading: permLoading } = usePermissions();
  const [activeTab, setActiveTab] = useState<'customers' | 'groups'>('customers');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [formData, setFormData] = useState({
    customerCode: '',
    customerName: '',
    phone: '',
    email: '',
    address: '',
    customerGroupId: '',
  });
  const [groupFormData, setGroupFormData] = useState({
    groupCode: '',
    groupName: '',
    priceMultiplier: '0',
    description: '',
  });

  useEffect(() => {
    if (!permLoading && can('sales.customers', 'view')) {
      fetchCustomers();
      fetchGroups();
    } else if (!permLoading) {
      setLoading(false);
    }
  }, [permLoading]);

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/sales/customers');
      const data = await res.json();
      if (data.success) setCustomers(data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/sales/customer-groups');
      const data = await res.json();
      if (data.success) setGroups(data.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreate = () => {
    setSelectedCustomer(null);
    setFormData({
      customerCode: '',
      customerName: '',
      phone: '',
      email: '',
      address: '',
      customerGroupId: '',
    });
    setShowModal(true);
  };

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      customerCode: customer.customerCode,
      customerName: customer.customerName,
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      customerGroupId: '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = selectedCustomer 
        ? `/api/sales/customers/${selectedCustomer.id}`
        : '/api/sales/customers';
      
      const res = await fetch(url, {
        method: selectedCustomer ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        alert(selectedCustomer ? 'Cập nhật thành công' : 'Tạo khách hàng thành công');
        setShowModal(false);
        fetchCustomers();
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      alert('Có lỗi xảy ra');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Xác nhận xóa khách hàng này?')) return;

    try {
      const res = await fetch(`/api/sales/customers/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        alert('Xóa thành công');
        fetchCustomers();
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      alert('Có lỗi xảy ra');
    }
  };

  const handleCreateGroup = () => {
    setSelectedGroup(null);
    setGroupFormData({
      groupCode: '',
      groupName: '',
      priceMultiplier: '1.000',
      description: '',
    });
    setShowGroupModal(true);
  };

  const handleEditGroup = (group: any) => {
    setSelectedGroup(group);
    setGroupFormData({
      groupCode: group.groupCode,
      groupName: group.groupName,
      priceMultiplier: group.priceMultiplier,
      description: group.description || '',
    });
    setShowGroupModal(true);
  };

  const handleSubmitGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = selectedGroup 
        ? `/api/sales/customer-groups/${selectedGroup.id}`
        : '/api/sales/customer-groups';
      
      const res = await fetch(url, {
        method: selectedGroup ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupFormData),
      });

      const data = await res.json();
      if (data.success) {
        alert(selectedGroup ? 'Cập nhật thành công' : 'Tạo nhóm thành công');
        setShowGroupModal(false);
        fetchGroups();
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      alert('Có lỗi xảy ra');
    }
  };

  const handleDeleteGroup = async (id: number) => {
    if (!confirm('Xác nhận xóa nhóm này?')) return;

    try {
      const res = await fetch(`/api/sales/customer-groups/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        alert('Xóa thành công');
        fetchGroups();
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      alert('Có lỗi xảy ra');
    }
  };

  if (permLoading || loading) return <div className="text-center py-8">Đang tải...</div>;

  if (!can('sales.customers', 'view')) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-700 mb-2">Không có quyền truy cập</h2>
        <p className="text-gray-500">Bạn không có quyền xem danh sách khách hàng</p>
      </div>
    );
  }

  const filteredCustomers = customers.filter(c =>
    c.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.customerCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm)
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Quản lý khách hàng</h1>
        {activeTab === 'customers' && can('sales.customers', 'create') && (
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            ➕ Thêm khách hàng
          </button>
        )}
        {activeTab === 'groups' && can('sales.customers', 'create') && (
          <button
            onClick={handleCreateGroup}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            ➕ Thêm nhóm
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('customers')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'customers'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            👥 Khách hàng
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'groups'
                ? 'border-b-2 border-green-600 text-green-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            📊 Nhóm khách hàng
          </button>
        </div>
      </div>

      {activeTab === 'customers' && (
        <>
          <div className="bg-white rounded-lg shadow p-4">
            <input
              type="text"
              placeholder="🔍 Tìm theo tên, mã, số điện thoại..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-6xl mb-2">👥</div>
            <div>Chưa có khách hàng</div>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">Mã KH</th>
                <th className="px-4 py-3 text-left">Tên khách hàng</th>
                <th className="px-4 py-3 text-left">Điện thoại</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Nhóm</th>
                <th className="px-4 py-3 text-right">Công nợ</th>
                <th className="px-4 py-3 text-center">Trạng thái</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono">{customer.customerCode}</td>
                  <td className="px-4 py-3 font-medium">{customer.customerName}</td>
                  <td className="px-4 py-3">{customer.phone}</td>
                  <td className="px-4 py-3">{customer.email}</td>
                  <td className="px-4 py-3">{customer.groupName}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={customer.debtAmount > 0 ? 'text-red-600 font-semibold' : ''}>
                      {customer.debtAmount.toLocaleString()} đ
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs ${
                      customer.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {customer.isActive ? 'Hoạt động' : 'Ngừng'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {can('sales.customers', 'edit') && (
                      <button
                        onClick={() => handleEdit(customer)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        ✏️ Sửa
                      </button>
                    )}
                    {can('sales.customers', 'delete') && (
                      <button
                        onClick={() => handleDelete(customer.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        🗑️ Xóa
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
          </div>
        </>
      )}

      {activeTab === 'groups' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {groups.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-2">📊</div>
              <div>Chưa có nhóm khách hàng</div>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">Mã nhóm</th>
                  <th className="px-4 py-3 text-left">Tên nhóm</th>
                  <th className="px-4 py-3 text-right">% Giảm giá</th>
                  <th className="px-4 py-3 text-left">Mô tả</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {groups.map((group) => (
                  <tr key={group.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono">{group.groupCode}</td>
                    <td className="px-4 py-3 font-medium">{group.groupName}</td>
                    <td className="px-4 py-3 text-right">{group.priceMultiplier}%</td>
                    <td className="px-4 py-3 text-gray-600">{group.description}</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {can('sales.customers', 'edit') && (
                        <button
                          onClick={() => handleEditGroup(group)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          ✏️ Sửa
                        </button>
                      )}
                      {can('sales.customers', 'delete') && (
                        <button
                          onClick={() => handleDeleteGroup(group.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          🗑️ Xóa
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-gray-500/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold mb-4">
              {selectedCustomer ? 'Chỉnh sửa khách hàng' : 'Thêm khách hàng mới'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Mã khách hàng *</label>
                <input
                  type="text"
                  value={formData.customerCode}
                  onChange={(e) => setFormData({...formData, customerCode: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                  required
                  disabled={!!selectedCustomer}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tên khách hàng *</label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Điện thoại</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                />
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
              <div>
                <label className="block text-sm font-medium mb-1">Nhóm khách hàng</label>
                <select
                  value={formData.customerGroupId}
                  onChange={(e) => setFormData({...formData, customerGroupId: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">-- Chọn nhóm --</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.groupName}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {selectedCustomer ? 'Cập nhật' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showGroupModal && (
        <div className="fixed inset-0 bg-gray-500/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold mb-4">
              {selectedGroup ? 'Chỉnh sửa nhóm' : 'Thêm nhóm mới'}
            </h2>
            <form onSubmit={handleSubmitGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Mã nhóm *</label>
                <input
                  type="text"
                  value={groupFormData.groupCode}
                  onChange={(e) => setGroupFormData({...groupFormData, groupCode: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                  required
                  disabled={!!selectedGroup}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tên nhóm *</label>
                <input
                  type="text"
                  value={groupFormData.groupName}
                  onChange={(e) => setGroupFormData({...groupFormData, groupName: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">% Giảm giá *</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={groupFormData.priceMultiplier}
                  onChange={(e) => setGroupFormData({...groupFormData, priceMultiplier: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">VD: 10 = giảm 10%, 20 = giảm 20%, 0 = không giảm</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mô tả</label>
                <textarea
                  value={groupFormData.description}
                  onChange={(e) => setGroupFormData({...groupFormData, description: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                  rows={2}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowGroupModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  {selectedGroup ? 'Cập nhật' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
