import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { setActivePanel, openModal } from '../../features/ui/uiSlice';

const navItems = [
  { id: 'feed', label: 'Feed', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'explore', label: 'Explore', icon: 'M12 2C6.477 2 2 6.477 2 12C2 17.523 6.477 22 12 22C17.523 22 22 17.523 22 12C22 6.477 17.523 2 12 2ZM16.24 7.76L14.12 14.12L7.76 16.24L9.88 9.88Z', path: '/explore' },
  { id: 'create', label: 'Create', icon: 'M12 4v16m8-8H4', isAction: true },
  { id: 'events', label: 'Events', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { id: 'profile', label: 'Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
];

export default function MobileNav() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { activePanel } = useSelector((state) => state.ui);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 glass border-t border-surface-divider flex items-center justify-around h-16 px-2 lg:hidden">

      {/* Create-choice popup — appears above the Create button */}
      {createMenuOpen && (
        <>
          {/* Backdrop to dismiss */}
          <div
            className="fixed inset-0 z-[-1]"
            onClick={() => setCreateMenuOpen(false)}
          />
           <div className="absolute bottom-[72px] left-1/2 -translate-x-1/2 flex gap-4 glass px-5 py-3 shadow-xl">
            <button
              onClick={() => {
                setCreateMenuOpen(false);
                dispatch(openModal({ type: 'createPin' }));
              }}
              className="flex flex-col items-center gap-1.5 text-txt-secondary hover:text-accent-primary transition-colors"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
              <span className="text-[10px]">Pin</span>
            </button>

            <div className="w-px bg-surface-divider self-stretch" />

            <button
              onClick={() => {
                setCreateMenuOpen(false);
                dispatch(openModal({ type: 'createEvent' }));
              }}
              className="flex flex-col items-center gap-1.5 text-txt-secondary hover:text-accent-primary transition-colors"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-[10px]">Event</span>
            </button>
          </div>
        </>
      )}

      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => {
            if (item.isAction) {
              setCreateMenuOpen((prev) => !prev);
            } else if (item.path) {
              setCreateMenuOpen(false);
              navigate(item.path);
            } else {
              setCreateMenuOpen(false);
              dispatch(setActivePanel(activePanel === item.id ? null : item.id));
            }
          }}
          className={`flex flex-col items-center justify-center gap-0.5 w-14 h-14 rounded-xl transition-all
            ${item.isAction
              ? 'bg-accent-primary text-white rounded-2xl scale-105 shadow-[0_0_20px_rgba(59,130,246,0.3)]'
              : (item.path ? location.pathname === item.path : activePanel === item.id)
                ? 'text-accent-primary'
                : 'text-txt-muted'
            }`}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={item.isAction ? 2.5 : 1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d={item.icon} />
          </svg>
          {!item.isAction && <span className="text-[10px]">{item.label}</span>}
        </button>
      ))}
    </nav>
  );
}
