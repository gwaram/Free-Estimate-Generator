import React, { createContext, useContext, useMemo, useState } from 'react';
import { EstimateData, Client, Supplier, Item } from '../types/estimate';
import {
  createInitialEstimate,
  generateEstimateNumber,
  hasMeaningfulEstimateData
} from '../utils/estimate';

interface EstimateContextValue {
  estimate: EstimateData;
  currentEstimateId: string | null;
  setCurrentEstimateId: (id: string | null) => void;
  updateField: <K extends keyof EstimateData>(field: K, value: EstimateData[K]) => void;
  updateSupplier: (supplier: Partial<Supplier>) => void;
  updateClient: (client: Partial<Client>) => void;
  replaceEstimate: (estimate: EstimateData) => void;
  removeItem: (index: number) => void;
  moveItem: (from: number, to: number) => void;
  updateItem: (index: number, item: Partial<Item>) => void;
  appendItems: (items: Item[]) => void;
  resetEstimate: () => void;
  hasDirtyState: () => boolean;
}

const EstimateContext = createContext<EstimateContextValue | null>(null);

export const EstimateProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [estimate, setEstimate] = useState<EstimateData>(() => createInitialEstimate());
  const [currentEstimateId, setCurrentEstimateId] = useState<string | null>(null);

  const updateField: EstimateContextValue['updateField'] = (field, value) => {
    setEstimate(prev => {
      const next: EstimateData = { ...prev, [field]: value };

      if (field === 'estimateDate') {
        next.estimateNumber = generateEstimateNumber(String(value));
      }

      return next;
    });
  };

  const updateSupplier: EstimateContextValue['updateSupplier'] = (supplier) => {
    setEstimate(prev => ({
      ...prev,
      supplier: { ...prev.supplier, ...supplier }
    }));
  };

  const updateClient: EstimateContextValue['updateClient'] = (client) => {
    setEstimate(prev => ({
      ...prev,
      client: { ...prev.client, ...client },
      clientName: client.name ?? prev.clientName,
      clientPhone: client.phone ?? prev.clientPhone,
      clientEmail: client.email ?? prev.clientEmail
    }));
  };

  const replaceEstimate: EstimateContextValue['replaceEstimate'] = (nextEstimate) => {
    setEstimate({ ...nextEstimate });
  };

  const removeItem: EstimateContextValue['removeItem'] = (index) => {
    setEstimate(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const moveItem: EstimateContextValue['moveItem'] = (from, to) => {
    if (from === to) return;

    setEstimate(prev => {
      const nextItems = [...prev.items];
      const [removed] = nextItems.splice(from, 1);
      nextItems.splice(to, 0, removed);
      return { ...prev, items: nextItems };
    });
  };

  const updateItem: EstimateContextValue['updateItem'] = (index, item) => {
    setEstimate(prev => ({
      ...prev,
      items: prev.items.map((existing, i) => (i === index ? { ...existing, ...item } : existing))
    }));
  };

  const appendItems: EstimateContextValue['appendItems'] = (items) => {
    setEstimate(prev => ({
      ...prev,
      items: [...prev.items, ...items]
    }));
  };

  const resetEstimate = () => {
    setEstimate(createInitialEstimate());
    setCurrentEstimateId(null);
  };

  const hasDirtyState = () => hasMeaningfulEstimateData(estimate);

  const value = useMemo<EstimateContextValue>(() => ({
    estimate,
    currentEstimateId,
    setCurrentEstimateId,
    updateField,
    updateSupplier,
    updateClient,
    replaceEstimate,
    removeItem,
    moveItem,
    updateItem,
    appendItems,
    resetEstimate,
    hasDirtyState
  }), [estimate, currentEstimateId]);

  return (
    <EstimateContext.Provider value={value}>
      {children}
    </EstimateContext.Provider>
  );
};

export const useEstimate = () => {
  const context = useContext(EstimateContext);
  if (!context) {
    throw new Error('useEstimate must be used within an EstimateProvider');
  }
  return context;
};
