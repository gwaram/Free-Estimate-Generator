import React, { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { ItemTemplateManager } from './ItemTemplateManager';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { GripVertical, Trash2 } from 'lucide-react';
import type { EstimateData, Supplier, Client, Item } from '../App';

interface EstimateFormProps {
  estimateData: EstimateData;
  onUpdateEstimateData: (field: keyof EstimateData, value: any) => void;
  onUpdateSupplier: (supplier: Partial<Supplier>) => void;
  onUpdateClient: (client: Partial<Client>) => void;
  accessToken: string;
  user: any;
}

interface ItemInput {
  id: string;
  name: string;
  quantity: string;
  price: string;
  spec: string;
  note: string;
}

interface DragItem {
  index: number;
  id: string;
  type: string;
}

// Draggable Item Row Component
function DraggableItemRow({ 
  input, 
  index, 
  updateItemInput, 
  removeItemInput, 
  moveItem 
}: {
  input: ItemInput;
  index: number;
  updateItemInput: (index: number, field: keyof ItemInput, value: string) => void;
  removeItemInput: (index: number) => void;
  moveItem: (dragIndex: number, hoverIndex: number) => void;
}) {
  const [{ isDragging }, drag, dragPreview] = useDrag({
    type: 'ITEM_ROW',
    item: { id: input.id, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'ITEM_ROW',
    hover(item: DragItem, monitor) {
      if (!monitor.isOver({ shallow: true })) {
        return;
      }

      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) {
        return;
      }

      moveItem(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  const specOptions = ['EA', 'SET', '개', '식', '품', 'm', 'kg', '시간', '일'];

  return (
    <div
      ref={(node) => dragPreview(drop(node))}
      className={`border border-gray-200 rounded-lg p-3 space-y-3 ${
        isDragging ? 'opacity-50' : 'opacity-100'
      }`}
    >
      {/* 1행: 드래그 핸들 + 품목명 + 삭제 버튼 */}
      <div className="flex items-center gap-2">
        <div
          ref={drag}
          className="cursor-move text-gray-400 hover:text-gray-600 p-1"
        >
          <GripVertical className="h-4 w-4" />
        </div>
        
        <Input
          placeholder="품목명"
          value={input.name}
          onChange={(e) => updateItemInput(index, 'name', e.target.value)}
          className="flex-1"
        />
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => removeItemInput(index)}
          className="text-red-500 hover:text-red-700"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* 2행: 수량 + 단가 + 단위 */}
      <div className="grid grid-cols-3 gap-2">
        <Input
          type="number"
          placeholder="수량"
          value={input.quantity}
          onChange={(e) => updateItemInput(index, 'quantity', e.target.value)}
          min="1"
        />
        
        <Input
          type="number"
          placeholder="단가"
          value={input.price}
          onChange={(e) => updateItemInput(index, 'price', e.target.value)}
          min="0"
        />
        
        <Select
          value={input.spec}
          onValueChange={(value) => updateItemInput(index, 'spec', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="단위" />
          </SelectTrigger>
          <SelectContent>
            {specOptions.map((spec) => (
              <SelectItem key={spec} value={spec}>
                {spec}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 3행: 비고 */}
      <div>
        <Input
          placeholder="비고"
          value={input.note}
          onChange={(e) => updateItemInput(index, 'note', e.target.value)}
        />
      </div>
    </div>
  );
}

export function EstimateForm({ estimateData, onUpdateEstimateData, onUpdateSupplier, onUpdateClient, accessToken, user }: EstimateFormProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [loadedSupplierName, setLoadedSupplierName] = useState<string | null>(null);
  const [loadedClientName, setLoadedClientName] = useState<string | null>(null);
  const [itemIdCounter, setItemIdCounter] = useState(0);
  const [itemInputs, setItemInputs] = useState<ItemInput[]>([
    { 
      id: `item-0`,
      name: '', 
      quantity: '', 
      price: '', 
      spec: 'EA', 
      note: '' 
    }
  ]);

  // 고유한 ID 생성 함수
  const generateItemId = useCallback(() => {
    const newId = itemIdCounter;
    setItemIdCounter(prev => prev + 1);
    return `item-${newId}`;
  }, [itemIdCounter]);

  // Load suppliers from backend
  const fetchSuppliers = async () => {
    if (!accessToken) return;
    
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-f05748ee/suppliers`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setSuppliers(result.suppliers || []);
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  // Load clients from backend
  const fetchClients = async () => {
    if (!accessToken) return;
    
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-f05748ee/clients`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setClients(result.clients || []);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  useEffect(() => {
    if (accessToken) {
      fetchSuppliers();
      fetchClients();
    } else {
      // Load from localStorage for non-logged-in users
      const savedSuppliers = localStorage.getItem('suppliers');
      if (savedSuppliers) {
        setSuppliers(JSON.parse(savedSuppliers));
      }
      const savedClients = localStorage.getItem('clients');
      if (savedClients) {
        setClients(JSON.parse(savedClients));
      }
    }
  }, [accessToken]);

  const saveSupplier = async () => {
    const { supplier, businessFields, footerNotes } = estimateData;
    if (!supplier.companyName) {
      toast.error('상호를 입력해주세요.');
      return;
    }

    // 공급자 데이터에 businessFields와 footerNotes 포함
    const supplierWithFields = {
      ...supplier,
      businessFields,
      footerNotes
    };

    if (accessToken) {
      // Save to backend for logged-in users
      try {
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-f05748ee/suppliers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify(supplierWithFields)
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || '공급자 정보 저장에 실패했습니다.');
        }

        setSuppliers(result.suppliers || []);
        
        // 불러온 데이터를 저장한 경우 업데이트 메시지, 새로 저장한 경우 저장 메시지
        if (loadedSupplierName === supplier.companyName) {
          toast.success('공급자 정보가 업데이트되었습니다.');
        } else {
          toast.success('공급자 정보가 저장되었습니다.');
          setLoadedSupplierName(supplier.companyName);
        }

      } catch (error: any) {
        console.error('Save supplier error:', error);
        toast.error(error.message || '공급자 정보 저장 중 오류가 발생했습니다.');
      }
    } else {
      // Save to localStorage for non-logged-in users
      const existingIndex = suppliers.findIndex(s => s.companyName === supplierWithFields.companyName);
      let updatedSuppliers;
      
      if (existingIndex >= 0) {
        updatedSuppliers = [...suppliers];
        updatedSuppliers[existingIndex] = supplierWithFields;
        toast.success('기존 공급자 정보가 업데이트되었습니다.');
      } else {
        updatedSuppliers = [...suppliers, supplierWithFields];
        toast.success('공급자 정보가 저장되었습니다.');
      }
      
      setSuppliers(updatedSuppliers);
      localStorage.setItem('suppliers', JSON.stringify(updatedSuppliers));
      setLoadedSupplierName(supplier.companyName);
    }
  };

  const loadSupplier = (supplierName: string) => {
    const supplier = suppliers.find(s => s.companyName === supplierName);
    if (supplier) {
      onUpdateEstimateData('supplier', supplier);
      // businessFields와 footerNotes도 함께 로드
      if (supplier.businessFields) {
        onUpdateEstimateData('businessFields', supplier.businessFields);
      }
      if (supplier.footerNotes) {
        onUpdateEstimateData('footerNotes', supplier.footerNotes);
      }
      // 불러온 공급자 이름 저장
      setLoadedSupplierName(supplierName);
    }
  };

  const saveClient = async () => {
    const { client } = estimateData;
    if (!client.name) {
      toast.error('고객명을 입력해주세요.');
      return;
    }

    if (accessToken) {
      // Save to backend for logged-in users
      try {
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-f05748ee/clients`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify(client)
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || '고객 정보 저장에 실패했습니다.');
        }

        setClients(result.clients || []);
        
        // 불러온 데이터를 저장한 경우 업데이트 메시지, 새로 저장한 경우 저장 메시지
        if (loadedClientName === client.name) {
          toast.success('고객 정보가 업데이트되었습니다.');
        } else {
          toast.success('고객 정보가 저장되었습니다.');
          setLoadedClientName(client.name);
        }

      } catch (error: any) {
        console.error('Save client error:', error);
        toast.error(error.message || '고객 정보 저장 중 오류가 발생했습니다.');
      }
    } else {
      // Save to localStorage for non-logged-in users
      const existingIndex = clients.findIndex(c => c.name === client.name);
      let updatedClients;
      
      if (existingIndex >= 0) {
        updatedClients = [...clients];
        updatedClients[existingIndex] = client;
        toast.success('기존 고객 정보가 업데이트되었습니다.');
      } else {
        updatedClients = [...clients, client];
        toast.success('고객 정보가 저장되었습니다.');
      }
      
      setClients(updatedClients);
      localStorage.setItem('clients', JSON.stringify(updatedClients));
      setLoadedClientName(client.name);
    }
  };

  const loadClient = (clientName: string) => {
    const client = clients.find(c => c.name === clientName);
    if (client) {
      onUpdateClient(client);
      // 불러온 고객사 이름 저장
      setLoadedClientName(clientName);
    }
  };

  const clearSupplier = () => {
    onUpdateEstimateData('supplier', {
      name: '',
      companyName: '',
      address: '',
      businessType: '',
      businessItem: '',
      phone: '',
      fax: '',
      businessNumber: '',
      companyEmail: '',
      accountNumber: '',
      homepage: '',
      businessFields: '',
      footerNotes: ''
    });
    onUpdateEstimateData('businessFields', '');
    onUpdateEstimateData('footerNotes', '');
    setSelectedSupplier('');
    setLoadedSupplierName(null);
  };

  const clearClient = () => {
    onUpdateClient({
      name: '',
      phone: '',
      email: '',
      address: ''
    });
    setSelectedClient('');
    setLoadedClientName(null);
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const logo = e.target?.result as string;
        onUpdateSupplier({ logo });
      };
      reader.readAsDataURL(file);
    }
  };

  const addEmptyInputRow = () => {
    setItemInputs(prev => [...prev, { 
      id: generateItemId(),
      name: '', 
      quantity: '', 
      price: '', 
      spec: 'EA', 
      note: '' 
    }]);
  };

  const removeItemInput = (index: number) => {
    const newInputs = itemInputs.filter((_, i) => i !== index);
    setItemInputs(newInputs);
  };

  const moveItem = useCallback((dragIndex: number, hoverIndex: number) => {
    setItemInputs((prevInputs) => {
      const newInputs = [...prevInputs];
      const [removed] = newInputs.splice(dragIndex, 1);
      newInputs.splice(hoverIndex, 0, removed);
      return newInputs;
    });
  }, []);

  // 품목을 자동으로 품목 관리에 저장하는 함수
  const saveItemToManager = async (item: Item) => {
    if (!accessToken) return; // 로그인된 사용자만 자동 저장
    
    try {
      const templateData = {
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        spec: item.spec,
        note: item.note
      };

      await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-f05748ee/item-templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(templateData)
      });
    } catch (error) {
      console.error('자동 저장 오류:', error);
      // 자동 저장 실패는 에러 메시지 표시하지 않음
    }
  };

  const addAllItems = () => {
    const newItems: Item[] = [];
    
    itemInputs.forEach(input => {
      const name = input.name.trim();
      const quantity = parseInt(input.quantity);
      const price = parseInt(input.price);
      const spec = input.spec.trim() || 'EA';
      const note = input.note.trim() || '';
      
      // 이름, 수량이 있고, 가격이 0 이상이면 추가 (0원 품목도 허용)
      if (name && quantity && price >= 0 && !isNaN(price)) {
        newItems.push({ name, quantity, price, spec, note });
      }
    });

    if (newItems.length > 0) {
      onUpdateEstimateData('items', [...estimateData.items, ...newItems]);
      
      // 각 품목을 품목 관리에 자동 저장
      newItems.forEach(item => {
        saveItemToManager(item);
      });
      
      // 입력 필드 초기화
      setItemInputs([{ 
        id: generateItemId(),
        name: '', 
        quantity: '', 
        price: '', 
        spec: 'EA', 
        note: '' 
      }]);
      toast.success(`${newItems.length}개 품목이 추가되었습니다.`);
    } else {
      toast.error('추가할 품목이 없습니다.');
    }
  };

  const updateItemInput = (index: number, field: keyof ItemInput, value: string) => {
    setItemInputs(prev => {
      const updated = [...prev];
      // 안전하게 해당 인덱스만 업데이트
      if (index >= 0 && index < updated.length) {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
  };

  const handleSelectTemplate = (template: any) => {
    try {
      // 안전하게 템플릿 데이터 추출
      const templateData = {
        name: String(template.name || ''),
        quantity: String(template.quantity || 1),
        price: String(template.price || 0),
        spec: String(template.spec || 'EA'),
        note: String(template.note || '')
      };

      // 첫 번째 빈 행 찾기
      const emptyIndex = itemInputs.findIndex(input => !input.name.trim());
      
      if (emptyIndex >= 0) {
        // 빈 행이 있으면 해당 행에 데이터 입력 (id는 유지)
        setItemInputs(prev => {
          const newInputs = [...prev];
          newInputs[emptyIndex] = {
            ...newInputs[emptyIndex],
            ...templateData
          };
          return newInputs;
        });
      } else {
        // 빈 행이 없으면 새로운 행 추가
        setItemInputs(prev => [...prev, {
          id: generateItemId(),
          ...templateData
        }]);
      }

      toast.success(`"${templateData.name}" 품목을 입력 필드에 불러왔습니다.`);
    } catch (error) {
      console.error('품목 불러오기 오류:', error);
      toast.error('품목 불러오기 중 오류가 발생했습니다.');
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-4 max-h-[85vh] overflow-y-auto pr-2">
      <Card>
        <CardHeader>
          <CardTitle>📝 견적 정보 입력</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 견적서 기본 정보 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="estimateNumber">견적번호</Label>
              <Input
                id="estimateNumber"
                value={estimateData.estimateNumber}
                onChange={(e) => onUpdateEstimateData('estimateNumber', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="estimateDate">견적날짜</Label>
              <Input
                type="date"
                id="estimateDate"
                value={estimateData.estimateDate}
                onChange={(e) => onUpdateEstimateData('estimateDate', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="constructionStartDate">공사 시작일</Label>
              <Input
                type="date"
                id="constructionStartDate"
                value={estimateData.constructionStartDate}
                onChange={(e) => onUpdateEstimateData('constructionStartDate', e.target.value)}
                placeholder="공사 시작일을 선택하세요"
              />
            </div>
            <div>
              <Label htmlFor="constructionEndDate">예상 마무리 날짜</Label>
              <Input
                type="date"
                id="constructionEndDate"
                value={estimateData.constructionEndDate}
                onChange={(e) => onUpdateEstimateData('constructionEndDate', e.target.value)}
                placeholder="예상 마무리 날짜를 선택하세요"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 고객사 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>👤 고객사 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={saveClient} size="sm">저장</Button>
            <Select value={selectedClient} onValueChange={(value) => {
              setSelectedClient(value);
              loadClient(value);
            }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="불러오기" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.name} value={client.name}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={clearClient} variant="outline" size="sm">초기화</Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="clientName">고객명/상호</Label>
              <Input
                id="clientName"
                value={estimateData.client.name}
                onChange={(e) => onUpdateClient({ name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="clientPhone">연락처</Label>
              <Input
                id="clientPhone"
                value={estimateData.client.phone}
                onChange={(e) => onUpdateClient({ phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="clientEmail">이메일</Label>
              <Input
                id="clientEmail"
                value={estimateData.client.email}
                onChange={(e) => onUpdateClient({ email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="clientAddress">주소</Label>
              <Input
                id="clientAddress"
                value={estimateData.client.address}
                onChange={(e) => onUpdateClient({ address: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 공급자 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>🏢 공급자 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={saveSupplier} size="sm">저장</Button>
            <Select value={selectedSupplier} onValueChange={(value) => {
              setSelectedSupplier(value);
              loadSupplier(value);
            }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="불러오기" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.companyName} value={supplier.companyName}>
                    {supplier.companyName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={clearSupplier} variant="outline" size="sm">초기화</Button>
          </div>

          <div>
            <Label htmlFor="logo">회사 로고</Label>
            <Input type="file" accept="image/*" onChange={handleLogoUpload} />
            {estimateData.supplier.logo && (
              <img src={estimateData.supplier.logo} alt="Logo" className="mt-2 max-w-16 max-h-16" />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="companyName">상호</Label>
              <Input
                id="companyName"
                value={estimateData.supplier.companyName}
                onChange={(e) => onUpdateSupplier({ companyName: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="address">주소</Label>
              <Input
                id="address"
                value={estimateData.supplier.address}
                onChange={(e) => onUpdateSupplier({ address: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="businessType">업태</Label>
              <Input
                id="businessType"
                value={estimateData.supplier.businessType}
                onChange={(e) => onUpdateSupplier({ businessType: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="businessItem">종목</Label>
              <Input
                id="businessItem"
                value={estimateData.supplier.businessItem}
                onChange={(e) => onUpdateSupplier({ businessItem: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="phone">전화번호</Label>
              <Input
                id="phone"
                value={estimateData.supplier.phone}
                onChange={(e) => onUpdateSupplier({ phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="fax">팩스</Label>
              <Input
                id="fax"
                value={estimateData.supplier.fax}
                onChange={(e) => onUpdateSupplier({ fax: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="businessNumber">사업자등록번호</Label>
              <Input
                id="businessNumber"
                value={estimateData.supplier.businessNumber}
                onChange={(e) => onUpdateSupplier({ businessNumber: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="companyEmail">이메일</Label>
              <Input
                id="companyEmail"
                value={estimateData.supplier.companyEmail}
                onChange={(e) => onUpdateSupplier({ companyEmail: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="accountNumber">계좌번호</Label>
              <Input
                id="accountNumber"
                value={estimateData.supplier.accountNumber}
                onChange={(e) => onUpdateSupplier({ accountNumber: e.target.value })}
                placeholder="계좌이체를 받을 계좌번호"
              />
            </div>
            <div>
              <Label htmlFor="homepage">홈페이지</Label>
              <Input
                id="homepage"
                value={estimateData.supplier.homepage}
                onChange={(e) => onUpdateSupplier({ homepage: e.target.value })}
                placeholder="www.example.com"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 부가세 옵션 */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 rounded-md">
              <p className="text-sm text-blue-800">💡 부가세는 공급가액의 10%로 자동 계산됩니다.</p>
            </div>
            <RadioGroup
              value={estimateData.taxOption}
              onValueChange={(value: 'including' | 'excluding') => onUpdateEstimateData('taxOption', value)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="excluding" id="excluding" />
                <Label htmlFor="excluding">단가 부가세 미포함</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="including" id="including" />
                <Label htmlFor="including">단가 부가세 포함</Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* 품목 입력 */}
      <Card>
        <CardHeader>
          <CardTitle>📦 품목 정보 (드래그로 순서 변경 가능)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="mb-3 p-2 bg-blue-50 rounded text-sm text-blue-700">
            💡 기본 1개 입력폼 제공 - 추가 입력이 필요하면 "입력행 추가" 버튼을 이용하세요
          </div>
          
          {itemInputs.map((input, index) => (
            <DraggableItemRow
              key={input.id}
              input={input}
              index={index}
              updateItemInput={updateItemInput}
              removeItemInput={removeItemInput}
              moveItem={moveItem}
            />
          ))}

          <div className="space-y-2 pt-4">
            <Button onClick={addAllItems} className="w-full">전체 품목 추가</Button>
            <div className="flex gap-2">
              <Button onClick={addEmptyInputRow} variant="outline" className="flex-1">입력행 추가</Button>
              {accessToken && (
                <ItemTemplateManager 
                  accessToken={accessToken} 
                  onSelectTemplate={handleSelectTemplate}
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 하단 문구 편집 */}
      <Card>
        <CardHeader>
          <CardTitle>📝 하단 문구 편집</CardTitle>
          <p className="text-sm text-blue-600">💡 이 정보는 공급자 정보와 함께 저장됩니다</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="businessFields">사업 분야</Label>
            <Input
              id="businessFields"
              value={estimateData.businessFields}
              onChange={(e) => onUpdateEstimateData('businessFields', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="footerNotes">비고사항</Label>
            <Textarea
              id="footerNotes"
              rows={4}
              placeholder="견적서 하단에 표시될 내용을 입력하세요..."
              value={estimateData.footerNotes}
              onChange={(e) => onUpdateEstimateData('footerNotes', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>
      </div>
    </DndProvider>
  );
}