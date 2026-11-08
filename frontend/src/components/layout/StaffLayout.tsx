import type { PropsWithChildren } from 'react';
import AdminLayout from './AdminLayout';
type StaffLayoutProps = PropsWithChildren<{ title: string }>;
export default function StaffLayout({ children, title }: StaffLayoutProps) {
  return <AdminLayout title={title} eyebrow="EVENT OPERATIONS">{children}</AdminLayout>;
}
