// app/AuthProvider.jsx (or .js)
'use client'; // SessionProvider needs to be a client component

import { SessionProvider } from 'next-auth/react';

export default function AuthProvider({ children, session }) {
  return (
    <SessionProvider session={session}>
      {children}
    </SessionProvider>
  );
}