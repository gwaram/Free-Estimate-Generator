import React, { useCallback, useMemo, useRef, useState } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Save, Copy, GripVertical, Trash2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { useEstimate } from '../state/EstimateContext';
import { Item } from '../types/estimate';
import { projectId } from '../utils/supabase/info';

interface EstimatePreviewProps {
  accessToken: string;
  user: any;
  currentEstimateId: string | null;
  onEstimateSaved: (estimateId: string) => void;
}

interface DragMeta {
  id: string;
  index: number;
  type: 'PREVIEW_ITEM';
}

const SPEC_OPTIONS = ['EA', 'SET', '개', '식', '품', 'm', 'kg', '시간', '일'];

const EditableItemRow: React.FC<{
  item: Item;
  index: number;
  onRemove: (index: number) => void;
  onMove: (from: number, to: number) => void;
  onUpdate: (index: number, value: Partial<Item>) => void;
}> = ({ item, index, onRemove, onMove, onUpdate }) => {
  const [{ isDragging }, dragRef, previewRef] = useDrag({
    type: 'PREVIEW_ITEM',
    item: { id: `preview-${index}`, index } as DragMeta,
    collect: monitor => ({ isDragging: monitor.isDragging() })
  });

  const [, dropRef] = useDrop({
    accept: 'PREVIEW_ITEM',
    hover(dragItem: DragMeta, monitor) {
      if (!monitor.isOver({ shallow: true })) return;
      if (dragItem.index === index) return;
      onMove(dragItem.index, index);
      dragItem.index = index;
    }
  });

  const [editingField, setEditingField] = useState<string | null>(null);
  const [draftValues, setDraftValues] = useState({
    name: item.name,
    quantity: item.quantity.toString(),
    price: item.price.toString(),
    spec: item.spec,
    note: item.note
  });

  const commitField = (field: keyof typeof draftValues) => {
    let value: any = draftValues[field];
    if (field === 'quantity' || field === 'price') {
      const numeric = Number(value);
      if (!Number.isFinite(numeric) || numeric < 0) {
        setDraftValues(prev => ({
          ...prev,
          [field]: field === 'quantity' ? item.quantity.toString() : item.price.toString()
        }));
        setEditingField(null);
        return;
      }
      if (field === 'quantity' && numeric === 0) {
        setDraftValues(prev => ({ ...prev, quantity: item.quantity.toString() }));
        setEditingField(null);
        return;
      }
      value = numeric;
    }
    onUpdate(index, { [field]: value });
    setEditingField(null);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>, field: keyof typeof draftValues) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitField(field);
    } else if (event.key === 'Escape') {
      setDraftValues({
        name: item.name,
        quantity: item.quantity.toString(),
        price: item.price.toString(),
        spec: item.spec,
        note: item.note
      });
      setEditingField(null);
    }
  };

  const renderField = (field: keyof typeof draftValues, display: string, className = '') => {
    const isEditing = editingField === field;

    if (isEditing) {
      if (field === 'spec') {
        return (
          <select
            value={draftValues.spec}
            onChange={event => {
              setDraftValues(prev => ({ ...prev, spec: event.target.value }));
              onUpdate(index, { spec: event.target.value });
              setEditingField(null);
            }}
            onBlur={() => setEditingField(null)}
            onKeyDown={event => handleKeyDown(event, field)}
            className={`bg-white border border-blue-400 rounded px-1 py-0.5 text-sm outline-none ${className}`}
            autoFocus
          >
            {SPEC_OPTIONS.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
      }

      return (
        <input
          type={field === 'quantity' || field === 'price' ? 'number' : 'text'}
          value={draftValues[field]}
          onChange={event => setDraftValues(prev => ({ ...prev, [field]: event.target.value }))}
          onBlur={() => commitField(field)}
          onKeyDown={event => handleKeyDown(event, field)}
          className={`bg-white border border-blue-400 rounded px-1 py-0.5 text-sm outline-none ${className}`}
          autoFocus
          min={field === 'quantity' ? 1 : field === 'price' ? 0 : undefined}
        />
      );
    }

    return (
      <span
        className={`cursor-pointer hover:bg-blue-50 px-1 py-0.5 rounded ${className}`}
        onClick={() => setEditingField(field)}
        title="클릭하여 수정"
      >
        {display}
      </span>
    );
  };

  return (
    <div
      ref={node => previewRef(dropRef(node))}
      className={`flex items-center justify-between p-3 bg-gray-50 rounded ${isDragging ? 'opacity-50' : ''}`}
    >
      <div ref={dragRef} className="cursor-move text-gray-400 hover:text-gray-600 p-1 mr-2">
        <GripVertical className="h-4 w-4" />
      </div>
      <div className="flex-1 grid grid-cols-5 gap-4 text-sm">
        {renderField('name', item.name, 'font-medium')}
        <div className="flex gap-1">
          {renderField('quantity', item.quantity.toString())}
          {renderField('spec', item.spec || 'EA')}
        </div>
        {renderField('price', `${item.price.toLocaleString()}원`)}
        <span className="text-gray-600">{(item.quantity * item.price).toLocaleString()}원</span>
        {renderField('note', item.note || '-', 'text-gray-600')}
      </div>
      <Button size="sm" variant="outline" className="ml-2 text-red-500 hover:text-red-700" onClick={() => onRemove(index)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};

const useTotals = (items: Item[], taxOption: 'including' | 'excluding') =>
  useMemo(() => {
    let subtotal = 0;

    items.forEach(item => {
      if (taxOption === 'including') {
        const unitPrice = Math.floor(item.price / 1.1);
        subtotal += unitPrice * item.quantity;
      } else {
        subtotal += item.price * item.quantity;
      }
    });

    const taxAmount = Math.floor(subtotal * 0.1);
    const total = subtotal + taxAmount;

    return { subtotal, taxAmount, total };
  }, [items, taxOption]);

const formatKoreanCurrency = (value: number) => {
  if (value === 0) return '영원정';

  const units = ['', '만', '억', '조', '경'];
  const digits = ['영', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];

  let amount = value;
  let result = '';
  let unitIndex = 0;

  while (amount > 0) {
    const part = amount % 10000;
    if (part > 0) {
      let partStr = '';
      const thousands = Math.floor(part / 1000);
      const hundreds = Math.floor((part % 1000) / 100);
      const tens = Math.floor((part % 100) / 10);
      const ones = part % 10;

      if (thousands > 0) {
        partStr += (thousands === 1 ? '' : digits[thousands]) + '천';
      }
      if (hundreds > 0) {
        partStr += (hundreds === 1 ? '' : digits[hundreds]) + '백';
      }
      if (tens > 0) {
        partStr += (tens === 1 ? '' : digits[tens]) + '십';
      }
      if (ones > 0) {
        partStr += digits[ones];
      }

      result = partStr + units[unitIndex] + result;
    }

    amount = Math.floor(amount / 10000);
    unitIndex++;
  }

  return `${result}원정`;
};

const formatDate = (value: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
};

const formatDateRange = (start: string, end: string, legacy: string) => {
  const startDate = formatDate(start);
  const endDate = formatDate(end);
  const fallback = formatDate(legacy);

  if (startDate && endDate) return `${startDate} ~ ${endDate}`;
  if (startDate) return `${startDate} ~`;
  if (endDate) return `~ ${endDate}`;
  return fallback;
};

export const EstimatePreview: React.FC<EstimatePreviewProps> = ({ accessToken, user, currentEstimateId, onEstimateSaved }) => {
  const { estimate, moveItem, removeItem, updateItem } = useEstimate();
  const documentRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const totals = useTotals(estimate.items, estimate.taxOption);
  const grandTotalText = useMemo(() => formatKoreanCurrency(totals.total), [totals.total]);

  const handleSave = async () => {
    if (!accessToken || !user) {
      toast.error('견적서를 저장하려면 로그인이 필요합니다.');
      return;
    }

    if (!estimate.estimateNumber || !estimate.client.name) {
      toast.error('견적번호와 고객사명을 입력해주세요.');
      return;
    }

    if (estimate.items.length === 0) {
      toast.error('최소 하나 이상의 품목을 추가해주세요.');
      return;
    }

    setIsSaving(true);
    try {
      const isUpdate = Boolean(currentEstimateId);
      const endpoint = isUpdate
        ? `https://${projectId}.supabase.co/functions/v1/make-server-f05748ee/estimates/${currentEstimateId}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-f05748ee/estimates`;

      const response = await fetch(endpoint, {
        method: isUpdate ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(estimate)
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || '견적서 저장에 실패했습니다.');
      }

      if (!isUpdate && result.estimate?.id) {
        onEstimateSaved(result.estimate.id);
      }

      toast.success(isUpdate ? '견적서가 업데이트되었습니다.' : '견적서가 저장되었습니다.');
    } catch (error: any) {
      console.error('Save estimate error', error);
      toast.error(error.message || '견적서 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCapture = async () => {
    if (isCapturing) return;

    try {
      setIsCapturing(true);

      if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
        throw new Error('이 브라우저는 클립보드 복사를 지원하지 않습니다.');
      }

      if (navigator.permissions?.query) {
        const permission = await navigator.permissions.query({ name: 'clipboard-write' as PermissionName });
        if (permission.state === 'denied') {
          throw new Error('클립보드 권한이 거부되었습니다. 브라우저 설정에서 허용으로 변경해주세요.');
        }
      }

      toast('📸 견적서 이미지를 캡쳐하고 있습니다...', { duration: 1000 });

      const { toPng } = await import('html-to-image');
      const element = documentRef.current;
      if (!element) {
        throw new Error('이미지 캡쳐할 요소를 찾을 수 없습니다.');
      }

      const dataUrl = await toPng(element, {
        quality: 1,
        pixelRatio: 3,
        backgroundColor: '#ffffff',
        cacheBust: true,
        style: { margin: '0', padding: '0' }
      });

      const response = await fetch(dataUrl);
      const blob = await response.blob();

      if (!blob || blob.size === 0) {
        throw new Error('이미지 생성에 실패했습니다. 다시 시도해주세요.');
      }

      const clipboardItem = new ClipboardItem({ 'image/png': blob });
      await navigator.clipboard.write([clipboardItem]);

      toast.success('견적서 이미지가 클립보드에 복사되었습니다. 붙여넣기(Ctrl+V 또는 ⌘+V)로 공유하세요.');
    } catch (error: any) {
      console.error('Capture error', error);
      toast.error(error.message || '이미지 캡쳐 중 오류가 발생했습니다.');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleMove = useCallback((from: number, to: number) => moveItem(from, to), [moveItem]);
  const handleRemove = useCallback((index: number) => removeItem(index), [removeItem]);
  const handleUpdate = useCallback((index: number, value: Partial<Item>) => updateItem(index, value), [updateItem]);

  const constructionDate = useMemo(
    () => formatDateRange(estimate.constructionStartDate, estimate.constructionEndDate, estimate.constructionDate),
    [estimate.constructionStartDate, estimate.constructionEndDate, estimate.constructionDate]
  );

  const formattedEstimateDate = useMemo(() => formatDate(estimate.estimateDate), [estimate.estimateDate]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-4">
        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle>📋 견적서 미리보기</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full bg-gray-100 p-4 rounded-lg">
              <div
                ref={documentRef}
                className="bg-white mx-auto shadow-lg"
                style={{
                  width: '794px',
                  minHeight: estimate.items.length <= 8 ? '1123px' : 'auto',
                  maxWidth: '100%',
                  fontSize: '12px',
                  lineHeight: '1.1',
                  fontFamily: 'Arial, sans-serif'
                }}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center">
                      <span className="text-sm mr-2">No.</span>
                      <span className="text-sm">{estimate.estimateNumber}</span>
                    </div>
                    {estimate.supplier.logo && (
                      <img src={estimate.supplier.logo} alt="Company Logo" className="max-w-16 max-h-16 object-contain" />
                    )}
                  </div>

                  <div className="text-center mb-8">
                    <h1 className="text-4xl font-medium tracking-wider">견 적 서</h1>
                  </div>

                  <div className="grid grid-cols-2 gap-8 mb-8">
                    <div className="space-y-2">
                      <div className="text-sm">{formattedEstimateDate}</div>
                      <div className="text-sm">
                        {estimate.client.name}
                        {estimate.client.phone && <span className="ml-2">Tel. {estimate.client.phone}</span>}
                      </div>
                      {estimate.client.email && <div className="text-sm">E-mail: {estimate.client.email}</div>}
                      {estimate.client.address && <div className="text-sm">Address: {estimate.client.address}</div>}
                      {constructionDate && <div className="text-sm">공사 기간: {constructionDate}</div>}
                    </div>

                    <div className="text-right space-y-1 text-sm">
                      <div className="font-semibold text-lg">{estimate.supplier.companyName}</div>
                      <div>대표자 {estimate.supplier.name}</div>
                      <div>사업자등록번호 {estimate.supplier.businessNumber}</div>
                      {estimate.supplier.address && <div>{estimate.supplier.address}</div>}
                      {estimate.supplier.phone && <div>TEL. {estimate.supplier.phone}</div>}
                      {estimate.supplier.fax && <div>FAX. {estimate.supplier.fax}</div>}
                      {estimate.supplier.companyEmail && <div>E-mail. {estimate.supplier.companyEmail}</div>}
                    </div>
                  </div>

                  <div className="mb-6">
                    <div className="text-lg mb-2">귀사의 무궁한 발전을 기원합니다.</div>
                    <div className="text-sm">아래와 같이 견적드립니다.</div>
                  </div>

                  <Table className="border border-black text-sm">
                    <TableHeader>
                      <TableRow className="bg-gray-100">
                        <TableHead className="border border-black text-center">No.</TableHead>
                        <TableHead className="border border-black text-center">품명</TableHead>
                        <TableHead className="border border-black text-center">규격</TableHead>
                        <TableHead className="border border-black text-center">수량</TableHead>
                        <TableHead className="border border-black text-center">단가</TableHead>
                        <TableHead className="border border-black text-center">공급가</TableHead>
                        <TableHead className="border border-black text-center">부가세</TableHead>
                        <TableHead className="border border-black text-center">비고</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {estimate.items.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="border border-black text-center py-8 text-gray-500">
                            품목을 추가해주세요.
                          </TableCell>
                        </TableRow>
                      )}
                      {estimate.items.map((item, idx) => {
                        let itemSubtotal = item.quantity * item.price;
                        let itemTax = Math.floor(itemSubtotal * 0.1);
                        if (estimate.taxOption === 'including') {
                          itemSubtotal = Math.floor(item.price / 1.1) * item.quantity;
                          itemTax = Math.floor(itemSubtotal * 0.1);
                        }

                        return (
                          <TableRow key={`${item.name}-${idx}`}>
                            <TableCell className="border border-black text-center">{idx + 1}</TableCell>
                            <TableCell className="border border-black">{item.name}</TableCell>
                            <TableCell className="border border-black text-center">{item.spec || 'EA'}</TableCell>
                            <TableCell className="border border-black text-center">{item.quantity}</TableCell>
                            <TableCell className="border border-black text-right">{item.price.toLocaleString()}</TableCell>
                            <TableCell className="border border-black text-right">{itemSubtotal.toLocaleString()}</TableCell>
                            <TableCell className="border border-black text-right">{itemTax.toLocaleString()}</TableCell>
                            <TableCell className="border border-black text-center">{item.note || ''}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  <div className="flex justify-end mb-4">
                    <table className="border-collapse border border-black text-sm">
                      <tbody>
                        <tr>
                          <td className="border border-black bg-gray-100 p-2 text-center font-medium">공급가액</td>
                          <td className="border border-black p-2 text-right">{totals.subtotal.toLocaleString()} 원</td>
                        </tr>
                        <tr>
                          <td className="border border-black bg-gray-100 p-2 text-center font-medium">부가세</td>
                          <td className="border border-black p-2 text-right">{totals.taxAmount.toLocaleString()} 원</td>
                        </tr>
                        <tr>
                          <td className="border border-black bg-gray-100 p-2 text-center font-medium">부가세 포함가</td>
                          <td className="border border-black p-2 text-right">{totals.total.toLocaleString()} 원</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="mb-4 text-lg font-medium text-right">합계금액(₩) {totals.total.toLocaleString()} 원</div>
                  <div className="mb-8 text-right text-sm">({grandTotalText})</div>

                  <div className="mt-8">
                    <div className="font-medium mb-2">※ 특이 및 특이사항</div>
                    <div className="text-sm whitespace-pre-line">{estimate.footerNotes}</div>
                  </div>

                  <div className="mt-8 pt-4 border-t border-gray-300">
                    <div className="text-center text-sm">
                      <div className="font-medium mb-1">{estimate.businessFields}</div>
                      <div>
                        E-mail : {estimate.supplier.companyEmail}
                        {estimate.supplier.homepage && <span> / {estimate.supplier.homepage}</span>}
                      </div>
                      {estimate.supplier.address && <div>{estimate.supplier.address}</div>}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex justify-center gap-4">
                <Button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  {isSaving ? '저장 중...' : '견적서 저장'}
                </Button>
                <Button
                  onClick={handleCapture}
                  disabled={isCapturing}
                  variant="outline"
                  className="flex items-center gap-2 bg-green-50 hover:bg-green-100 border-green-300"
                  title="클릭하면 견적서가 이미지로 복사됩니다"
                >
                  <Copy className="h-4 w-4" />
                  {isCapturing ? '이미지 캡쳐 중...' : '📸 이미지 복사'}
                </Button>
              </div>
              <div className="text-center text-xs text-gray-500">
                💡 이미지 복사 후 이메일, 메신저 등에 붙여넣기(Ctrl+V 또는 ⌘+V) 하세요
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>📦 품목 관리</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="grid grid-cols-5 gap-4 text-sm font-medium text-gray-600 px-3">
                <span>품목명</span>
                <span>수량 / 단위</span>
                <span>단가</span>
                <span>금액</span>
                <span>비고</span>
              </div>
              {estimate.items.map((item, index) => (
                <EditableItemRow
                  key={`${item.name}-${index}`}
                  item={item}
                  index={index}
                  onRemove={handleRemove}
                  onMove={handleMove}
                  onUpdate={handleUpdate}
                />
              ))}
              {estimate.items.length === 0 && (
                <div className="text-center text-gray-500 py-8">품목을 추가해주세요</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DndProvider>
  );
};
