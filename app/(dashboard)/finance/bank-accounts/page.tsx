'use client';

import { useEffect, useState } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import Modal from '@/components/Modal';

interface BankAccount {
  id: number;
  accountNumber: string;
  accountHolder: string;
  bankName: string;
  branchName?: string;
  balance: number;
  isActive: boolean;
  companyBranchName: string;
  createdAt: string;
}

export default function BankAccountsPage() {
  const { can } = usePermissions();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    accountNumber: '',
    accountHolder: '',
    bankName: '',
    branchName: '',
    balance: '',
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/finance/bank-accounts');
      const data = await res.json();
      if (data.success) {
        setAccounts(data.data);
      }
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch('/api/finance/bank-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          balance: parseFloat(formData.balance || '0'),
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert('Tạo tài khoản ngân hàng thành công!');
        setShowModal(false);
        resetForm();
        fetchAccounts();
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      console.error('Error saving bank account:', error);
      alert('Có lỗi xảy ra');
    }
  };

  const resetForm = () => {
    setFormData({
      accountNumber: '',
      accountHolder: '',
      bankName: '',
      branchName: '',
      balance: '',
    });
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance.toString()), 0);

  if (loading) return <div>Đang tải...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tài khoản ngân hàng</h1>
        {can('finance.cashbooks', 'create') && (
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + Thêm tài khoản
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-6">
        <div className="text-sm text-blue-600 mb-1">Tổng số dư</div>
        <div className="text-2xl font-bold text-blue-700">
          {totalBalance.toLocaleString('vi-VN')} đ
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số TK</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chủ TK</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngân hàng</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chi nhánh NH</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Số dư</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chi nhánh</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {accounts.map((account) => (
              <tr key={account.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{account.accountNumber}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{account.accountHolder}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{account.bankName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{account.branchName || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                  {parseFloat(account.balance.toString()).toLocaleString('vi-VN')} đ
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{account.companyBranchName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 py-1 rounded text-xs ${
                    account.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {account.isActive ? 'Hoạt động' : 'Ngừng'}
                  </span>
                </td>
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
        title="Thêm tài khoản ngân hàng"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Số tài khoản *</label>
            <input
              type="text"
              value={formData.accountNumber}
              onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Chủ tài khoản *</label>
            <input
              type="text"
              value={formData.accountHolder}
              onChange={(e) => setFormData({ ...formData, accountHolder: e.target.value })}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Ngân hàng *</label>
            <input
              type="text"
              value={formData.bankName}
              onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
              className="w-full px-3 py-2 border rounded"
              required
              placeholder="VD: Vietcombank, Techcombank, BIDV..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Chi nhánh ngân hàng</label>
            <input
              type="text"
              value={formData.branchName}
              onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
              className="w-full px-3 py-2 border rounded"
              placeholder="VD: Chi nhánh Hà Nội"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Số dư ban đầu</label>
            <input
              type="number"
              value={formData.balance}
              onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
              className="w-full px-3 py-2 border rounded"
              min="0"
              step="0.01"
              placeholder="0"
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
              Tạo mới
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
