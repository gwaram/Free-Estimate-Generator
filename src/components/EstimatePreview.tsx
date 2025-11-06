import React, { useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Trash2, Save, GripVertical, Copy, FileDown, Download } from 'lucide-react';
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
      if (!isNaN(numValue) && numValue > 0) {
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
          min={field === 'quantity' || field === 'price' ? '1' : undefined}
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

export function EstimatePreview({ estimateData, onRemoveItem, onMoveItem, onUpdateItem, accessToken, user }: EstimatePreviewProps) {
  const documentRef = useRef<HTMLDivElement>(null);
  const [isExportingPDF, setIsExportingPDF] = React.useState(false);
  const [isExportingJPG, setIsExportingJPG] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  // 한국어 숫자 변환
  const numberToKorean = (num: number): string => {
    if (num === 0) return '영원정';
    
    const units = ['', '만', '억', '조'];
    const digits = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
    
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
          partStr += (thousands === 1 ? '' : digits[thousands]) + '천';
        }
        if (hundreds > 0) {
          partStr += (hundreds === 1 ? '' : digits[hundreds]) + '백';
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

  const exportToPDF = async () => {
    if (isExportingPDF) return;
    
    try {
      setIsExportingPDF(true);
      toast('PDF 생성 중입니다...', { duration: 1000 });
      
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;
      
      const element = documentRef.current;
      if (!element) {
        throw new Error('PDF 생성할 요소를 찾을 수 없습니다.');
      }

      // 더 안정적인 캔버스 생성 옵션
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        removeContainer: true,
        foreignObjectRendering: false,
        imageTimeout: 15000,
        ignoreElements: (element) => {
          // 문제가 될 수 있는 요소들 무시
          return element.classList.contains('no-export') || 
                 element.tagName === 'SCRIPT' ||
                 element.tagName === 'STYLE';
        },
        onclone: (clonedDoc) => {
          // 클론된 문서에 인라인 스타일 적용 - oklch 색상 함수 문제 해결
          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            * {
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
              print-color-adjust: exact !important;
              color: #000000 !important;
              background-color: #ffffff !important;
              border-color: #000000 !important;
            }
            body, div, span, p, h1, h2, h3, h4, h5, h6, table, tr, td, th {
              font-family: Arial, sans-serif !important;
              color: #000000 !important;
              background-color: #ffffff !important;
            }
            table {
              border-collapse: collapse !important;
              background-color: #ffffff !important;
            }
            th, td {
              border: 1px solid #000000 !important;
              background-color: #ffffff !important;
              color: #000000 !important;
            }
            .bg-gray-100, .bg-gray-50, th {
              background-color: #f3f4f6 !important;
              color: #000000 !important;
            }
            .text-red-600, .font-bold.text-red-600 {
              color: #dc2626 !important;
            }
            .border-black {
              border-color: #000000 !important;
            }
            .border {
              border-color: #000000 !important;
            }
            .text-center, .text-left, .text-right {
              color: #000000 !important;
            }
            .font-medium, .font-bold {
              color: #000000 !important;
            }
            /* CSS 변수 오버라이드 */
            :root {
              --background: #ffffff !important;
              --foreground: #000000 !important;
              --card: #ffffff !important;
              --card-foreground: #000000 !important;
              --border: #000000 !important;
              --muted: #f3f4f6 !important;
              --muted-foreground: #6b7280 !important;
            }
          `;
          clonedDoc.head.appendChild(style);
          
          // 모든 요소에 명시적 스타일 적용
          const allElements = clonedDoc.querySelectorAll('*');
          allElements.forEach(el => {
            if (el instanceof HTMLElement) {
              el.style.color = '#000000';
              el.style.backgroundColor = el.classList.contains('bg-gray-100') || el.tagName === 'TH' ? '#f3f4f6' : '#ffffff';
              if (el.classList.contains('text-red-600')) {
                el.style.color = '#dc2626';
              }
              if (el.tagName === 'TABLE' || el.tagName === 'TD' || el.tagName === 'TH') {
                el.style.borderColor = '#000000';
              }
            }
          });
        }
      });

      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error('캔버스 생성에 실패했습니다. 빈 이미지입니다.');
      }

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = 210;
      const pdfHeight = 297;
      const imgWidth = 190; // 양쪽 10mm 여백
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pageHeight = 270; // 여백을 고려한 페이지 높이
      
      let yPosition = 0;
      let pageNumber = 1;
      
      // 첫 번째 페이지 처리
      const sourceHeight = Math.min(pageHeight, imgHeight);
      
      if (imgHeight <= pageHeight) {
        // 한 페이지에 모든 내용이 들어가는 경우
        const imgData = canvas.toDataURL('image/png', 1.0);
        pdf.addImage(imgData, 'PNG', 10, 15, imgWidth, sourceHeight);
      } else {
        // 여러 페이지가 필요한 경우
        while (yPosition < imgHeight) {
          if (pageNumber > 1) {
            pdf.addPage();
          }
          
          const currentPageHeight = Math.min(pageHeight, imgHeight - yPosition);
          
          // 임시 캔버스 생성하여 페이지별로 자르기
          const pageCanvas = document.createElement('canvas');
          const ctx = pageCanvas.getContext('2d');
          
          if (!ctx) {
            throw new Error('캔버스 컨텍스트를 생성할 수 없습니다.');
          }
          
          const scaleFactor = canvas.width / imgWidth;
          pageCanvas.width = canvas.width;
          pageCanvas.height = currentPageHeight * scaleFactor;
          
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          
          ctx.drawImage(
            canvas,
            0, yPosition * scaleFactor,
            canvas.width, currentPageHeight * scaleFactor,
            0, 0,
            canvas.width, currentPageHeight * scaleFactor
          );
          
          const pageImgData = pageCanvas.toDataURL('image/png', 1.0);
          pdf.addImage(pageImgData, 'PNG', 10, 15, imgWidth, currentPageHeight);
          
          yPosition += pageHeight;
          pageNumber++;
        }
      }
      
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const fileName = `견적서_${estimateData.estimateNumber}_${dateStr}.pdf`;
      
      pdf.save(fileName);
      
      toast.success(`PDF가 생성되었습니다! (${pageNumber}페이지)`);

    } catch (error: any) {
      console.error('PDF 생성 오류:', error);
      toast.error(`PDF 생성 실패: ${error.message || '알 수 없는 오류'}`);
    } finally {
      setIsExportingPDF(false);
    }
  };

  const copyToClipboard = async () => {
    if (isExportingJPG) return;
    
    try {
      setIsExportingJPG(true);
      toast('이미지 생성 중입니다...', { duration: 1000 });
      
      const html2canvas = (await import('html2canvas')).default;
      
      const element = documentRef.current;
      if (!element) {
        throw new Error('이미지 생성할 요소를 찾을 수 없습니다.');
      }

      // 더 안정적인 이미지 캡처 설정
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        removeContainer: true,
        foreignObjectRendering: false,
        imageTimeout: 15000,
        ignoreElements: (element) => {
          // 문제가 될 수 있는 요소들 무시
          return element.classList.contains('no-export') || 
                 element.tagName === 'SCRIPT' ||
                 element.tagName === 'STYLE';
        },
        onclone: (clonedDoc) => {
          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            * {
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
              print-color-adjust: exact !important;
              color: #000000 !important;
              background-color: #ffffff !important;
              border-color: #000000 !important;
            }
            body, div, span, p, h1, h2, h3, h4, h5, h6, table, tr, td, th {
              font-family: Arial, sans-serif !important;
              color: #000000 !important;
              background-color: #ffffff !important;
            }
            table {
              border-collapse: collapse !important;
              background-color: #ffffff !important;
            }
            th, td {
              border: 1px solid #000000 !important;
              background-color: #ffffff !important;
              color: #000000 !important;
            }
            .bg-gray-100, .bg-gray-50, th {
              background-color: #f3f4f6 !important;
              color: #000000 !important;
            }
            .text-red-600, .font-bold.text-red-600 {
              color: #dc2626 !important;
            }
            .border-black {
              border-color: #000000 !important;
            }
            .border {
              border-color: #000000 !important;
            }
            .text-center, .text-left, .text-right {
              color: #000000 !important;
            }
            .font-medium, .font-bold {
              color: #000000 !important;
            }
            /* CSS 변수 오버라이드 */
            :root {
              --background: #ffffff !important;
              --foreground: #000000 !important;
              --card: #ffffff !important;
              --card-foreground: #000000 !important;
              --border: #000000 !important;
              --muted: #f3f4f6 !important;
              --muted-foreground: #6b7280 !important;
            }
          `;
          clonedDoc.head.appendChild(style);
          
          // 모든 요소에 명시적 스타일 적용
          const allElements = clonedDoc.querySelectorAll('*');
          allElements.forEach(el => {
            if (el instanceof HTMLElement) {
              el.style.color = '#000000';
              el.style.backgroundColor = el.classList.contains('bg-gray-100') || el.tagName === 'TH' ? '#f3f4f6' : '#ffffff';
              if (el.classList.contains('text-red-600')) {
                el.style.color = '#dc2626';
              }
              if (el.tagName === 'TABLE' || el.tagName === 'TD' || el.tagName === 'TH') {
                el.style.borderColor = '#000000';
              }
            }
          });
        }
      });

      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error('캔버스 생성에 실패했습니다. 빈 이미지입니다.');
      }

      // Promise 기반으로 Blob 생성
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('이미지 Blob 생성에 실패했습니다.'));
          }
        }, 'image/png', 1.0);
      });

      // 클립보드 API 지원 확인
      if (navigator.clipboard && navigator.clipboard.write) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({
              'image/png': blob
            })
          ]);
          
          toast.success(`견적서 이미지가 클립보드에 복사되었습니다!\n크기: ${canvas.width} × ${canvas.height}px`);
          return;
        } catch (clipboardError) {
          console.warn('클립보드 복사 실패, 다운���드로 대체:', clipboardError);
        }
      }
      
      // 클립보드 복사가 실패하거나 지원되지 않을 경우 다운로드
      const link = document.createElement('a');
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      
      link.download = `견적서_${estimateData.estimateNumber}_${dateStr}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      
      // 임시로 DOM에 추가하여 클릭
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('견적서 이미지가 다운로드되었습니다!');

    } catch (error: any) {
      console.error('이미지 생성 오류:', error);
      toast.error(`이미지 생성 실패: ${error.message || '알 수 없는 오류'}`);
    } finally {
      setIsExportingJPG(false);
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
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-f05748ee/estimates`, {
        method: 'POST',
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

      toast.success('견적서가 저장되었습니다.');

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
    
    // 새로운 날짜 범위가 있으면 사용, 없으면 기존 단일 날짜 사용
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
                width: '794px', // A4 width at 96 DPI
                minHeight: estimateData.items.length <= 8 ? '1123px' : 'auto', // 8개 이하는 A4 고정, 초과시 자동
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
                          <td className="border border-black p-2">{estimateData.supplier.fax || '-'}</td>
                        </tr>
                        <tr>
                          <td className="border border-black bg-gray-100 p-2 text-center font-medium">E-mail</td>
                          <td className="border border-black p-2" colSpan={3}>{estimateData.supplier.companyEmail}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Total Amount Section */}
                <div className="text-center border border-black mb-8 py-4">
                  <div className="mb-2">
                    <span className="text-xl font-medium">총 견적금액:</span>
                  </div>
                  <div className="mb-2">
                    <span className="text-lg mr-4">{numberToKorean(total)}</span>
                    <span className="text-2xl font-bold text-red-600">(￦ {total.toLocaleString()})</span>
                  </div>
                  <div className="flex justify-center items-center gap-8 text-sm">
                    <div>
                      ● 위 총 견적금액은 부가세(VAT) 포함된 가격입니다.
                    </div>
                    {estimateData.supplier.accountNumber && (
                      <div>
                        <strong>계좌번호:</strong> {estimateData.supplier.accountNumber}
                      </div>
                    )}
                  </div>
                </div>

                {/* Items Table */}
                <table className="w-full border-collapse border border-black mb-6 text-sm">
                  <thead>
                    <tr>
                      <th className="border border-black bg-gray-100 p-2 text-center w-12">번호</th>
                      <th className="border border-black bg-gray-100 p-2 text-center">품명</th>
                      <th className="border border-black bg-gray-100 p-2 text-center w-20">규격</th>
                      <th className="border border-black bg-gray-100 p-2 text-center w-16">수량</th>
                      <th className="border border-black bg-gray-100 p-2 text-center w-24">단가</th>
                      <th className="border border-black bg-gray-100 p-2 text-center w-24">금액</th>
                      <th className="border border-black bg-gray-100 p-2 text-center w-24">부가세</th>
                      <th className="border border-black bg-gray-100 p-2 text-center w-20">비고</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estimateData.items.map((item, index) => {
                      let unitPrice, totalPrice, taxAmount;
                      if (estimateData.taxOption === 'including') {
                        // 부가세 포함 가격에서 단가와 부가세 분리
                        unitPrice = Math.floor(item.price / 1.1);
                        totalPrice = unitPrice * item.quantity;
                        taxAmount = (item.price - unitPrice) * item.quantity;
                      } else {
                        // 부가세 제외 가격에서 부가세 계산
                        unitPrice = item.price;
                        totalPrice = unitPrice * item.quantity;
                        taxAmount = Math.floor(totalPrice * 0.1);
                      }

                      return (
                        <tr key={index}>
                          <td className="border border-black p-2 text-center">{index + 1}</td>
                          <td className="border border-black p-2 text-left">{item.name}</td>
                          <td className="border border-black p-2 text-center">{item.spec}</td>
                          <td className="border border-black p-2 text-center">{item.quantity}</td>
                          <td className="border border-black p-2 text-right">{unitPrice.toLocaleString()}</td>
                          <td className="border border-black p-2 text-right">{totalPrice.toLocaleString()} 원</td>
                          <td className="border border-black p-2 text-right">{taxAmount.toLocaleString()} 원</td>
                          <td className="border border-black p-2 text-center text-xs">{item.note || ''}</td>
                        </tr>
                      );
                    })}
                    {/* Empty rows - 8개 이하는 9행까지 보장, 9개 이상은 빈 행 추가 안함 */}
                    {estimateData.items.length <= 8 && Array(Math.max(0, 9 - estimateData.items.length)).fill(null).map((_, index) => (
                      <tr key={`empty-${index}`}>
                        <td className="border border-black p-2 h-5"></td>
                        <td className="border border-black p-2"></td>
                        <td className="border border-black p-2"></td>
                        <td className="border border-black p-2"></td>
                        <td className="border border-black p-2"></td>
                        <td className="border border-black p-2 text-right">- 원</td>
                        <td className="border border-black p-2 text-right">- 원</td>
                        <td className="border border-black p-2"></td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Summary Table */}
                <div className="flex justify-end mb-8">
                  <table className="border-collapse border border-black text-sm w-80">
                    <tbody>
                      <tr>
                        <td className="border border-black bg-gray-100 p-2 text-center font-medium">공급가액</td>
                        <td className="border border-black p-2 text-right">{subtotal.toLocaleString()} 원</td>
                      </tr>
                      <tr>
                        <td className="border border-black bg-gray-100 p-2 text-center font-medium">부가세액</td>
                        <td className="border border-black p-2 text-right">{taxAmount.toLocaleString()} 원</td>
                      </tr>
                      <tr>
                        <td className="border border-black bg-gray-100 p-2 text-center font-medium">총계</td>
                        <td className="border border-black p-2 text-right font-bold text-red-600">{total.toLocaleString()} 원</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Business Fields */}
                <div className="mb-6 p-4 border border-gray-300 rounded">
                  <div className="font-medium mb-2">사업분야:</div>
                  <div className="text-sm">{estimateData.supplier.businessFields || estimateData.businessFields}</div>
                </div>

                {/* Footer Notes */}
                <div className="border-t border-gray-300 pt-4">
                  <div className="font-medium mb-2">특이사항:</div>
                  <div className="text-sm whitespace-pre-line">
                    {estimateData.supplier.footerNotes || estimateData.footerNotes}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3 flex-wrap">
            <Button
              onClick={exportToPDF}
              disabled={isExportingPDF}
              className="flex-1 min-w-[140px]"
            >
              <FileDown className="w-4 h-4 mr-2" />
              {isExportingPDF ? 'PDF 생성 중...' : 'PDF 다운로드'}
            </Button>
            
            <Button
              onClick={copyToClipboard}
              disabled={isExportingJPG}
              variant="outline"
              className="flex-1 min-w-[140px]"
            >
              <Copy className="w-4 h-4 mr-2" />
              {isExportingJPG ? '이미지 생성 중...' : '이미지 복사'}
            </Button>
            
            {user && (
              <Button
                onClick={saveEstimate}
                disabled={isSaving}
                variant="outline"
                className="flex-1 min-w-[140px]"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? '저장 중...' : '견적서 저장'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Items List */}
      {estimateData.items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>품목 목록 관리</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {estimateData.items.map((item, index) => (
              <DraggableItem
                key={`${item.name}-${index}`}
                item={item}
                index={index}
                onRemoveItem={onRemoveItem}
                onUpdateItem={onUpdateItem}
                moveItem={moveItem}
              />
            ))}
          </CardContent>
        </Card>
      )}
      </div>
    </DndProvider>
  );
}