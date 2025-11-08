import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Trash2, Plus, Edit3 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId } from '../utils/supabase/info';
import { Item } from '../types/estimate';

interface ItemTemplate extends Item {}

interface ItemTemplateManagerProps {
  accessToken: string;
  onSelectTemplate: (template: Partial<Item>) => void;
}

const UNIT_OPTIONS = ['EA', 'SET', '개', '식', '품', 'm', 'kg', '시간', '일'];

export const ItemTemplateManager: React.FC<ItemTemplateManagerProps> = ({ accessToken, onSelectTemplate }) => {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<ItemTemplate[]>([]);
  const [editing, setEditing] = useState<ItemTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    quantity: '1',
    price: '0',
    spec: 'EA',
    note: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasAuth = Boolean(accessToken);

  useEffect(() => {
    if (!open || !hasAuth) return;

    const fetchTemplates = async () => {
      try {
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-f05748ee/item-templates`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (!response.ok) return;
        const data = await response.json();
        setTemplates(data.itemTemplates || []);
      } catch (error) {
        console.error('Error fetching templates', error);
      }
    };

    fetchTemplates();
  }, [open, hasAuth, accessToken]);

  const resetForm = () => {
    setEditing(null);
    setFormData({ name: '', quantity: '1', price: '0', spec: 'EA', note: '' });
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!hasAuth) {
      toast.error('로그인 후 품목을 저장할 수 있습니다.');
      return;
    }
    if (!formData.name || !formData.quantity || !formData.price) {
      toast.error('품목명, 수량, 단가를 모두 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        quantity: Number(formData.quantity),
        price: Number(formData.price),
        spec: formData.spec,
        note: formData.note
      };

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-f05748ee/item-templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || '품목 저장에 실패했습니다.');
      }

      setTemplates(result.itemTemplates || []);
      toast.success(editing ? '품목이 수정되었습니다.' : '품목이 저장되었습니다.');
      resetForm();
    } catch (error: any) {
      console.error('Save template error', error);
      toast.error(error.message || '품목 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (templateName: string) => {
    if (!hasAuth) {
      toast.error('로그인 후 품목을 삭제할 수 있습니다.');
      return;
    }
    if (!window.confirm('정말 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f05748ee/item-templates/${encodeURIComponent(templateName)}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || '품목 삭제에 실패했습니다.');
      }
      setTemplates(result.itemTemplates || []);
      toast.success('품목이 삭제되었습니다.');
    } catch (error: any) {
      console.error('Delete template error', error);
      toast.error(error.message || '품목 삭제 중 오류가 발생했습니다.');
    }
  };

  const startEdit = (template: ItemTemplate) => {
    setEditing(template);
    setFormData({
      name: template.name,
      quantity: template.quantity.toString(),
      price: template.price.toString(),
      spec: template.spec || 'EA',
      note: template.note || ''
    });
  };

  const handleSelectTemplate = (template: ItemTemplate) => {
    onSelectTemplate(template);
    setOpen(false);
  };

  const templateCountLabel = useMemo(() => `${templates.length}개`, [templates.length]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          📋 품목 관리 ({templateCountLabel})
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>품목 관리</DialogTitle>
          <DialogDescription>작성한 품목을 템플릿으로 저장하고 필요할 때 불러와 활용하세요.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{editing ? '품목 수정' : '새 품목 추가'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="template-name">품목명</Label>
                    <Input
                      id="template-name"
                      value={formData.name}
                      onChange={event => handleChange('name', event.target.value)}
                      placeholder="품목명을 입력하세요"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="template-quantity">수량</Label>
                    <Input
                      id="template-quantity"
                      type="number"
                      min={1}
                      value={formData.quantity}
                      onChange={event => handleChange('quantity', event.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="template-price">단가</Label>
                    <Input
                      id="template-price"
                      type="number"
                      min={0}
                      value={formData.price}
                      onChange={event => handleChange('price', event.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="template-spec">단위</Label>
                    <Select value={formData.spec} onValueChange={value => handleChange('spec', value)}>
                      <SelectTrigger id="template-spec">
                        <SelectValue placeholder="단위를 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {UNIT_OPTIONS.map(option => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="template-note">비고</Label>
                    <Input
                      id="template-note"
                      value={formData.note}
                      onChange={event => handleChange('note', event.target.value)}
                      placeholder="비고를 입력하세요"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  {editing && (
                    <Button type="button" variant="outline" onClick={resetForm}>
                      취소
                    </Button>
                  )}
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? '저장 중...' : editing ? '수정 완료' : '템플릿 저장'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>저장된 템플릿</CardTitle>
            </CardHeader>
            <CardContent>
              {templates.length === 0 ? (
                <div className="text-center text-gray-500 py-12">저장된 품목이 없습니다.</div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {templates.map(template => (
                    <div key={template.name} className="border rounded-lg p-4 space-y-3 bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-lg">{template.name}</div>
                          <div className="text-sm text-gray-500">{template.quantity} {template.spec || 'EA'}</div>
                          <div className="text-sm text-gray-500">{template.price.toLocaleString()} 원</div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => startEdit(template)} title="수정">
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(template.name)} title="삭제">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                      {template.note && <div className="text-sm text-gray-600">{template.note}</div>}
                      <Button variant="outline" size="sm" onClick={() => handleSelectTemplate(template)} className="w-full">
                        <Plus className="h-4 w-4 mr-1" /> 품목 입력에 추가
                      </Button>
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
};
