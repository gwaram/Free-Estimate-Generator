import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { GripVertical, Trash2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { ItemTemplateManager } from './ItemTemplateManager';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { useEstimate } from '../state/EstimateContext';
import { Client, Item, Supplier } from '../types/estimate';
import { projectId } from '../utils/supabase/info';

interface EstimateFormProps {
  user: any;
  accessToken: string;
}

interface ItemDraft {
  id: string;
  name: string;
  quantity: string;
  price: string;
  spec: string;
  note: string;
}

interface DragMeta {
  type: 'ITEM_DRAFT';
  index: number;
  id: string;
}

const SPEC_OPTIONS = ['EA', 'SET', '개', '식', '품', 'm', 'kg', '시간', '일'];

const createDraft = (id: string): ItemDraft => ({
  id,
  name: '',
  quantity: '',
  price: '',
  spec: 'EA',
  note: ''
});

const DraftRow: React.FC<{
  draft: ItemDraft;
  index: number;
  onChange: (index: number, field: keyof ItemDraft, value: string) => void;
  onRemove: (index: number) => void;
  moveRow: (from: number, to: number) => void;
}> = ({ draft, index, onChange, onRemove, moveRow }) => {
  const [{ isDragging }, dragRef, previewRef] = useDrag({
    type: 'ITEM_DRAFT',
    item: { id: draft.id, index } as DragMeta,
    collect: monitor => ({ isDragging: monitor.isDragging() })
  });

  const [, dropRef] = useDrop({
    accept: 'ITEM_DRAFT',
    hover(item: DragMeta, monitor) {
      if (!monitor.isOver({ shallow: true })) return;
      if (item.index === index) return;
      moveRow(item.index, index);
      item.index = index;
    }
  });

  return (
    <div
      ref={node => previewRef(dropRef(node))}
      className={`border border-gray-200 rounded-lg p-3 space-y-3 bg-white ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center gap-2">
        <div ref={dragRef} className="cursor-move text-gray-400 hover:text-gray-600 p-1">
          <GripVertical className="h-4 w-4" />
        </div>
        <Input
          placeholder="품목명"
          value={draft.name}
          onChange={event => onChange(index, 'name', event.target.value)}
          className="flex-1"
        />
        <Button variant="outline" size="sm" onClick={() => onRemove(index)} className="text-red-500 hover:text-red-700">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Input
          type="number"
          placeholder="수량"
          min={1}
          value={draft.quantity}
          onChange={event => onChange(index, 'quantity', event.target.value)}
        />
        <Input
          type="number"
          placeholder="단가"
          min={0}
          value={draft.price}
          onChange={event => onChange(index, 'price', event.target.value)}
        />
        <Select value={draft.spec} onValueChange={value => onChange(index, 'spec', value)}>
          <SelectTrigger>
            <SelectValue placeholder="단위" />
          </SelectTrigger>
          <SelectContent>
            {SPEC_OPTIONS.map(option => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Input
        placeholder="비고"
        value={draft.note}
        onChange={event => onChange(index, 'note', event.target.value)}
      />
    </div>
  );
};

const LOCAL_SUPPLIERS_KEY = 'suppliers';
const LOCAL_CLIENTS_KEY = 'clients';

export const EstimateForm: React.FC<EstimateFormProps> = ({ user, accessToken }) => {
  const {
    estimate,
    updateField,
    updateSupplier,
    updateClient,
    appendItems
  } = useEstimate();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [draftCounter, setDraftCounter] = useState(1);
  const [drafts, setDrafts] = useState<ItemDraft[]>([createDraft('item-0')]);
  const [isSavingSupplier, setIsSavingSupplier] = useState(false);
  const [isSavingClient, setIsSavingClient] = useState(false);

  const authenticated = Boolean(user && accessToken);

  const supplierOptions = useMemo(() => suppliers.map(supplier => ({
    value: supplier.companyName,
    label: supplier.companyName
  })), [suppliers]);

  const clientOptions = useMemo(() => clients.map(client => ({
    value: client.name,
    label: client.name
  })), [clients]);

  const generateDraftId = useCallback(() => {
    const id = `item-${draftCounter}`;
    setDraftCounter(prev => prev + 1);
    return id;
  }, [draftCounter]);

  const fetchSuppliers = useCallback(async () => {
    if (!authenticated) {
      if (typeof window === 'undefined') return;
      const raw = window.localStorage.getItem(LOCAL_SUPPLIERS_KEY);
      if (raw) {
        setSuppliers(JSON.parse(raw));
      }
      return;
    }

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-f05748ee/suppliers`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!response.ok) return;
      const { suppliers: remoteSuppliers = [] } = await response.json();
      setSuppliers(remoteSuppliers);
    } catch (error) {
      console.error('Failed to fetch suppliers', error);
    }
  }, [authenticated, accessToken]);

  const fetchClients = useCallback(async () => {
    if (!authenticated) {
      if (typeof window === 'undefined') return;
      const raw = window.localStorage.getItem(LOCAL_CLIENTS_KEY);
      if (raw) {
        setClients(JSON.parse(raw));
      }
      return;
    }

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-f05748ee/clients`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!response.ok) return;
      const { clients: remoteClients = [] } = await response.json();
      setClients(remoteClients);
    } catch (error) {
      console.error('Failed to fetch clients', error);
    }
  }, [authenticated, accessToken]);

  useEffect(() => {
    fetchSuppliers();
    fetchClients();
  }, [fetchSuppliers, fetchClients]);

  const persistSuppliersLocally = (items: Supplier[]) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(LOCAL_SUPPLIERS_KEY, JSON.stringify(items));
    } catch (error) {
      console.error('Failed to persist suppliers', error);
    }
  };

  const persistClientsLocally = (items: Client[]) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(LOCAL_CLIENTS_KEY, JSON.stringify(items));
    } catch (error) {
      console.error('Failed to persist clients', error);
    }
  };

  const handleSupplierSave = async () => {
    const supplierPayload = { ...estimate.supplier, businessFields: estimate.businessFields, footerNotes: estimate.footerNotes };

    if (!supplierPayload.companyName) {
      toast.error('상호를 입력해주세요.');
      return;
    }

    setIsSavingSupplier(true);
    try {
      if (authenticated) {
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-f05748ee/suppliers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify(supplierPayload)
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || '공급자 정보 저장에 실패했습니다.');
        }
        setSuppliers(result.suppliers || []);
      } else {
        const existingIndex = suppliers.findIndex(item => item.companyName === supplierPayload.companyName);
        const next = [...suppliers];
        if (existingIndex >= 0) {
          next[existingIndex] = supplierPayload;
          toast.success('기존 공급자 정보가 업데이트되었습니다.');
        } else {
          next.push(supplierPayload);
          toast.success('공급자 정보가 저장되었습니다.');
        }
        setSuppliers(next);
        persistSuppliersLocally(next);
      }
      if (authenticated) {
        toast.success('공급자 정보가 저장되었습니다.');
      }
    } catch (error: any) {
      console.error('save supplier error', error);
      toast.error(error.message || '공급자 정보 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSavingSupplier(false);
    }
  };

  const handleSupplierSelect = (companyName: string) => {
    setSelectedSupplier(companyName);
    const match = suppliers.find(supplier => supplier.companyName === companyName);
    if (!match) return;
    updateSupplier(match);
    if (match.businessFields) {
      updateField('businessFields', match.businessFields);
    }
    if (match.footerNotes) {
      updateField('footerNotes', match.footerNotes);
    }
  };

  const handleSupplierClear = () => {
    updateSupplier({
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
      footerNotes: '',
      logo: ''
    });
    updateField('businessFields', '');
    updateField('footerNotes', '');
    setSelectedSupplier('');
  };

  const handleClientSave = async () => {
    if (!estimate.client.name) {
      toast.error('고객명을 입력해주세요.');
      return;
    }

    setIsSavingClient(true);
    try {
      if (authenticated) {
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-f05748ee/clients`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify(estimate.client)
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || '고객 정보 저장에 실패했습니다.');
        }
        setClients(result.clients || []);
      } else {
        const existingIndex = clients.findIndex(item => item.name === estimate.client.name);
        const next = [...clients];
        if (existingIndex >= 0) {
          next[existingIndex] = estimate.client;
          toast.success('기존 고객 정보가 업데이트되었습니다.');
        } else {
          next.push(estimate.client);
          toast.success('고객 정보가 저장되었습니다.');
        }
        setClients(next);
        persistClientsLocally(next);
      }
      if (authenticated) {
        toast.success('고객 정보가 저장되었습니다.');
      }
    } catch (error: any) {
      console.error('save client error', error);
      toast.error(error.message || '고객 정보 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSavingClient(false);
    }
  };

  const handleClientSelect = (clientName: string) => {
    setSelectedClient(clientName);
    const match = clients.find(client => client.name === clientName);
    if (!match) return;
    updateClient(match);
  };

  const handleClientClear = () => {
    updateClient({ name: '', phone: '', email: '', address: '' });
    setSelectedClient('');
  };

  const moveDraft = (from: number, to: number) => {
    setDrafts(prev => {
      const next = [...prev];
      const [removed] = next.splice(from, 1);
      next.splice(to, 0, removed);
      return next;
    });
  };

  const handleDraftChange = (index: number, field: keyof ItemDraft, value: string) => {
    setDrafts(prev => {
      const next = [...prev];
      if (!next[index]) return prev;
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleDraftRemove = (index: number) => {
    setDrafts(prev => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== index)));
  };

  const handleAddDraftRow = () => {
    setDrafts(prev => [...prev, createDraft(generateDraftId())]);
  };

  const handleAppendDrafts = () => {
    const parsedItems: Item[] = drafts
      .map(draft => ({
        name: draft.name.trim(),
        quantity: Number(draft.quantity),
        price: Number(draft.price),
        spec: draft.spec || 'EA',
        note: draft.note.trim()
      }))
      .filter(item => item.name && Number.isFinite(item.quantity) && item.quantity > 0 && Number.isFinite(item.price));

    if (parsedItems.length === 0) {
      toast.error('추가할 품목이 없습니다.');
      return;
    }

    appendItems(parsedItems);
    toast.success(`${parsedItems.length}개 품목이 추가되었습니다.`);
    setDrafts([createDraft(generateDraftId())]);
  };

  const handleTemplateSelect = (template: Partial<Item>) => {
    const templateDraft: ItemDraft = {
      id: generateDraftId(),
      name: String(template.name ?? ''),
      quantity: String(template.quantity ?? 1),
      price: String(template.price ?? 0),
      spec: String(template.spec ?? 'EA'),
      note: String(template.note ?? '')
    };

    setDrafts(prev => {
      const emptyIndex = prev.findIndex(item => !item.name.trim());
      if (emptyIndex >= 0) {
        const next = [...prev];
        next[emptyIndex] = { ...templateDraft, id: next[emptyIndex].id };
        return next;
      }
      return [...prev, templateDraft];
    });

    toast.success(`"${templateDraft.name}" 품목을 입력 필드에 불러왔습니다.`);
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      updateSupplier({ logo: String(e.target?.result || '') });
    };
    reader.readAsDataURL(file);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-4 max-h-[85vh] overflow-y-auto pr-2">
        <Card>
          <CardHeader>
            <CardTitle>📝 견적 정보 입력</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="estimateNumber">견적번호</Label>
                <Input
                  id="estimateNumber"
                  value={estimate.estimateNumber}
                  onChange={event => updateField('estimateNumber', event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="estimateDate">견적날짜</Label>
                <Input
                  id="estimateDate"
                  type="date"
                  value={estimate.estimateDate}
                  onChange={event => updateField('estimateDate', event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="constructionStartDate">공사 시작일</Label>
                <Input
                  id="constructionStartDate"
                  type="date"
                  value={estimate.constructionStartDate}
                  onChange={event => updateField('constructionStartDate', event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="constructionEndDate">예상 마무리 날짜</Label>
                <Input
                  id="constructionEndDate"
                  type="date"
                  value={estimate.constructionEndDate}
                  onChange={event => updateField('constructionEndDate', event.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>👤 고객사 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Select value={selectedClient} onValueChange={handleClientSelect}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="저장된 고객사 불러오기" />
                </SelectTrigger>
                <SelectContent>
                  {clientOptions.length === 0 && <SelectItem value="__empty" disabled>저장된 고객사가 없습니다</SelectItem>}
                  {clientOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={handleClientSave} disabled={isSavingClient}>
                💾 저장
              </Button>
              <Button variant="outline" onClick={handleClientClear}>
                ✨ 초기화
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>고객명</Label>
                <Input value={estimate.client.name} onChange={event => updateClient({ name: event.target.value })} />
              </div>
              <div>
                <Label>연락처</Label>
                <Input value={estimate.client.phone} onChange={event => updateClient({ phone: event.target.value })} />
              </div>
              <div>
                <Label>이메일</Label>
                <Input value={estimate.client.email} onChange={event => updateClient({ email: event.target.value })} />
              </div>
              <div>
                <Label>주소</Label>
                <Input value={estimate.client.address} onChange={event => updateClient({ address: event.target.value })} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>🏢 공급자 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Select value={selectedSupplier} onValueChange={handleSupplierSelect}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="저장된 공급자 불러오기" />
                </SelectTrigger>
                <SelectContent>
                  {supplierOptions.length === 0 && <SelectItem value="__empty" disabled>저장된 공급자가 없습니다</SelectItem>}
                  {supplierOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={handleSupplierSave} disabled={isSavingSupplier}>
                💾 저장
              </Button>
              <Button variant="outline" onClick={handleSupplierClear}>
                ✨ 초기화
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>상호</Label>
                <Input value={estimate.supplier.companyName} onChange={event => updateSupplier({ companyName: event.target.value })} />
              </div>
              <div>
                <Label>대표자</Label>
                <Input value={estimate.supplier.name} onChange={event => updateSupplier({ name: event.target.value })} />
              </div>
              <div>
                <Label>주소</Label>
                <Input value={estimate.supplier.address} onChange={event => updateSupplier({ address: event.target.value })} />
              </div>
              <div>
                <Label>업태</Label>
                <Input value={estimate.supplier.businessType} onChange={event => updateSupplier({ businessType: event.target.value })} />
              </div>
              <div>
                <Label>업종</Label>
                <Input value={estimate.supplier.businessItem} onChange={event => updateSupplier({ businessItem: event.target.value })} />
              </div>
              <div>
                <Label>전화</Label>
                <Input value={estimate.supplier.phone} onChange={event => updateSupplier({ phone: event.target.value })} />
              </div>
              <div>
                <Label>팩스</Label>
                <Input value={estimate.supplier.fax} onChange={event => updateSupplier({ fax: event.target.value })} />
              </div>
              <div>
                <Label>사업자등록번호</Label>
                <Input value={estimate.supplier.businessNumber} onChange={event => updateSupplier({ businessNumber: event.target.value })} />
              </div>
              <div>
                <Label>회사 이메일</Label>
                <Input value={estimate.supplier.companyEmail} onChange={event => updateSupplier({ companyEmail: event.target.value })} />
              </div>
              <div>
                <Label>계좌번호</Label>
                <Input value={estimate.supplier.accountNumber} onChange={event => updateSupplier({ accountNumber: event.target.value })} />
              </div>
              <div>
                <Label>홈페이지</Label>
                <Input value={estimate.supplier.homepage} onChange={event => updateSupplier({ homepage: event.target.value })} />
              </div>
              <div>
                <Label>로고</Label>
                <Input type="file" accept="image/*" onChange={handleLogoUpload} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>📦 품목 입력</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleAddDraftRow}>
                  ➕ 행 추가
                </Button>
                <Button variant="outline" size="sm" onClick={handleAppendDrafts}>
                  ✅ 품목 반영
                </Button>
              </div>
              <ItemTemplateManager accessToken={accessToken} onSelectTemplate={handleTemplateSelect} />
            </div>
            <div className="space-y-3">
              {drafts.map((draft, index) => (
                <DraftRow
                  key={draft.id}
                  draft={draft}
                  index={index}
                  onChange={handleDraftChange}
                  onRemove={handleDraftRemove}
                  moveRow={moveDraft}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>💡 기타 설정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>세금 계산 방식</Label>
              <RadioGroup value={estimate.taxOption} onValueChange={value => updateField('taxOption', value as 'including' | 'excluding')} className="mt-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="excluding" id="tax-excluding" />
                  <Label htmlFor="tax-excluding">부가세 별도</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="including" id="tax-including" />
                  <Label htmlFor="tax-including">부가세 포함</Label>
                </div>
              </RadioGroup>
            </div>
            <Separator />
            <div>
              <Label>주요 사업 분야</Label>
              <Textarea value={estimate.businessFields} rows={3} onChange={event => updateField('businessFields', event.target.value)} />
            </div>
            <div>
              <Label>하단 안내 문구</Label>
              <Textarea value={estimate.footerNotes} rows={5} onChange={event => updateField('footerNotes', event.target.value)} />
            </div>
          </CardContent>
        </Card>
      </div>
    </DndProvider>
  );
};
