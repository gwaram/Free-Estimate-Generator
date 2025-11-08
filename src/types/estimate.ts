export type TaxOption = 'including' | 'excluding';

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
  constructionDate: string;
  client: Client;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  supplier: Supplier;
  items: Item[];
  taxOption: TaxOption;
  businessFields: string;
  footerNotes: string;
}
