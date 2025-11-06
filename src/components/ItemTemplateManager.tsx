import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Trash2, Plus, Edit3 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId } from '../utils/supabase/info';
import type { Item } from '../App';

interface ItemTemplate {
  name: string;
  quantity: number;
  price: number;
  spec: string;
  note: string;
}

interface ItemTemplateManagerProps {
  accessToken: string;
  onSelectTemplate: (template: ItemTemplate) => void;
}

export function ItemTemplateManager({ accessToken, onSelectTemplate }: ItemTemplateManagerProps) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<ItemTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<ItemTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    price: '',
    spec: 'EA',
    note: ''
  });

  const unitOptions = ['EA', 'SET', '개', '식', '품', 'm', 'kg', '시간', '일'];
  const [isLoading, setIsLoading] = useState(false);

  const fetchTemplates = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-f05748ee/item-templates`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setTemplates(result.itemTemplates || []);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  useEffect(() => {
    if (open && accessToken) {
      fetchTemplates();
    }
  }, [open, accessToken]);

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.quantity || !formData.price) {
      toast.error('품목명, 수량, 단가를 모두 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const templateData = {
        name: formData.name,
        quantity: parseInt(formData.quantity),
        price: parseInt(formData.price),
        spec: formData.spec || 'EA',
        note: formData.note
      };

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-f05748ee/item-templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(templateData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '품목 저장에 실패했습니다.');
      }

      setTemplates(result.itemTemplates || []);
      setFormData({ name: '', quantity: '', price: '', spec: 'EA', note: '' });
      setEditingTemplate(null);
      toast.success(editingTemplate ? '품목이 수정되었습니다.' : '품목이 저장되었습니다.');

    } catch (error: any) {
      console.error('Save template error:', error);
      toast.error(error.message || '품목 저장 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateName: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-f05748ee/item-templates/${encodeURIComponent(templateName)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '품목 삭제에 실패했습니다.');
      }

      setTemplates(result.itemTemplates || []);
      toast.success('품목이 삭제되었습니다.');

    } catch (error: any) {
      console.error('Delete template error:', error);
      toast.error(error.message || '품목 삭제 중 오류가 발생했습니다.');
    }
  };

  const startEdit = (template: ItemTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      quantity: template.quantity?.toString() || '1',
      price: template.price.toString(),
      spec: template.spec,
      note: template.note
    });
  };

  const cancelEdit = () => {
    setEditingTemplate(null);
    setFormData({ name: '', quantity: '', price: '', spec: 'EA', note: '' });
  };

  const handleSelectTemplate = (template: ItemTemplate) => {
    onSelectTemplate(template);
    setOpen(false);
    toast.success(`"${template.name}" 품목을 선택했습니다.`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          📋 품목 관리
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>품목 관리</DialogTitle>
          <DialogDescription>
            작성한 품목들이 자동으로 저장되며, 필요할 때 불러와서 사용할 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Add/Edit Form */}
          <Card>
            <CardHeader>
              <CardTitle>{editingTemplate ? '품목 수정' : '새 품목 추가'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveTemplate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="name">품목명</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="품목명을 입력하세요"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="quantity">수량</Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                      placeholder="수량을 입력하세요"
                      required
                      min="1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="price">단가</Label>
                    <Input
                      id="price"
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                      placeholder="단가를 입력하세요"
                      required
                      min="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="spec">단위</Label>
                    <Select
                      value={formData.spec}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, spec: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="단위 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {unitOptions.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="note">비고</Label>
                    <Input
                      id="note"
                      value={formData.note}
                      onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                      placeholder="비고를 입력하세요"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? '저장 중...' : (editingTemplate ? '수정' : '추가')}
                  </Button>
                  {editingTemplate && (
                    <Button type="button" variant="outline" onClick={cancelEdit}>
                      취소
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Templates List */}
          <Card>
            <CardHeader>
              <CardTitle>저장된 품목</CardTitle>
            </CardHeader>
            <CardContent>
              {templates.length === 0 ? (
                <p className="text-gray-500 text-center py-4">저장된 품목이 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-[2fr,1fr,1fr,1fr,1.5fr,auto] gap-2 text-xs text-gray-500 border-b pb-2 mb-3">
                    <span>품목명</span>
                    <span>수량/단위</span>
                    <span>단가</span>
                    <span>금액</span>
                    <span>비고</span>
                    <span>작업</span>
                  </div>
                  {templates.map((template, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1 grid grid-cols-[2fr,1fr,1fr,1fr,1.5fr] gap-2 text-sm">
                        <span className="font-medium">{template.name}</span>
                        <span>{template.quantity || 1} {template.spec}</span>
                        <span>{template.price.toLocaleString()}원</span>
                        <span className="font-medium text-blue-600">{((template.quantity || 1) * template.price).toLocaleString()}원</span>
                        <span className="text-gray-600">{template.note || '-'}</span>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSelectTemplate(template)}
                        >
                          선택
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEdit(template)}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleDeleteTemplate(template.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}