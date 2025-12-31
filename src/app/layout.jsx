import { AuthProvider } from '../lib/auth/AuthContext';

export const metadata = {
  title: 'Bus Schedule Management System',
  description: 'Manage bus schedules, routes, and generate formatted reports',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
