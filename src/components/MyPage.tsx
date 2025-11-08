import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Trash2, Eye, Calendar, Users, Store } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId } from '../utils/supabase/info';
import { EstimateData, Supplier, Client } from '../types/estimate';

interface SavedEstimate extends EstimateData {
  id: string;
  createdAt: string;
  updatedAt: string;
}

interface MyPageProps {
  user: any;
  accessToken: string;
  onLoadEstimate: (estimate: EstimateData, estimateId?: string) => void;
}

export const MyPage: React.FC<MyPageProps> = ({ user, accessToken, onLoadEstimate }) => {
  const [open, setOpen] = useState(false);
  const [estimates, setEstimates] = useState<SavedEstimate[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const authenticated = Boolean(user && accessToken);

  useEffect(() => {
    if (!open || !authenticated) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [estimateRes, supplierRes, clientRes] = await Promise.all([
          fetch(`https://${projectId}.supabase.co/functions/v1/make-server-f05748ee/estimates`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          }),
          fetch(`https://${projectId}.supabase.co/functions/v1/make-server-f05748ee/suppliers`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          }),
          fetch(`https://${projectId}.supabase.co/functions/v1/make-server-f05748ee/clients`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          })
        ]);

        if (estimateRes.ok) {
          const { estimates: fetchedEstimates = [] } = await estimateRes.json();
          setEstimates(fetchedEstimates);
        }
        if (supplierRes.ok) {
          const { suppliers: fetchedSuppliers = [] } = await supplierRes.json();
          setSuppliers(fetchedSuppliers);
        }
        if (clientRes.ok) {
          const { clients: fetchedClients = [] } = await clientRes.json();
          setClients(fetchedClients);
        }
      } catch (error) {
        console.error('Error loading dashboard data', error);
        toast.error('마이페이지 데이터를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [open, authenticated, accessToken]);

  const handleDeleteEstimate = async (estimateId: string) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f05748ee/estimates/${estimateId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || '견적서 삭제에 실패했습니다.');
      }
      setEstimates(result.estimates || []);
      toast.success('견적서가 삭제되었습니다.');
    } catch (error: any) {
      console.error('Delete estimate error', error);
      toast.error(error.message || '견적서 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteSupplier = async (companyName: string) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f05748ee/suppliers/${encodeURIComponent(companyName)}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || '공급자 정보 삭제에 실패했습니다.');
      }
      setSuppliers(result.suppliers || []);
      toast.success('공급자 정보가 삭제되었습니다.');
    } catch (error: any) {
      console.error('Delete supplier error', error);
      toast.error(error.message || '공급자 정보 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteClient = async (clientName: string) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f05748ee/clients/${encodeURIComponent(clientName)}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || '고객사 정보 삭제에 실패했습니다.');
      }
      setClients(result.clients || []);
      toast.success('고객사 정보가 삭제되었습니다.');
    } catch (error: any) {
      console.error('Delete client error', error);
      toast.error(error.message || '고객사 정보 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleLoadEstimate = (estimate: SavedEstimate) => {
    const { id, createdAt: _createdAt, updatedAt: _updatedAt, ...estimateData } = estimate;
    onLoadEstimate(estimateData, id);
    setOpen(false);
    toast.success('견적서를 불러왔습니다.');
  };

  const formatDateTime = (value: string) => {
    const date = new Date(value);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateEstimateTotal = (estimate: SavedEstimate) => {
    let subtotal = 0;
    estimate.items.forEach(item => {
      if (estimate.taxOption === 'including') {
        const unitPrice = Math.floor(item.price / 1.1);
        subtotal += unitPrice * item.quantity;
      } else {
        subtotal += item.price * item.quantity;
      }
    });
    const tax = Math.floor(subtotal * 0.1);
    return { subtotal, tax, total: subtotal + tax };
  };

  const renderEstimateCard = (estimate: SavedEstimate) => {
    const { subtotal, tax, total } = calculateEstimateTotal(estimate);

    return (
      <Card key={estimate.id} className="shadow-sm">
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle className="text-lg">{estimate.client.name || '무명 고객'}</CardTitle>
            <div className="text-sm text-gray-500">견적번호 {estimate.estimateNumber}</div>
          </div>
          <Badge variant="secondary">{estimate.items.length}개 품목</Badge>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="h-4 w-4" />
            {formatDateTime(estimate.updatedAt)} 기준
          </div>
          <div className="space-y-1 text-gray-700">
            <div>공급가액: {subtotal.toLocaleString()} 원</div>
            <div>부가세: {tax.toLocaleString()} 원</div>
            <div className="font-medium">합계: {total.toLocaleString()} 원</div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => handleLoadEstimate(estimate)} className="flex items-center gap-1">
              <Eye className="h-4 w-4" /> 불러오기
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleDeleteEstimate(estimate.id)} className="flex items-center gap-1 text-red-500">
              <Trash2 className="h-4 w-4" /> 삭제
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderSupplierCard = (supplier: Supplier) => (
    <Card key={supplier.companyName} className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Store className="h-4 w-4" />
          {supplier.companyName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-gray-700">
        <div>대표자: {supplier.name || '-'}</div>
        <div>사업자등록번호: {supplier.businessNumber || '-'}</div>
        <div>연락처: {supplier.phone || '-'}</div>
        <div>주소: {supplier.address || '-'}</div>
        <Button variant="outline" size="sm" onClick={() => handleDeleteSupplier(supplier.companyName)} className="flex items-center gap-1 text-red-500">
          <Trash2 className="h-4 w-4" /> 삭제
        </Button>
      </CardContent>
    </Card>
  );

  const renderClientCard = (client: Client) => (
    <Card key={client.name} className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-4 w-4" />
          {client.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-gray-700">
        <div>연락처: {client.phone || '-'}</div>
        <div>이메일: {client.email || '-'}</div>
        <div>주소: {client.address || '-'}</div>
        <Button variant="outline" size="sm" onClick={() => handleDeleteClient(client.name)} className="flex items-center gap-1 text-red-500">
          <Trash2 className="h-4 w-4" /> 삭제
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="bg-white border-white text-blue-600 hover:bg-gray-100">
          👤 마이페이지
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{user?.email} 님의 마이페이지</DialogTitle>
          <DialogDescription>저장된 견적서, 공급자, 고객 정보를 확인하고 관리하세요.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-20 text-gray-500">데이터를 불러오는 중입니다...</div>
        ) : (
          <Tabs defaultValue="estimates" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="estimates">견적서</TabsTrigger>
              <TabsTrigger value="suppliers">공급자</TabsTrigger>
              <TabsTrigger value="clients">고객사</TabsTrigger>
            </TabsList>

            <TabsContent value="estimates">
              {estimates.length === 0 ? (
                <div className="text-center text-gray-500 py-12">저장된 견적서가 없습니다.</div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {estimates.map(renderEstimateCard)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="suppliers">
              {suppliers.length === 0 ? (
                <div className="text-center text-gray-500 py-12">저장된 공급자 정보가 없습니다.</div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {suppliers.map(renderSupplierCard)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="clients">
              {clients.length === 0 ? (
                <div className="text-center text-gray-500 py-12">저장된 고객사 정보가 없습니다.</div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {clients.map(renderClientCard)}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};
