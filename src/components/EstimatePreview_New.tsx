import React, { useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Trash2, Save, GripVertical, Copy } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import type { EstimateData, Item } from '../App';

interface EstimatePreviewProps {
  estimateData: EstimateData;
  onRemoveItem: (index: number) => void;
  onMoveItem: (dragIndex: number, hoverIndex: number) => void;
  onUpdateItem: (index: number, updatedItem: Partial<Item>) => void;
  accessToken: string;
  user: any;
  currentEstimateId: string | null;
  onEstimateSaved: (estimateId: string) => void;
}

interface DragItem {
  index: number;
  id: string;
  type: string;
}

// Draggable Item Component
function DraggableItem({ 
  item, 
  index, 
  onRemoveItem, 
  onUpdateItem,
  moveItem 
}: {
  item: Item;
  index: number;
  onRemoveItem: (index: number) => void;
  onUpdateItem: (index: number, updatedItem: Partial<Item>) => void;
  moveItem: (dragIndex: number, hoverIndex: number) => void;
}) {
  const [{ isDragging }, drag, dragPreview] = useDrag({
    type: 'ESTIMATE_ITEM',
    item: { id: `item-${index}`, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'ESTIMATE_ITEM',
    hover(dragItem: DragItem, monitor) {
      if (!monitor.isOver({ shallow: true })) {
        return;
      }

      const dragIndex = dragItem.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) {
        return;
      }

      moveItem(dragIndex, hoverIndex);
      dragItem.index = hoverIndex;
    },
  });

  const [editingField, setEditingField] = React.useState<string | null>(null);
  const [editValues, setEditValues] = React.useState({
    name: item.name,
    quantity: item.quantity.toString(),
    price: item.price.toString(),
    spec: item.spec,
    note: item.note
  });

  const handleFieldClick = (field: string) => {
    setEditingField(field);
  };

  const handleSaveField = (field: keyof typeof editValues) => {
    let value: any = editValues[field];
    
    if (field === 'quantity' || field === 'price') {
      const numValue = parseInt(value);
      if (!isNaN(numValue) && numValue >= 0) {
        // 수량은 1 이상, 가격은 0 이상 허용
        if (field === 'quantity' && numValue === 0) {
          // 수량은 최소 1이어야 함
          setEditValues(prev => ({
            ...prev,
            [field]: item.quantity.toString()
          }));
          setEditingField(null);
          return;
        }
        value = numValue;
      } else {
        // 유효하지 않은 값인 경우 원래 값으로 복원
        setEditValues(prev => ({
          ...prev,
          [field]: field === 'quantity' ? item.quantity.toString() : item.price.toString()
        }));
        setEditingField(null);
        return;
      }
    }

    onUpdateItem(index, { [field]: value });
    setEditingField(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, field: keyof typeof editValues) => {
    if (e.key === 'Enter') {
      handleSaveField(field);
    } else if (e.key === 'Escape') {
      setEditValues(prev => ({
        ...prev,
        [field]: field === 'quantity' ? item.quantity.toString() : 
                field === 'price' ? item.price.toString() : 
                (item as any)[field]
      }));
      setEditingField(null);
    }
  };

  const specOptions = ['EA', 'SET', '개', '식', '품', 'm', 'kg', '시간', '일'];

  const renderEditableField = (field: keyof typeof editValues, displayValue: string, className: string = "") => {
    const isEditing = editingField === field;
    
    if (isEditing) {
      if (field === 'spec') {
        return (
          <select
            value={editValues[field]}
            onChange={(e) => {
              setEditValues(prev => ({ ...prev, [field]: e.target.value }));
              onUpdateItem(index, { [field]: e.target.value });
              setEditingField(null);
            }}
            onBlur={() => setEditingField(null)}
            className={`bg-white border border-blue-400 rounded px-1 py-0.5 text-sm outline-none ${className}`}
            autoFocus
          >
            {specOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );
      }

      return (
        <input
          type={field === 'quantity' || field === 'price' ? 'number' : 'text'}
          value={editValues[field]}
          onChange={(e) => setEditValues(prev => ({ ...prev, [field]: e.target.value }))}
          onBlur={() => handleSaveField(field)}
          onKeyDown={(e) => handleKeyDown(e, field)}
          className={`bg-white border border-blue-400 rounded px-1 py-0.5 text-sm outline-none ${className}`}
          autoFocus
          min={field === 'quantity' ? '1' : field === 'price' ? '0' : undefined}
        />
      );
    }

    return (
      <span 
        className={`cursor-pointer hover:bg-blue-50 px-1 py-0.5 rounded ${className}`}
        onClick={() => handleFieldClick(field)}
        title="클릭하여 수정"
      >
        {displayValue}
      </span>
    );
  };

  return (
    <div
      ref={(node) => dragPreview(drop(node))}
      className={`flex items-center justify-between p-3 bg-gray-50 rounded ${
        isDragging ? 'opacity-50' : 'opacity-100'
      }`}
    >
      <div
        ref={drag}
        className="cursor-move text-gray-400 hover:text-gray-600 p-1 mr-2"
      >
        <GripVertical className="h-4 w-4" />
      </div>
      <div className="flex-1 grid grid-cols-5 gap-4 text-sm">
        {renderEditableField('name', item.name, 'font-medium')}
        <div className="flex gap-1">
          {renderEditableField('quantity', item.quantity.toString())}
          {renderEditableField('spec', item.spec || 'EA')}
        </div>
        {renderEditableField('price', `${item.price.toLocaleString()}원`)}
        <span className="text-gray-600">{((item.quantity || 1) * item.price).toLocaleString()}원</span>
        {renderEditableField('note', item.note || '-', 'text-gray-600')}
      </div>
      <Button
        size="sm"
        variant="outline"
        className="ml-2 text-red-500 hover:text-red-700"
        onClick={() => onRemoveItem(index)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function EstimatePreview({ estimateData, onRemoveItem, onMoveItem, onUpdateItem, accessToken, user, currentEstimateId, onEstimateSaved }: EstimatePreviewProps) {
  const documentRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  // 한국어 숫자 변환
  const numberToKorean = (num: number): string => {
    if (num === 0) return '영원정';
    
    const units = ['', '만', '억', '조', '경'];
    const digits = ['영', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
    
    let result = '';
    let unitIndex = 0;
    
    while (num > 0) {
      const part = num % 10000;
      if (part > 0) {
        let partStr = '';
        
        const thousands = Math.floor(part / 1000);
        const hundreds = Math.floor((part % 1000) / 100);
        const tens = Math.floor((part % 100) / 10);
        const ones = part % 10;
        
        if (thousands > 0) {
          if (thousands === 1) {
            partStr += '천';
          } else {
            partStr += digits[thousands] + '천';
          }
        }
        if (hundreds > 0) {
          if (hundreds === 1) {
            partStr += '백';
          } else {
            partStr += digits[hundreds] + '백';
          }
        }
        if (tens > 0) {
          if (tens === 1) {
            partStr += '십';
          } else {
            partStr += digits[tens] + '십';
          }
        }
        if (ones > 0) {
          partStr += digits[ones];
        }
        
        result = partStr + units[unitIndex] + result;
      }
      
      num = Math.floor(num / 10000);
      unitIndex++;
    }
    
    return result + '원정';
  };

  // 합계 계산
  const calculateTotals = () => {
    let subtotal = 0;
    
    estimateData.items.forEach(item => {
      if (estimateData.taxOption === 'including') {
        const unitPrice = Math.floor(item.price / 1.1);
        subtotal += unitPrice * item.quantity;
      } else {
        subtotal += item.price * item.quantity;
      }
    });
    
    const taxAmount = Math.floor(subtotal * 0.1);
    const total = subtotal + taxAmount;
    
    return { subtotal, taxAmount, total };
  };

  const { subtotal, taxAmount, total } = calculateTotals();

  const captureAndCopyImage = async () => {
    if (isCapturing) return;
    
    try {
      setIsCapturing(true);
      
      // 1단계: 브라우저 지원 확인
      if (!navigator.clipboard || !ClipboardItem) {
        throw new Error('이 브라우저는 클립보드 복사를 지원하지 않습니다.\n\n지원 브라우저:\n• Chrome 76+\n• Edge 79+\n• Safari 13.1+\n• Firefox 87+');
      }

      // 2단계: 클립보드 권한 확인 및 요청
      try {
        // Permissions API로 권한 상태 확인
        if (navigator.permissions && navigator.permissions.query) {
          const permissionStatus = await navigator.permissions.query({ 
            name: 'clipboard-write' as PermissionName 
          });
          
          if (permissionStatus.state === 'denied') {
            throw new Error('클립보드 권한이 거부되었습니다.\n\n해결방법:\n1. 브라우저 주소창 왼쪽의 자물쇠 아이콘 클릭\n2. "클립보드" 권한을 "허용"으로 변경\n3. 페이지 새로고침 후 다시 시도');
          }
        }
      } catch (permError) {
        // 권한 API를 지원하지 않는 브라우저는 그냥 진행
        console.log('Permissions API not supported, proceeding anyway');
      }

      toast('📸 견적서 이미지를 캡쳐하고 있습니다...', { duration: 1000 });
      
      // 3단계: 이미지 캡쳐
      const { toPng } = await import('html-to-image');
      
      const element = documentRef.current;
      if (!element) {
        throw new Error('이미지 캡쳐할 요소를 찾을 수 없습니다.');
      }

      // 화면 그대로 캡쳐
      const dataUrl = await toPng(element, {
        quality: 1.0,
        pixelRatio: 3, // 고해상도
        backgroundColor: '#ffffff',
        cacheBust: true,
        style: {
          margin: '0',
          padding: '0'
        }
      });

      // 4단계: Data URL을 Blob으로 변환
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      if (blob.size === 0) {
        throw new Error('이미지 생성에 실패했습니다. 다시 시도해주세요.');
      }

      // 5단계: 클립보드에 복사 (사용자 제스처 컨텍스트 내에서 실행)
      const item = new ClipboardItem({ 'image/png': blob });
      await navigator.clipboard.write([item]);
      
      // 성공!
      toast.success(`✅ 견적서 이미지가 클립보드에 복사되었습니다!\n\n📋 이제 다른 곳에 붙여넣기 할 수 있습니다:\n• Windows: Ctrl + V\n• Mac: ⌘ + V`, {
        duration: 4000
      });

    } catch (error: any) {
      console.error('이미지 캡쳐 오류:', error);
      
      // 에러 메시지 개선
      let errorMessage = '이미지 캡쳐에 실패했습니다.';
      let errorDetails = '';
      
      if (error.message.includes('브라우저') || error.message.includes('지원')) {
        errorMessage = error.message;
      } else if (error.message.includes('클립보드 권한')) {
        errorMessage = error.message;
      } else if (error.name === 'NotAllowedError') {
        errorMessage = '❌ 클립보드 접근 권한이 필요합니다';
        errorDetails = '\n\n해결방법:\n1. 브라우저 주소창의 자물쇠 🔒 아이콘 클릭\n2. "사이트 설정" 선택\n3. "클립보드" 권한을 "허용"으로 변경\n4. 페이지를 새로고침하고 다시 시도';
      } else if (error.name === 'SecurityError') {
        errorMessage = '❌ 보안 오류';
        errorDetails = '\n\nHTTPS 연결에서만 클립보드 복사가 가능합니다.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage + errorDetails, {
        duration: 8000
      });
    } finally {
      setIsCapturing(false);
    }
  };

  const saveEstimate = async () => {
    if (!accessToken || !user) {
      toast.error('견적서를 저장하려면 로그인이 필요합니다.');
      return;
    }

    if (!estimateData.estimateNumber || (!estimateData.client.name && !estimateData.clientName)) {
      toast.error('견적번호와 고객사명을 입력해주세요.');
      return;
    }

    if (estimateData.items.length === 0) {
      toast.error('최소 하나 이상의 품목을 추가해주세요.');
      return;
    }

    setIsSaving(true);
    try {
      // 기존 견적서를 불러온 경우 업데이트, 그렇지 않으면 새로 생성
      const isUpdate = currentEstimateId !== null;
      const url = isUpdate
        ? `https://${projectId}.supabase.co/functions/v1/make-server-f05748ee/estimates/${currentEstimateId}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-f05748ee/estimates`;
      
      const response = await fetch(url, {
        method: isUpdate ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(estimateData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '견적서 저장에 실패했습니다.');
      }

      // 새로 생성된 경우 ID 저장
      if (!isUpdate && result.estimate?.id) {
        onEstimateSaved(result.estimate.id);
      }

      toast.success(isUpdate ? '견적서가 업데이트되었습니다.' : '견적서가 저장되었습니다.');
    } catch (error: any) {
      console.error('Save estimate error:', error);
      toast.error(error.message || '견적서 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const moveItem = useCallback((dragIndex: number, hoverIndex: number) => {
    onMoveItem(dragIndex, hoverIndex);
  }, [onMoveItem]);

  // Format estimate date
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  // Format construction date range
  const formatConstructionDateRange = () => {
    const startDate = formatDate(estimateData.constructionStartDate);
    const endDate = formatDate(estimateData.constructionEndDate);
    const legacyDate = formatDate(estimateData.constructionDate);
    
    if (startDate && endDate) {
      return `${startDate} ~ ${endDate}`;
    } else if (startDate) {
      return `${startDate} ~`;
    } else if (endDate) {
      return `~ ${endDate}`;
    } else if (legacyDate) {
      return legacyDate;
    }
    return '';
  };

  const currentDate = formatDate(estimateData.estimateDate);
  const constructionDateFormatted = formatConstructionDateRange();

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-4">
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle>📋 견적서 미리보기</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* A4 크기 고정 컨테이너 */}
          <div className="w-full bg-gray-100 p-4 rounded-lg">
            <div 
              ref={documentRef} 
              className="bg-white mx-auto shadow-lg"
              style={{
                width: '794px',
                minHeight: estimateData.items.length <= 8 ? '1123px' : 'auto',
                maxWidth: '100%',
                fontSize: '12px',
                lineHeight: '1.1',
                fontFamily: 'Arial, sans-serif'
              }}
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center">
                    <span className="text-sm mr-2">No.</span>
                    <span className="text-sm">{estimateData.estimateNumber}</span>
                  </div>
                  {estimateData.supplier.logo && (
                    <img 
                      src={estimateData.supplier.logo} 
                      alt="Company Logo" 
                      className="max-w-16 max-h-16 object-contain"
                    />
                  )}
                </div>
                
                {/* Title */}
                <div className="text-center mb-8">
                  <h1 className="text-4xl font-medium tracking-wider">견 적 서</h1>
                </div>

                {/* Client and Supplier Info */}
                <div className="grid grid-cols-2 gap-8 mb-8">
                  {/* Left: Client Info */}
                  <div>
                    <div className="mb-4 text-sm">{currentDate}</div>
                    <div className="border border-black p-4 mb-4">
                      <div className="mb-3 text-base">
                        <strong>{estimateData.client.name || estimateData.clientName}</strong> 귀하
                      </div>
                      <div className="space-y-1 text-sm">
                        <div>TEL: {estimateData.client.phone || estimateData.clientPhone}</div>
                        <div>E-mail: {estimateData.client.email || estimateData.clientEmail}</div>
                        {estimateData.client.address && <div>주소: {estimateData.client.address}</div>}
                      </div>
                    </div>
                    <div className="text-sm">
                      {estimateData.supplier.companyName}을(를) 이용해주셔서 감사합니다.
                    </div>
                    {constructionDateFormatted && (
                      <div className="text-sm mt-2">
                        <strong>예상 공사일:</strong> {constructionDateFormatted}
                      </div>
                    )}
                  </div>

                  {/* Right: Supplier Info */}
                  <div>
                    <table className="w-full border-collapse border border-black text-sm">
                      <tbody>
                        <tr>
                          <td className="border border-black bg-gray-100 p-2 text-center font-medium">사업자등록번호</td>
                          <td className="border border-black p-2" colSpan={3}>{estimateData.supplier.businessNumber}</td>
                        </tr>
                        <tr>
                          <td className="border border-black bg-gray-100 p-2 text-center font-medium">상호</td>
                          <td className="border border-black p-2" colSpan={3}>{estimateData.supplier.companyName}</td>
                        </tr>
                        <tr>
                          <td className="border border-black bg-gray-100 p-2 text-center font-medium">주소</td>
                          <td className="border border-black p-2" colSpan={3}>{estimateData.supplier.address}</td>
                        </tr>
                        <tr>
                          <td className="border border-black bg-gray-100 p-2 text-center font-medium">업태</td>
                          <td className="border border-black p-2">{estimateData.supplier.businessType}</td>
                          <td className="border border-black bg-gray-100 p-2 text-center font-medium">종목</td>
                          <td className="border border-black p-2">{estimateData.supplier.businessItem}</td>
                        </tr>
                        <tr>
                          <td className="border border-black bg-gray-100 p-2 text-center font-medium">TEL</td>
                          <td className="border border-black p-2">{estimateData.supplier.phone}</td>
                          <td className="border border-black bg-gray-100 p-2 text-center font-medium">FAX</td>
                          <td className="border border-black p-2">{estimateData.supplier.fax}</td>
                        </tr>
                        <tr>
                          <td className="border border-black bg-gray-100 p-2 text-center font-medium">E-mail</td>
                          <td className="border border-black p-2" colSpan={3}>{estimateData.supplier.companyEmail}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Total Amount Highlight Box */}
                <div className="mt-8 mb-4">
                  <div className="w-full border-2 border-black p-4 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="text-center flex-1">
                        <div className="text-base font-medium mb-2">총 견적금액:</div>
                        <div className="text-lg font-bold mb-3">
                          {numberToKorean(total)} <span className="text-red-600">(￦ {total.toLocaleString()})</span>
                        </div>
                        {estimateData.supplier.accountNumber && (
                          <div className="text-sm text-gray-600">
                            <strong>계좌번호:</strong> {estimateData.supplier.accountNumber}
                          </div>
                        )}
                      </div>
                      <div className="text-sm">

                      </div>
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <table className="w-full border-collapse border border-black text-sm mb-6">
                  <thead>
                    <tr>
                      <th className="border border-black bg-gray-100 p-2 text-center">번호</th>
                      <th className="border border-black bg-gray-100 p-2 text-center">품목</th>
                      <th className="border border-black bg-gray-100 p-2 text-center">규격</th>
                      <th className="border border-black bg-gray-100 p-2 text-center">수량</th>
                      <th className="border border-black bg-gray-100 p-2 text-center">단가</th>
                      <th className="border border-black bg-gray-100 p-2 text-center">금액</th>
                      <th className="border border-black bg-gray-100 p-2 text-center">부가세</th>
                      <th className="border border-black bg-gray-100 p-2 text-center">비고</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estimateData.items.map((item, index) => {
                      let itemSubtotal, itemTax;
                      
                      if (estimateData.taxOption === 'including') {
                        // 부가세 포함 가격에서 공급가액과 부가세 분리
                        itemSubtotal = Math.floor((item.quantity * item.price) / 1.1);
                        itemTax = (item.quantity * item.price) - itemSubtotal;
                      } else {
                        // 부가세 별도인 경우
                        itemSubtotal = item.quantity * item.price;
                        itemTax = Math.floor(itemSubtotal * 0.1);
                      }
                      
                      return (
                        <tr key={index}>
                          <td className="border border-black p-2 text-center">{index + 1}</td>
                          <td className="border border-black p-2">{item.name}</td>
                          <td className="border border-black p-2 text-center">{item.spec || 'EA'}</td>
                          <td className="border border-black p-2 text-center">{item.quantity}</td>
                          <td className="border border-black p-2 text-right">{item.price.toLocaleString()}</td>
                          <td className="border border-black p-2 text-right">{itemSubtotal.toLocaleString()}</td>
                          <td className="border border-black p-2 text-right">{itemTax.toLocaleString()}</td>
                          <td className="border border-black p-2 text-center">{item.note || ''}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Breakdown Table - Right aligned */}
                <div className="flex justify-end mb-4">
                  <table className="border-collapse border border-black text-sm">
                    <tbody>
                      <tr>
                        <td className="border border-black bg-gray-100 p-2 text-center font-medium">공급가액</td>
                        <td className="border border-black p-2 text-right">{subtotal.toLocaleString()} 원</td>
                      </tr>
                      <tr>
                        <td className="border border-black bg-gray-100 p-2 text-center font-medium">부가세</td>
                        <td className="border border-black p-2 text-right">{taxAmount.toLocaleString()} 원</td>
                      </tr>
                      <tr>
                        <td className="border border-black bg-gray-100 p-2 text-center font-medium">부가세 포함가</td>
                        <td className="border border-black p-2 text-right">{total.toLocaleString()} 원</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Special Notes Section */}
                <div className="mt-8">
                  <div className="font-medium mb-2">※ 특이 및 특이사항</div>
                  <div className="text-sm whitespace-pre-line">
                    {estimateData.supplier.footerNotes || estimateData.footerNotes}
                  </div>
                </div>

                {/* Company Information Footer */}
                <div className="mt-8 pt-4 border-t border-gray-300">
                  <div className="text-center text-sm">
                    <div className="font-medium mb-1">{estimateData.supplier.businessFields}</div>
                    <div>E-mail : {estimateData.supplier.companyEmail} / {estimateData.supplier.homepage}</div>
                    <div>{estimateData.supplier.address}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-4 space-y-3">
            <div className="flex justify-center gap-4">
              <Button
                onClick={saveEstimate}
                disabled={isSaving}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {isSaving ? '저장 중...' : '견적서 저장'}
              </Button>
              <Button
                onClick={captureAndCopyImage}
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
              💡 이미지 복사 후 이메일, 메신저 등에 붙여넣기(Ctrl+V) 하세요
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Management */}
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
            {estimateData.items.map((item, index) => (
              <DraggableItem
                key={index}
                item={item}
                index={index}
                onRemoveItem={onRemoveItem}
                onUpdateItem={onUpdateItem}
                moveItem={moveItem}
              />
            ))}
            {estimateData.items.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                품목을 추가해주세요
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      </div>
    </DndProvider>
  );
}