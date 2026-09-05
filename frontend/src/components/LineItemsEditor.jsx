import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Select, Input, Button } from './Field.jsx';
import { formatCurrency } from '../utils/format.js';

// lines: [{ productId, quantity, unitPrice }]
export default function LineItemsEditor({ lines, onChange, products, priceField = 'salesPrice' }) {
  const update = (idx, patch) => {
    const next = lines.map((l, i) => (i === idx ? { ...l, ...patch } : l));
    onChange(next);
  };

  const addLine = () => {
    const first = products[0];
    onChange([
      ...lines,
      { productId: first?.id || '', quantity: 1, unitPrice: first ? first[priceField] : 0 },
    ]);
  };

  const removeLine = (idx) => onChange(lines.filter((_, i) => i !== idx));

  const handleProductChange = (idx, productId) => {
    if (lines.some((l, i) => i !== idx && String(l.productId) === String(productId))) {
      window.alert('This product is already included. Use the existing line and change its quantity.');
      return;
    }
    const product = products.find((p) => String(p.id) === String(productId));
    update(idx, { productId, unitPrice: product ? product[priceField] : 0 });
  };

  const total = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0);

  return (
    <div>
      <div className="mb-2 grid grid-cols-12 gap-2 text-xs font-medium text-inksoft">
        <span className="col-span-6">Product</span>
        <span className="col-span-2">Qty</span>
        <span className="col-span-3">Unit price</span>
        <span className="col-span-1"></span>
      </div>
      <div className="space-y-2">
        {lines.map((line, idx) => (
          <div key={idx} className="grid grid-cols-12 items-center gap-2">
            <div className="col-span-6">
              <Select value={line.productId} onChange={(e) => handleProductChange(idx, e.target.value)} required>
                <option value="">Select product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="col-span-2">
  <Input
    type="number"
    min="1"
    value={line.quantity}
    onChange={(e) =>
      update(idx, {
        quantity: Math.max(1, Number(e.target.value) || 1)
      })
    }
    required
  />
</div>

<div className="col-span-3">
  <Input
    type="number"
    min="0"
    step="0.01"
    value={line.unitPrice}
    onChange={(e) =>
      update(idx, {
        unitPrice: Math.max(0, Number(e.target.value) || 0)
      })
    }
    required
  />
</div>
            <div className="col-span-1 text-right">
              <button type="button" onClick={() => removeLine(idx)} className="text-inksoft hover:text-brick" aria-label="Remove line">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button type="button" onClick={addLine} className="mt-3 flex items-center gap-1 text-sm font-medium text-walnut hover:text-walnut-dark">
        <Plus size={15} /> Add line
      </button>

      <div className="mt-4 flex justify-end border-t border-line pt-3 text-sm">
        <span className="mr-3 text-inksoft">Subtotal</span>
        <span className="font-num font-medium text-ink">{formatCurrency(total)}</span>
      </div>
    </div>
  );
}
