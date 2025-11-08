import React, { useEffect, useState } from 'react';
import { EstimateProvider, useEstimate } from './state/EstimateContext';
import { EstimateForm } from './components/EstimateForm';
import { EstimatePreview } from './components/EstimatePreview_New';
import { AuthModal } from './components/AuthModal';
import { MyPage } from './components/MyPage';
import { Button } from './components/ui/button';
import { Toaster } from './components/ui/sonner';
import { supabase } from './utils/supabase/client';
import { toast } from 'sonner@2.0.3';
import { EstimateData } from './types/estimate';

const AppShell: React.FC = () => {
  const {
    resetEstimate,
    hasDirtyState,
    replaceEstimate,
    setCurrentEstimateId,
    currentEstimateId
  } = useEstimate();
  const [user, setUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string>('');

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

  const handleReset = () => {
    if (hasDirtyState()) {
      const confirmed = window.confirm('현재 작성 중인 견적서 내용이 모두 삭제됩니다. 계속하시겠습니까?');
      if (!confirmed) {
        return;
      }
    }

    resetEstimate();
    toast.success('새 견적서가 생성되었습니다.');
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

  const handleLoadEstimate = (estimateData: EstimateData, estimateId?: string) => {
    replaceEstimate(estimateData);
    setCurrentEstimateId(estimateId || null);
  };

  const handleEstimateSaved = (estimateId: string) => {
    setCurrentEstimateId(estimateId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 p-2">
      <div className="max-w-[1600px] mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <h1 className="mb-2">회사 부제목</h1>
              <p>전문적인 견적서를 쉽게 만들어보세요</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleReset}
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
                    onLoadEstimate={handleLoadEstimate}
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

        <div className="grid lg:grid-cols-[500px_1fr] gap-8 p-6">
          <EstimateForm user={user} accessToken={accessToken} />
          <EstimatePreview
            accessToken={accessToken}
            user={user}
            currentEstimateId={currentEstimateId}
            onEstimateSaved={handleEstimateSaved}
          />
        </div>
      </div>
      <Toaster />
    </div>
  );
};

const App: React.FC = () => (
  <EstimateProvider>
    <AppShell />
  </EstimateProvider>
);

export default App;
