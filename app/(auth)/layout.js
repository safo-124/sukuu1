export const metadata = {
  title: 'Authentication — Sukuu',
  description: 'Secure authentication portal for Sukuu administrators and users.',
};

export default function AuthLayout({ children }) {
  return (
    <div className="auth-layout">
      {children}
    </div>
  );
}