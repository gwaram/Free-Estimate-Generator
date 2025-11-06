import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Trash2, Eye, Calendar, Building, Users, Store } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import type { EstimateData, Supplier, Client } from '../App';

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

export function MyPage({ user, accessToken, onLoadEstimate }: MyPageProps) {
  const [open, setOpen] = useState(false);
  const [estimates, setEstimates] = useState<SavedEstimate[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchEstimates = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-f05748ee/estimates`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setEstimates(result.estimates || []);
      }
    } catch (error) {
      console.error('Error fetching estimates:', error);
      toast.error('견적서 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSuppliers = async () => {
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

  const fetchClients = async () => {
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
    if (open && accessToken) {
      fetchEstimates();
      fetchSuppliers();
      fetchClients();
    }
  }, [open, accessToken]);

  const handleDeleteEstimate = async (estimateId: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-f05748ee/estimates/${estimateId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '견적서 삭제에 실패했습니다.');
      }

      setEstimates(result.estimates || []);
      toast.success('견적서가 삭제되었습니다.');

    } catch (error: any) {
      console.error('Delete estimate error:', error);
      toast.error(error.message || '견적서 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteSupplier = async (companyName: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-f05748ee/suppliers/${encodeURIComponent(companyName)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '공급자 정보 삭제에 실패했습니다.');
      }

      setSuppliers(result.suppliers || []);
      toast.success('공급자 정보가 삭제되었습니다.');

    } catch (error: any) {
      console.error('Delete supplier error:', error);
      toast.error(error.message || '공급자 정보 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteClient = async (clientName: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-f05748ee/clients/${encodeURIComponent(clientName)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '고객사 정보 삭제에 실패했습니다.');
      }

      setClients(result.clients || []);
      toast.success('고객사 정보가 삭제되었습니다.');

    } catch (error: any) {
      console.error('Delete client error:', error);
      toast.error(error.message || '고객사 정보 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleLoadEstimate = (estimate: SavedEstimate) => {
    // Remove createdAt, updatedAt before loading, but keep id for update tracking
    const { id, createdAt, updatedAt, ...estimateData } = estimate;
    onLoadEstimate(estimateData, id);
    setOpen(false);
    toast.success('견적서를 불러왔습니다.');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateTotal = (estimate: SavedEstimate) => {
    let subtotal = 0;
    
    estimate.items.forEach(item => {
      if (estimate.taxOption === 'including') {
        const unitPrice = Math.floor(item.price / 1.1);
        subtotal += unitPrice * item.quantity;
      } else {
        subtotal += item.price * item.quantity;
      }
    });
    
    const taxAmount = Math.floor(subtotal * 0.1);
    const total = subtotal + taxAmount;
    
    return total;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="bg-white border-white text-blue-600 hover:bg-gray-100">
          👤 마이페이지
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>마이페이지</DialogTitle>
          <DialogDescription>
            안녕하세요, {user?.user_metadata?.name || user?.email}님! 저장된 견적서를 관리하고 불러올 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* User Info */}
          <Card>
            <CardHeader>
              <CardTitle>계정 정보</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">이름:</span> {user?.user_metadata?.name || '-'}
                </div>
                <div>
                  <span className="font-medium">이메일:</span> {user?.email}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs for different data types */}
          <Tabs defaultValue="estimates" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="estimates" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                견적서 ({estimates.length})
              </TabsTrigger>
              <TabsTrigger value="suppliers" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                공급자 ({suppliers.length})
              </TabsTrigger>
              <TabsTrigger value="clients" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                고객사 ({clients.length})
              </TabsTrigger>
            </TabsList>

            {/* Estimates Tab */}
            <TabsContent value="estimates">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    저장된 견적서
                    <Badge variant="secondary">{estimates.length}개</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <p className="text-center py-4">불러오는 중...</p>
                  ) : estimates.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">저장된 견적서가 없습니다.</p>
                  ) : (
                    <div className="space-y-3">
                      {estimates.map((estimate) => (
                        <div key={estimate.id} className="border rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-medium">
                                  견적번호: {estimate.estimateNumber}
                                </h4>
                                <Badge variant="outline">
                                  {estimate.items.length}개 품목
                                </Badge>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                                <div className="flex items-center gap-1">
                                  <Building className="h-4 w-4" />
                                  {estimate.clientName || estimate.client?.name}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {formatDate(estimate.createdAt)}
                                </div>
                              </div>
                              
                              <div className="text-lg font-medium text-green-600">
                                총 견적금액: ₩{calculateTotal(estimate).toLocaleString()}
                              </div>
                              
                              {estimate.updatedAt !== estimate.createdAt && (
                                <div className="text-xs text-gray-500 mt-1">
                                  수정일: {formatDate(estimate.updatedAt)}
                                </div>
                              )}
                            </div>
                            
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleLoadEstimate(estimate)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                불러오기
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-500 hover:text-red-700"
                                onClick={() => handleDeleteEstimate(estimate.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Suppliers Tab */}
            <TabsContent value="suppliers">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    저장된 공급자 정보
                    <Badge variant="secondary">{suppliers.length}개</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {suppliers.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">저장된 공급자 정보가 없습니다.</p>
                  ) : (
                    <div className="space-y-3">
                      {suppliers.map((supplier, index) => (
                        <div key={index} className="border rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-medium text-lg">
                                  {supplier.companyName}
                                </h4>
                                {supplier.businessNumber && (
                                  <Badge variant="outline">
                                    {supplier.businessNumber}
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                                <div className="space-y-1">
                                  {supplier.address && <div>📍 {supplier.address}</div>}
                                  {supplier.phone && <div>📞 {supplier.phone}</div>}
                                  {supplier.companyEmail && <div>📧 {supplier.companyEmail}</div>}
                                </div>
                                <div className="space-y-1">
                                  {supplier.businessType && <div>업태: {supplier.businessType}</div>}
                                  {supplier.businessItem && <div>종목: {supplier.businessItem}</div>}
                                  {supplier.homepage && <div>🌐 {supplier.homepage}</div>}
                                </div>
                              </div>
                              
                              {supplier.accountNumber && (
                                <div className="text-sm bg-blue-50 p-2 rounded">
                                  <strong>계좌번호:</strong> {supplier.accountNumber}
                                </div>
                              )}
                            </div>
                            
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-500 hover:text-red-700"
                                onClick={() => handleDeleteSupplier(supplier.companyName)}
                              >
                                <Trash2 className="h-4 w-4" />
                                삭제
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Clients Tab */}
            <TabsContent value="clients">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    저장된 고객사 정보
                    <Badge variant="secondary">{clients.length}개</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {clients.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">저장된 고객사 정보가 없습니다.</p>
                  ) : (
                    <div className="space-y-3">
                      {clients.map((client, index) => (
                        <div key={index} className="border rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="mb-2">
                                <h4 className="font-medium text-lg">
                                  {client.name}
                                </h4>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                                <div className="space-y-1">
                                  {client.phone && <div>📞 {client.phone}</div>}
                                  {client.email && <div>📧 {client.email}</div>}
                                </div>
                                <div className="space-y-1">
                                  {client.address && <div>📍 {client.address}</div>}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-500 hover:text-red-700"
                                onClick={() => handleDeleteClient(client.name)}
                              >
                                <Trash2 className="h-4 w-4" />
                                삭제
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}