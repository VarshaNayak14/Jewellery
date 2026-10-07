import { AdminPageWrapper } from './AdminDashboard';
import AccountSettings from '../../components/common/AccountSettings';
import AdminPaymentDetails from '../../components/admin/AdminPaymentDetails';

// Shared by Admin (/admin/profile) and Super Admin (/superadmin/profile) —
// same Wrapper pattern as every other admin screen.
export default function AdminProfile({ Wrapper = AdminPageWrapper }) {
  return (
    <Wrapper title="My Profile" subtitle="Update your account details and password.">
      <AccountSettings />
      <div className="mt-6"><AdminPaymentDetails /></div>
    </Wrapper>
  );
}