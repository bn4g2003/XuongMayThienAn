import { db } from '@/lib/db';
import { requirePermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { hasPermission } = await requirePermission('inventory.export', 'view');
    if (!hasPermission) {
      return new NextResponse('Không có quyền', { status: 403 });
    }

    const resolvedParams = await params;
    const transactionId = parseInt(resolvedParams.id);

    if (isNaN(transactionId)) {
      return new NextResponse('ID không hợp lệ', { status: 400 });
    }

    // Lấy thông tin phiếu
    const trans = await db.inventory_transactions.findUnique({
      where: { id: transactionId },
      include: {
        warehouses_inventory_transactions_from_warehouse_idTowarehouses: {
          include: {
            branches: true
          }
        },
        users_inventory_transactions_created_byTousers: true
      }
    });

    if (!trans) {
      return new NextResponse('Không tìm thấy phiếu', { status: 404 });
    }

    const transaction = {
      transactionCode: trans.transaction_code,
      warehouseName: trans.warehouses_inventory_transactions_from_warehouse_idTowarehouses?.warehouse_name,
      branchName: trans.warehouses_inventory_transactions_from_warehouse_idTowarehouses?.branches?.branch_name,
      branchAddress: trans.warehouses_inventory_transactions_from_warehouse_idTowarehouses?.branches?.address,
      notes: trans.notes,
      createdBy: trans.users_inventory_transactions_created_byTousers?.full_name,
      createdAt: trans.created_at,
      completedAt: trans.completed_at
    };

    // Lấy thông tin công ty
    const companyData = await db.company_config.findFirst();
    const company = companyData ? {
      companyName: companyData.company_name,
      taxCode: companyData.tax_code,
      address: companyData.address,
      phone: companyData.phone,
      email: companyData.email,
      headerText: companyData.header_text
    } : {
      companyName: 'CÔNG TY',
      taxCode: '',
      address: '',
      phone: '',
      email: '',
      headerText: ''
    };

    // Lấy chi tiết
    const details = await db.inventory_transaction_details.findMany({
      where: { transaction_id: transactionId },
      include: {
        materials: true,
        products: true
      }
    });

    const detailsResult = details.map(detail => ({
      itemCode: detail.materials?.material_code || detail.products?.product_code,
      itemName: detail.materials?.material_name || detail.products?.product_name,
      unit: detail.materials?.unit || detail.products?.unit,
      quantity: Number(detail.quantity)
    }));

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Phiếu xuất kho ${transaction.transactionCode}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .company-header { text-align: center; margin-bottom: 10px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .company-name { font-size: 18px; font-weight: bold; margin: 0; }
          .company-info { font-size: 12px; color: #666; margin: 2px 0; }
          .header { text-align: center; margin: 20px 0; }
          .header h1 { margin: 10px 0; font-size: 24px; }
          .header h2 { margin: 5px 0; font-size: 18px; color: #666; }
          .info { margin-bottom: 20px; }
          .info p { margin: 5px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
          .signature { margin-top: 50px; display: flex; justify-content: space-around; }
          .signature > div { text-align: center; }
          @media print {
            body { padding: 10px; }
          }
        </style>
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </head>
      <body>
        <div class="company-header">
          <p class="company-name">${company.companyName}</p>
          ${company.taxCode ? `<p class="company-info">MST: ${company.taxCode}</p>` : ''}
          ${company.address ? `<p class="company-info">Địa chỉ: ${company.address}</p>` : ''}
          ${company.phone ? `<p class="company-info">ĐT: ${company.phone}</p>` : ''}
          ${company.email ? `<p class="company-info">Email: ${company.email}</p>` : ''}
        </div>

        <div class="header">
          <h1>PHIẾU XUẤT KHO</h1>
          <h2>Số: ${transaction.transactionCode}</h2>
          <p style="font-style: italic; font-size: 14px;">Ngày ${transaction.createdAt ? new Date(transaction.createdAt).toLocaleDateString('vi-VN') : ''}</p>
        </div>

        <div class="info">
          <p><strong>Kho xuất:</strong> ${transaction.warehouseName}</p>
          <p><strong>Chi nhánh:</strong> ${transaction.branchName}</p>
          <p><strong>Người tạo:</strong> ${transaction.createdBy}</p>
          <p><strong>Ngày tạo:</strong> ${transaction.createdAt ? new Date(transaction.createdAt).toLocaleString('vi-VN') : ''}</p>
          ${transaction.notes ? `<p><strong>Ghi chú:</strong> ${transaction.notes}</p>` : ''}
        </div>

        <table>
          <thead>
            <tr>
              <th>STT</th>
              <th>Mã hàng</th>
              <th>Tên hàng</th>
              <th>Số lượng</th>
              <th>Đơn vị</th>
            </tr>
          </thead>
          <tbody>
            ${detailsResult.map((item, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${item.itemCode}</td>
                <td>${item.itemName}</td>
                <td style="text-align: right">${item.quantity}</td>
                <td>${item.unit}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="signature">
          <div style="text-align: center;">
            <p><strong>Người lập phiếu</strong></p>
            <p style="margin-top: 60px;">${transaction.createdBy}</p>
          </div>
          <div style="text-align: center;">
            <p><strong>Thủ kho</strong></p>
            <p style="margin-top: 60px;">_______________</p>
          </div>
          <div style="text-align: center;">
            <p><strong>Giám đốc</strong></p>
            <p style="margin-top: 60px;">_______________</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });

  } catch (error) {
    console.error('Print PDF error:', error);
    return new NextResponse(`Lỗi: ${error}`, { status: 500 });
  }
}
