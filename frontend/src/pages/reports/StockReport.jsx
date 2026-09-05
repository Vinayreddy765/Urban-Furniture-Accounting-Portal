import React, { useEffect, useState } from 'react';
import { useData } from '../../context/DataContext.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { Badge } from '../../components/Field.jsx';

export default function StockReport() {
  const { getStockReport } = useData();
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getStockReport().then(result => { if (active) setProducts(result.products || []); }).catch(error => { if (active) setError(error.message); });
    return () => { active = false; };
  }, [getStockReport]);

  return (
    <div>
      <PageHeader title="Stock Report" description="Current quantities for Goods products after posted purchases and invoices." />
      {error && <p className="mb-4 border border-brick bg-brick-light px-3 py-2 text-sm text-brick">{error}</p>}
      {products.length === 0 ? <EmptyState label="No Goods products found." /> : (
        <table className="ledger-table">
          <thead><tr><th>Product</th><th>Type</th><th className="text-right">Quantity</th><th>Status</th></tr></thead>
          <tbody>{products.map(product => <tr key={product.id}>
            <td className="font-medium text-ink">{product.name}</td>
            <td className="text-inksoft">{product.type}</td>
            <td className="text-right font-num">{product.stock_quantity}</td>
            <td><Badge tone={product.is_archived ? 'neutral' : 'good'}>{product.is_archived ? 'Archived' : 'Active'}</Badge></td>
          </tr>)}</tbody>
        </table>
      )}
    </div>
  );
}
