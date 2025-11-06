import React, { useState, useEffect } from 'react';
import { EstimateForm } from './components/EstimateForm';
import { EstimatePreview } from './components/EstimatePreview_New';
import { AuthModal } from './components/AuthModal';
import { MyPage } from './components/MyPage';
import { Button } from './components/ui/button';
import { Toaster } from './components/ui/sonner';
import { supabase } from './utils/supabase/client';
import { toast } from 'sonner@2.0.3';

export interface Item {
  name: string;
  quantity: number;
  price: number;
  spec: string;
  note: string;
}

export interface Supplier {
  name: string;
  companyName: string;
  address: string;
  businessType: string;
  businessItem: string;
  phone: string;
  fax: string;
  businessNumber: string;
  companyEmail: string;
  accountNumber: string;
  homepage: string;
  logo?: string;
  businessFields: string;
  footerNotes: string;
}

export interface Client {
  name: string;
  phone: string;
  email: string;
  address: string;
}

export interface EstimateData {
  estimateNumber: string;
  estimateDate: string;
  constructionStartDate: string;
  constructionEndDate: string;
  constructionDate: string; // 기존 호환성을 위해 유지
  client: Client;
  clientName: string; // 기존 호환성을 위해 유지
  clientPhone: string; // 기존 호환성을 위해 유지
  clientEmail: string; // 기존 호환성을 위해 유지
  supplier: Supplier;
  items: Item[];
  taxOption: 'including' | 'excluding';
  businessFields: string;
  footerNotes: string;
}

// Generate estimate number based on date and sequence
const generateEstimateNumber = (date: string): string => {
  const dateStr = date.replace(/-/g, '');
  const storedNumbers = JSON.parse(localStorage.getItem('estimateNumbers') || '{}');
  const dayKey = dateStr;
  
  if (!storedNumbers[dayKey]) {
    storedNumbers[dayKey] = 1;
  } else {
    storedNumbers[dayKey] += 1;
  }
  
  localStorage.setItem('estimateNumbers', JSON.stringify(storedNumbers));
  return `${dateStr}-${String(storedNumbers[dayKey]).padStart(3, '0')}`;
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string>('');
  const [currentEstimateId, setCurrentEstimateId] = useState<string | null>(null);
  const today = new Date().toISOString().split('T')[0];
  const [estimateData, setEstimateData] = useState<EstimateData>({
    estimateNumber: generateEstimateNumber(today),
    estimateDate: today,
    constructionStartDate: '',
    constructionEndDate: '',
    constructionDate: '', // 기존 호환성을 위해 유지
    client: {
      name: '',
      phone: '',
      email: '',
      address: ''
    },
    clientName: '', // 기존 호환성을 위해 유지
    clientPhone: '', // 기존 호환성을 위해 유지
    clientEmail: '', // 기존 호환성을 위해 유지
    supplier: {
      name: '테스트',
      companyName: '오빠두엑셀',
      address: '서울 강남구 테헤란로 141-2',
      businessType: '전자상거래',
      businessItem: '온라인제품',
      phone: '02) 123-4848',
      fax: '',
      businessNumber: '123-01-01249',
      companyEmail: 'info@oppadu.com',
      accountNumber: '',
      homepage: 'www.oppadu.com',
      businessFields: '온라인 강의 • 오프라인 특강 • 기업 컨설팅 • 프로그램 보안/제작',
      footerNotes: '● 오빠두엑셀 (www.oppadu.com) 홈페이지에서 온라인으로 구매 확정해주세요.\n● 사업자등록증은 팩스 또는 이메일(info@oppadu.com)으로 전달 부탁드립니다.\n● 프로그램 라이선 필요시 제작기간 약 3~15일 소요 / 추가비용 부과됩니다.\n● 도시/산간지역의 경우 추가 배송비가 부과됩니다.'
    },
    items: [],
    taxOption: 'excluding',
    businessFields: '온라인 강의 • 오프라인 특강 • 기업 컨설팅 • 프로그램 보안/제작',
    footerNotes: '● 오빠두엑셀 (www.oppadu.com) 홈페이지에서 온라인으로 구매 확정해주세요.\n● 사업자등록증은 팩스 또는 이메일(info@oppadu.com)으로 전달 부탁드립니다.\n● 프로그램 라이선 필요시 제작기간 약 3~15일 소요 / 추가비용 부과됩니다.\n● 도시/산간지역의 경우 추가 배송비가 부과됩니다.'
  });

  // Check for existing session on app load
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        setAccessToken(session.access_token);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(session.user);
        setAccessToken(session.access_token);
      } else {
        setUser(null);
        setAccessToken('');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const updateEstimateData = (field: keyof EstimateData, value: any) => {
    setEstimateData(prev => {
      const updated = { ...prev, [field]: value };
      
      // 견적날짜가 변경되면 견적번호도 자동 갱신
      if (field === 'estimateDate') {
        updated.estimateNumber = generateEstimateNumber(value);
      }
      
      return updated;
    });
  };

  const updateSupplier = (supplier: Partial<Supplier>) => {
    setEstimateData(prev => ({
      ...prev,
      supplier: { ...prev.supplier, ...supplier }
    }));
  };

  const updateClient = (client: Partial<Client>) => {
    setEstimateData(prev => ({
      ...prev,
      client: { ...prev.client, ...client },
      // 기존 호환성을 위해 동기화
      clientName: client.name || prev.clientName,
      clientPhone: client.phone || prev.clientPhone,
      clientEmail: client.email || prev.clientEmail
    }));
  };

  const removeItem = (index: number) => {
    setEstimateData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const moveItem = (dragIndex: number, hoverIndex: number) => {
    setEstimateData(prev => {
      const newItems = [...prev.items];
      const [removed] = newItems.splice(dragIndex, 1);
      newItems.splice(hoverIndex, 0, removed);
      return {
        ...prev,
        items: newItems
      };
    });
  };

  const updateItem = (index: number, updatedItem: Partial<Item>) => {
    setEstimateData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, ...updatedItem } : item
      )
    }));
  };

  const handleLogin = (loggedInUser: any, token: string) => {
    setUser(loggedInUser);
    setAccessToken(token);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setAccessToken('');
  };

  const loadEstimate = (estimate: EstimateData, estimateId?: string) => {
    setEstimateData(estimate);
    setCurrentEstimateId(estimateId || null);
  };

  const resetEstimate = () => {
    // 데이터가 있는 경우 확인 요청
    const hasData = estimateData.items.length > 0 || 
                   estimateData.client.name || 
                   estimateData.constructionStartDate ||
                   estimateData.constructionEndDate;
    
    if (hasData) {
      const confirmed = window.confirm('현재 작성 중인 견적서 내용이 모두 삭제됩니다. 계속하시겠습니까?');
      if (!confirmed) return;
    }

    const today = new Date().toISOString().split('T')[0];
    setEstimateData({
      estimateNumber: generateEstimateNumber(today),
      estimateDate: today,
      constructionStartDate: '',
      constructionEndDate: '',
      constructionDate: '',
      client: {
        name: '',
        phone: '',
        email: '',
        address: ''
      },
      clientName: '',
      clientPhone: '',
      clientEmail: '',
      supplier: {
        name: '테스트',
        companyName: '오빠두엑셀',
        address: '서울 강남구 테헤란로 141-2',
        businessType: '전자상거래',
        businessItem: '온라인제품',
        phone: '02) 123-4848',
        fax: '',
        businessNumber: '123-01-01249',
        companyEmail: 'info@oppadu.com',
        accountNumber: '',
        homepage: 'www.oppadu.com',
        businessFields: '온라인 강의 • 오프라인 특강 • 기업 컨설팅 • 프로그램 보안/제작',
        footerNotes: '● 오빠두엑셀 (www.oppadu.com) 홈페이지에서 온라인으로 구매 확정해주세요.\n● 사업자등록증은 팩스 또는 이메일(info@oppadu.com)으로 전달 부탁드립니다.\n● 프로그램 라이선 필요시 제작기간 약 3~15일 소요 / 추가비용 부과됩니다.\n● 도시/산간지역의 경우 추가 배송비가 부과됩니다.'
      },
      items: [],
      taxOption: 'excluding',
      businessFields: '온라인 강의 • 오프라인 특강 • 기업 컨설팅 • 프로그램 보안/제작',
      footerNotes: '● 오빠두엑셀 (www.oppadu.com) 홈페이지에서 온라인으로 구매 확정해주세요.\n● 사업자등록증은 팩스 또는 이메일(info@oppadu.com)으로 전달 부탁드립니다.\n● 프로그램 라이선 필요시 제작기간 약 3~15일 소요 / 추가비용 부과됩니다.\n● 도시/산간지역의 경우 추가 배송비가 부과됩니다.'
    });
    setCurrentEstimateId(null);
    
    toast.success('새 견적서가 생성되었습니다.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 p-2">
      <div className="max-w-[1600px] mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <h1 className="mb-2">회사 부제목</h1>
              <p>전문적인 견적서를 쉽게 만들어보세요</p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                onClick={resetEstimate}
                variant="outline"
                className="bg-white border-white text-blue-600 hover:bg-gray-100"
              >
                🔄 새 견적서
              </Button>
              {user ? (
                <>
                  <MyPage 
                    user={user} 
                    accessToken={accessToken} 
                    onLoadEstimate={loadEstimate}
                  />
                  <Button 
                    onClick={handleLogout}
                    variant="outline"
                    className="bg-white border-white text-blue-600 hover:bg-gray-100"
                  >
                    🚪 로그아웃
                  </Button>
                </>
              ) : (
                <AuthModal onLogin={handleLogin} />
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-[500px_1fr] gap-8 p-6">
          <EstimateForm 
            estimateData={estimateData}
            onUpdateEstimateData={updateEstimateData}
            onUpdateSupplier={updateSupplier}
            onUpdateClient={updateClient}
            accessToken={accessToken}
            user={user}
          />
          <EstimatePreview 
            estimateData={estimateData} 
            onRemoveItem={removeItem}
            onMoveItem={moveItem}
            onUpdateItem={updateItem}
            accessToken={accessToken}
            user={user}
            currentEstimateId={currentEstimateId}
            onEstimateSaved={(estimateId) => setCurrentEstimateId(estimateId)}
          />
        </div>
      </div>
      <Toaster />
    </div>
  );
}