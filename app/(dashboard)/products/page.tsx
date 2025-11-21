'use client';

import { useEffect, useState } from 'react';
import { usePermissions } from '@/hooks/usePermissions';

interface Product {
  id: number;
  productCode: string;
  productName: string;
  categoryId?: number;
  categoryName?: string;
  description?: string;
  unit: string;
  costPrice?: number;
  branchName: string;
  isActive: boolean;
}

function BOMDisplay({ productId }: { productId: number }) {
  const [bom, setBom] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBOM();
  }, [productId]);

  const fetchBOM = async () => {
    try {
      const res = await fetch(`/api/products/${productId}/bom`);
      const data = await res.json();
      if (data.success) {
        setBom(data.data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-sm text-gray-500">Đang tải...</div>;
  
  if (bom.length === 0) {
    return <div className="text-sm text-gray-500 italic">Chưa có định mức nguyên liệu</div>;
  }

  return (
    <div className="space-y-2">
      {bom.map((item) => (
        <div key={item.id} className="bg-gray-50 p-2 rounded text-sm">
          <div className="font-medium">{item.materialName}</div>
          <div className="text-gray-600 text-xs mt-1">
            Số lượng: <span className="font-medium">{item.quantity} {item.unit}</span>
            {item.notes && <div className="text-gray-500 italic mt-1">{item.notes}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ProductsPage() {
  const { can, loading: permLoading, permissions, isAdmin } = usePermissions();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    productCode: '',
    productName: '',
    categoryId: '',
    description: '',
    unit: '',
    costPrice: '',
    bom: [] as Array<{ materialId: string; quantity: string; unit: string; notes: string }>,
  });

  // Debug permissions
  useEffect(() => {
    if (!permLoading) {
      console.log('=== PRODUCTS PAGE DEBUG ===');
      console.log('isAdmin:', isAdmin);
      console.log('Total permissions:', permissions.length);
      console.log('All permissions:', permissions.map(p => p.permissionCode));
      console.log('Has products.products?', permissions.find(p => p.permissionCode === 'products.products'));
      console.log('can(products.products, view):', can('products.products', 'view'));
      console.log('can(products.products, create):', can('products.products', 'create'));
      console.log('can(products.products, edit):', can('products.products', 'edit'));
      console.log('can(products.products, delete):', can('products.products', 'delete'));
    }
  }, [permLoading, permissions, isAdmin, can]);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchMaterials();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.success) {
        setProducts(data.data.products);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    const res = await fetch('/api/products/categories');
    const data = await res.json();
    if (data.success) setCategories(data.data);
  };

  const fetchMaterials = async () => {
    const res = await fetch('/api/products/materials');
    const data = await res.json();
    if (data.success) setMaterials(data.data);
  };

  const handleAdd = () => {
    setEditingProduct(null);
    setFormData({
      productCode: '',
      productName: '',
      categoryId: '',
      description: '',
      unit: '',
      costPrice: '',
      bom: [],
    });
    setShowModal(true);
  };

  const handleEdit = async (product: Product) => {
    setEditingProduct(product);
    
    // Fetch BOM
    const res = await fetch(`/api/products/${product.id}/bom`);
    const data = await res.json();
    
    setFormData({
      productCode: product.productCode,
      productName: product.productName,
      categoryId: product.categoryId?.toString() || '',
      description: product.description || '',
      unit: product.unit,
      costPrice: product.costPrice?.toString() || '',
      bom: data.success ? data.data.map((b: any) => ({
        materialId: b.materialId.toString(),
        quantity: b.quantity.toString(),
        unit: b.unit,
        notes: b.notes || '',
      })) : [],
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingProduct 
        ? `/api/products/${editingProduct.id}`
        : '/api/products';
      
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          costPrice: formData.costPrice ? parseFloat(formData.costPrice) : null,
          bom: formData.bom.map(b => ({
            materialId: parseInt(b.materialId),
            quantity: parseFloat(b.quantity),
            unit: b.unit,
            notes: b.notes,
          })),
        }),
      });

      const data = await res.json();
      
      if (data.success) {
        alert(editingProduct ? 'Cập nhật thành công' : 'Tạo sản phẩm thành công');
        setShowModal(false);
        setSelectedProduct(null);
        fetchProducts();
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('Lỗi khi lưu sản phẩm');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa sản phẩm này?')) return;

    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      
      if (data.success) {
        alert('Xóa thành công');
        setSelectedProduct(null);
        fetchProducts();
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('Lỗi khi xóa');
    }
  };

  if (loading || permLoading) return <div>Đang tải...</div>;

  // Kiểm tra quyền xem
  if (!can('products.products', 'view')) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold text-gray-700 mb-2">Không có quyền truy cập</h2>
        <p className="text-gray-500">Bạn không có quyền xem danh sách sản phẩm</p>
      </div>
    );
  }

  const addBomItem = () => {
    setFormData({
      ...formData,
      bom: [...formData.bom, { materialId: '', quantity: '', unit: '', notes: '' }],
    });
  };

  const removeBomItem = (index: number) => {
    setFormData({
      ...formData,
      bom: formData.bom.filter((_, i) => i !== index),
    });
  };

  const updateBomItem = (index: number, field: string, value: string) => {
    const newBom = [...formData.bom];
    
    // Tự động điền đơn vị khi chọn NVL
    if (field === 'materialId' && value) {
      const material = materials.find(m => m.id.toString() === value);
      if (material) {
        newBom[index] = { 
          ...newBom[index], 
          materialId: value,
          unit: material.unit // Tự động lấy đơn vị từ NVL
        };
      }
    } else {
      newBom[index] = { ...newBom[index], [field]: value };
    }
    
    setFormData({ ...formData, bom: newBom });
  };

  if (loading) return <div>Đang tải...</div>;

  return (
    <div className="flex h-[calc(100vh-120px)]">
      {/* Main Content */}
      <div className={`flex-1 transition-all ${selectedProduct ? 'mr-96' : ''}`}>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Quản lý sản phẩm</h1>
          {can('products.products', 'create') && (
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              + Thêm sản phẩm
            </button>
          )}
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã SP</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên sản phẩm</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Danh mục</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Đơn vị</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Giá vốn</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products.map((product) => (
                <tr 
                  key={product.id} 
                  className={`hover:bg-blue-50 cursor-pointer transition-colors ${selectedProduct?.id === product.id ? 'bg-blue-100' : ''}`}
                  onClick={() => setSelectedProduct(product)}
                >
                  <td className="px-6 py-4 text-sm">{product.productCode}</td>
                  <td className="px-6 py-4 text-sm font-medium">{product.productName}</td>
                  <td className="px-6 py-4 text-sm">{product.categoryName || '-'}</td>
                  <td className="px-6 py-4 text-sm">{product.unit}</td>
                  <td className="px-6 py-4 text-sm">{product.costPrice?.toLocaleString('vi-VN')}đ</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${product.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {product.isActive ? 'Hoạt động' : 'Khóa'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Panel */}
      {selectedProduct && (
        <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl border-l border-gray-200 overflow-y-auto z-40">
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-xl font-bold">Chi tiết sản phẩm</h2>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 uppercase">Mã sản phẩm</label>
                <p className="text-sm font-medium mt-1">{selectedProduct.productCode}</p>
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase">Tên sản phẩm</label>
                <p className="text-sm font-medium mt-1">{selectedProduct.productName}</p>
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase">Danh mục</label>
                <p className="text-sm mt-1">{selectedProduct.categoryName || '-'}</p>
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase">Mô tả</label>
                <p className="text-sm mt-1">{selectedProduct.description || '-'}</p>
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase">Đơn vị</label>
                <p className="text-sm mt-1">{selectedProduct.unit}</p>
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase">Giá vốn</label>
                <p className="text-sm mt-1">{selectedProduct.costPrice?.toLocaleString('vi-VN')}đ</p>
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase">Chi nhánh</label>
                <p className="text-sm mt-1">{selectedProduct.branchName}</p>
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase">Trạng thái</label>
                <p className="text-sm mt-1">
                  <span className={`px-2 py-1 rounded text-xs ${selectedProduct.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {selectedProduct.isActive ? 'Hoạt động' : 'Khóa'}
                  </span>
                </p>
              </div>
            </div>

            {/* BOM Section */}
            <div className="mt-6 pt-6 border-t">
              <h3 className="text-sm font-bold text-gray-700 mb-3">📋 Định mức nguyên liệu (BOM)</h3>
              <BOMDisplay productId={selectedProduct.id} />
            </div>

            <div className="mt-6 pt-6 border-t space-y-3">
              {can('products.products', 'edit') && (
                <button
                  onClick={() => handleEdit(selectedProduct)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Chỉnh sửa
                </button>
              )}
              {can('products.products', 'delete') && (
                <button
                  onClick={() => handleDelete(selectedProduct.id)}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Xóa sản phẩm
                </button>
              )}
              {!can('products.products', 'edit') && !can('products.products', 'delete') && (
                <div className="text-sm text-gray-500 text-center py-4">
                  Bạn chỉ có quyền xem
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-500/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl">
            <h2 className="text-xl font-bold mb-4">
              {editingProduct ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Mã sản phẩm *</label>
                  <input
                    type="text"
                    value={formData.productCode}
                    onChange={(e) => setFormData({...formData, productCode: e.target.value})}
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={!!editingProduct}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tên sản phẩm *</label>
                  <input
                    type="text"
                    value={formData.productName}
                    onChange={(e) => setFormData({...formData, productName: e.target.value})}
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Danh mục</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">-- Không chọn --</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.categoryName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Đơn vị *</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="VD: cái, bộ, chiếc"
                    required
                  />
                </div>
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

              <div>
                <label className="block text-sm font-medium mb-1">Giá vốn</label>
                <input
                  type="number"
                  value={formData.costPrice}
                  onChange={(e) => setFormData({...formData, costPrice: e.target.value})}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                />
              </div>

              {/* BOM Section */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium">Định mức nguyên liệu (BOM)</label>
                  <button
                    type="button"
                    onClick={addBomItem}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                  >
                    + Thêm NVL
                  </button>
                </div>

                {formData.bom.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">Chưa có nguyên vật liệu</p>
                ) : (
                  <div className="space-y-2">
                    {formData.bom.map((item, index) => {
                      const selectedMaterial = materials.find(m => m.id.toString() === item.materialId);
                      return (
                        <div key={index} className="bg-gradient-to-r from-gray-50 to-gray-100 p-3 rounded-lg border border-gray-200">
                          <div className="flex gap-2 items-start mb-3">
                            <div className="flex-1">
                              <label className="text-xs text-gray-600 font-medium mb-1 block">
                                Nguyên vật liệu *
                              </label>
                              <select
                                value={item.materialId}
                                onChange={(e) => updateBomItem(index, 'materialId', e.target.value)}
                                className="w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                              >
                                <option value="">-- Chọn nguyên vật liệu --</option>
                                {materials.map((mat) => (
                                  <option key={mat.id} value={mat.id}>
                                    {mat.materialName} ({mat.unit})
                                  </option>
                                ))}
                              </select>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeBomItem(index)}
                              className="mt-6 px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                              title="Xóa"
                            >
                              ✕
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-gray-600 font-medium mb-1 block">
                                Số lượng *
                              </label>
                              <input
                                type="number"
                                step="0.001"
                                value={item.quantity}
                                onChange={(e) => updateBomItem(index, 'quantity', e.target.value)}
                                className="w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="0"
                                required
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-600 font-medium mb-1 block">
                                Đơn vị
                              </label>
                              <div className="px-3 py-2 border rounded text-sm bg-blue-50 border-blue-200 text-blue-800 font-medium">
                                {item.unit || '---'}
                              </div>
                            </div>
                          </div>
                          {selectedMaterial && (
                            <div className="mt-2 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                              ✓ Đơn vị tự động: <span className="font-bold">{selectedMaterial.unit}</span>
                            </div>
                          )}
                          <div className="mt-3">
                            <label className="text-xs text-gray-600 font-medium mb-1 block">
                              Ghi chú
                            </label>
                            <input
                              type="text"
                              value={item.notes}
                              onChange={(e) => updateBomItem(index, 'notes', e.target.value)}
                              className="w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="VD: Vải loại A, màu xanh..."
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  {editingProduct ? 'Cập nhật' : 'Tạo'}
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
