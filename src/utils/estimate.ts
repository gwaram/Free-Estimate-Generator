import { EstimateData, Client, Item, Supplier } from '../types/estimate';

const DEFAULT_SUPPLIER: Supplier = {
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
  footerNotes:
    '● 오빠두엑셀 (www.oppadu.com) 홈페이지에서 온라인으로 구매 확정해주세요.\n' +
    '● 사업자등록증은 팩스 또는 이메일(info@oppadu.com)으로 전달 부탁드립니다.\n' +
    '● 프로그램 라이선 필요시 제작기간 약 3~15일 소요 / 추가비용 부과됩니다.\n' +
    '● 도시/산간지역의 경우 추가 배송비가 부과됩니다.'
};

const EMPTY_CLIENT: Client = {
  name: '',
  phone: '',
  email: '',
  address: ''
};

const generateSequenceStore = () => {
  if (typeof window === 'undefined') {
    return {
      read: () => ({} as Record<string, number>),
      write: (_: Record<string, number>) => {}
    };
  }

  return {
    read: (): Record<string, number> => {
      try {
        return JSON.parse(window.localStorage.getItem('estimateNumbers') || '{}');
      } catch (error) {
        console.error('Failed to read estimate number store', error);
        return {};
      }
    },
    write: (value: Record<string, number>) => {
      try {
        window.localStorage.setItem('estimateNumbers', JSON.stringify(value));
      } catch (error) {
        console.error('Failed to persist estimate number store', error);
      }
    }
  };
};

export const generateEstimateNumber = (date: string) => {
  const dateKey = date.replace(/-/g, '');
  const store = generateSequenceStore();
  const sequences = store.read();
  const nextCount = (sequences[dateKey] || 0) + 1;

  const updated = { ...sequences, [dateKey]: nextCount };
  store.write(updated);

  return `${dateKey}-${String(nextCount).padStart(3, '0')}`;
};

export const createBlankItem = (): Item => ({
  name: '',
  quantity: 1,
  price: 0,
  spec: 'EA',
  note: ''
});

export const createInitialEstimate = (date: string = new Date().toISOString().split('T')[0]): EstimateData => ({
  estimateNumber: generateEstimateNumber(date),
  estimateDate: date,
  constructionStartDate: '',
  constructionEndDate: '',
  constructionDate: '',
  client: { ...EMPTY_CLIENT },
  clientName: '',
  clientPhone: '',
  clientEmail: '',
  supplier: { ...DEFAULT_SUPPLIER },
  items: [],
  taxOption: 'excluding',
  businessFields: DEFAULT_SUPPLIER.businessFields,
  footerNotes: DEFAULT_SUPPLIER.footerNotes
});

export const hasMeaningfulEstimateData = (estimate: EstimateData) => {
  if (estimate.items.length > 0) return true;
  if (estimate.client.name || estimate.client.phone || estimate.client.email || estimate.client.address) {
    return true;
  }
  if (estimate.constructionStartDate || estimate.constructionEndDate || estimate.constructionDate) {
    return true;
  }
  if (estimate.businessFields !== DEFAULT_SUPPLIER.businessFields) return true;
  if (estimate.footerNotes !== DEFAULT_SUPPLIER.footerNotes) return true;
  return false;
};

export const DEFAULT_SUPPLIER_INFO = DEFAULT_SUPPLIER;
export const EMPTY_CLIENT_INFO = EMPTY_CLIENT;
