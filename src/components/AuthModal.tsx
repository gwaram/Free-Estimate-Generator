import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner@2.0.3';
import { supabase } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface AuthModalProps {
  onLogin: (user: any, accessToken: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onLogin }) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [signupData, setSignupData] = useState({ email: '', password: '', name: '' });
  const [signinData, setSigninData] = useState({ email: '', password: '' });

  const handleSignup = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!signupData.email || !signupData.password || !signupData.name) {
      toast.error('모든 필드를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-f05748ee/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify(signupData)
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || '회원가입에 실패했습니다.');
      }

      toast.success('회원가입이 완료되었습니다. 로그인해주세요.');
      setSignupData({ email: '', password: '', name: '' });
      setOpen(true);
    } catch (error: any) {
      console.error('Signup error', error);
      toast.error(error.message || '회원가입 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!signinData.email || !signinData.password) {
      toast.error('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: signinData.email,
        password: signinData.password
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.session) {
        onLogin(data.user, data.session.access_token);
        setOpen(false);
        setSigninData({ email: '', password: '' });
        toast.success('로그인되었습니다.');
      }
    } catch (error: any) {
      console.error('Signin error', error);
      toast.error('로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-white text-blue-600 hover:bg-gray-100">🔑 로그인</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>계정 로그인</DialogTitle>
          <DialogDescription>기존 계정으로 로그인하거나 새 계정을 만드세요.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">로그인</TabsTrigger>
            <TabsTrigger value="signup">회원가입</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="space-y-4">
            <form onSubmit={handleSignin} className="space-y-4">
              <div>
                <Label htmlFor="signin-email">이메일</Label>
                <Input
                  id="signin-email"
                  type="email"
                  value={signinData.email}
                  onChange={event => setSigninData(prev => ({ ...prev, email: event.target.value }))}
                  placeholder="example@email.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="signin-password">비밀번호</Label>
                <Input
                  id="signin-password"
                  type="password"
                  value={signinData.password}
                  onChange={event => setSigninData(prev => ({ ...prev, password: event.target.value }))}
                  placeholder="비밀번호를 입력하세요"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? '로그인 중...' : '로그인'}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4">
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <Label htmlFor="signup-name">이름</Label>
                <Input
                  id="signup-name"
                  value={signupData.name}
                  onChange={event => setSignupData(prev => ({ ...prev, name: event.target.value }))}
                  placeholder="홍길동"
                  required
                />
              </div>
              <div>
                <Label htmlFor="signup-email">이메일</Label>
                <Input
                  id="signup-email"
                  type="email"
                  value={signupData.email}
                  onChange={event => setSignupData(prev => ({ ...prev, email: event.target.value }))}
                  placeholder="example@email.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="signup-password">비밀번호</Label>
                <Input
                  id="signup-password"
                  type="password"
                  value={signupData.password}
                  onChange={event => setSignupData(prev => ({ ...prev, password: event.target.value }))}
                  placeholder="비밀번호를 입력하세요"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? '가입 중...' : '회원가입'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
