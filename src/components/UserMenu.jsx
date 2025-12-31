'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth/AuthContext';
import { signOut } from '../lib/auth/supabaseAuth';

export default function UserMenu() {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const email = user?.email ?? 'Unknown user';
  const initials = user?.email?.[0]?.toUpperCase() ?? '?';

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/login');
      router.refresh();
    } catch (error) {
      alert(error.message || 'Unable to sign out. Please try again.');
    }
  };

  return (
    <div className="user-menu" onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className="user-chip"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <span className="avatar" aria-hidden>{initials}</span>
        <span className="email">{email}</span>
        <span className="chevron" aria-hidden>▾</span>
      </button>

      {open && (
        <div className="dropdown">
          <div className="identity">
            <span className="avatar large" aria-hidden>{initials}</span>
            <div className="details">
              <p className="label">Signed in as</p>
              <p className="value">{email}</p>
            </div>
          </div>
          <button className="dropdown-item danger" type="button" onClick={handleSignOut}>
            ⎋ Sign out
          </button>
        </div>
      )}

      <style jsx>{`
        .user-menu {
          position: relative;
          display: inline-flex;
        }

        .user-chip {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 6px 12px;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.5);
          background: rgba(255, 255, 255, 0.85);
          font-size: 13px;
          font-weight: 500;
          color: #1f2937;
          cursor: pointer;
          transition: box-shadow 0.2s ease, transform 0.1s ease;
        }

        .user-chip:hover {
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.15);
          transform: translateY(-1px);
        }

        .avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
        }

        .avatar.large {
          width: 44px;
          height: 44px;
          font-size: 18px;
        }

        .email {
          max-width: 160px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .chevron {
          font-size: 10px;
          color: #475569;
        }

        .dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          min-width: 220px;
          background: white;
          border-radius: 14px;
          padding: 16px;
          box-shadow: 0 24px 48px rgba(15, 23, 42, 0.16);
          border: 1px solid rgba(148, 163, 184, 0.2);
          z-index: 1200;
          display: grid;
          gap: 16px;
        }

        .identity {
          display: flex;
          align-items: center;
          gap: 14px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.2);
        }

        .details {
          display: grid;
          gap: 4px;
        }

        .label {
          margin: 0;
          font-size: 12px;
          color: #64748b;
        }

        .value {
          margin: 0;
          font-size: 14px;
          color: #0f172a;
          font-weight: 600;
          word-break: break-word;
        }

        .dropdown-item {
          border: none;
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 14px;
          text-align: left;
          background: rgba(59, 130, 246, 0.08);
          color: #1d4ed8;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s ease, transform 0.1s ease;
        }

        .dropdown-item:hover {
          background: rgba(59, 130, 246, 0.16);
          transform: translateX(2px);
        }

        .dropdown-item.danger {
          background: rgba(248, 113, 113, 0.12);
          color: #b91c1c;
        }

        .dropdown-item.danger:hover {
          background: rgba(248, 113, 113, 0.2);
        }

        @media (max-width: 640px) {
          .email {
            display: none;
          }

          .user-chip {
            padding: 6px 10px;
          }
        }
      `}</style>
    </div>
  );
}
