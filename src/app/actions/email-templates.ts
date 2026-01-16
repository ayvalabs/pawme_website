'use server';

import { db } from '@/firebase/config';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, updateDoc, query, orderBy } from 'firebase/firestore';

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html: string;
  variables: string[];
  createdAt: string;
  updatedAt: string;
}

export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  const templatesRef = collection(db, 'emailTemplates');
  const q = query(templatesRef, orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  
  const templates: EmailTemplate[] = [];
  querySnapshot.forEach((doc) => {
    templates.push({ ...doc.data() } as EmailTemplate);
  });

  return templates;
}

export async function getEmailTemplate(templateId: string): Promise<EmailTemplate | null> {
  const templateRef = doc(db, 'emailTemplates', templateId);
  const templateSnap = await getDoc(templateRef);

  if (templateSnap.exists()) {
    return templateSnap.data() as EmailTemplate;
  }
  return null;
}

export async function createEmailTemplate(template: Omit<EmailTemplate, 'createdAt' | 'updatedAt'>): Promise<void> {
  const templateRef = doc(db, 'emailTemplates', template.id);
  await setDoc(templateRef, {
    ...template,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

export async function updateEmailTemplate(templateId: string, updates: Partial<EmailTemplate>): Promise<void> {
  const templateRef = doc(db, 'emailTemplates', templateId);
  await updateDoc(templateRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteEmailTemplate(templateId: string): Promise<void> {
  const templateRef = doc(db, 'emailTemplates', templateId);
  await deleteDoc(templateRef);
}
