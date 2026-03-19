import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    sidebarOpen: false,
    sidebarExpanded: false, // desktop: false = 72px icon-only, true = 240px with labels
    activePanel: null, // 'feed', 'messages', 'notifications', 'profile', 'search'
    modalOpen: null, // 'createPin', 'createPost', 'createEvent', 'pinDetail', etc.
    modalData: null,
    mapStyle: 'dark',
    isMobile: window.innerWidth < 768,
    isTablet: window.innerWidth >= 768 && window.innerWidth < 1024,
    activeMapTool: null, // 'draw' | 'measure' | 'route' | null
  },
  reducers: {
    toggleSidebar: (state) => { state.sidebarOpen = !state.sidebarOpen; },
    setSidebarOpen: (state, action) => { state.sidebarOpen = action.payload; },
    toggleSidebarExpanded: (state) => { state.sidebarExpanded = !state.sidebarExpanded; },
    setSidebarExpanded: (state, action) => { state.sidebarExpanded = action.payload; },
    setActivePanel: (state, action) => { state.activePanel = action.payload; state.sidebarOpen = true; },
    closePanel: (state) => { state.activePanel = null; state.sidebarOpen = false; },
    /** Clear panel without touching sidebar state — used on route navigation */
    clearActivePanel: (state) => { state.activePanel = null; },
    openModal: (state, action) => {
      if (typeof action.payload === 'string') {
        // openModal('createPin')
        state.modalOpen = action.payload;
        state.modalData = null;
      } else {
        // openModal({ type/modal: '...', data: {} })
        state.modalOpen = action.payload.modal ?? action.payload.type;
        state.modalData = action.payload.data ?? null;
      }
    },
    closeModal: (state) => { state.modalOpen = null; state.modalData = null; },
    setMapStyle: (state, action) => { state.mapStyle = action.payload; },
    setIsMobile: (state, action) => { state.isMobile = action.payload; },
    /** Compute both isMobile and isTablet from the current viewport width. */
    setDeviceSize: (state, action) => {
      const w = action.payload;
      state.isMobile = w < 768;
      state.isTablet = w >= 768 && w < 1024;
    },
    setActiveMapTool: (state, action) => { state.activeMapTool = action.payload; },
  },
});

export const {
  toggleSidebar, setSidebarOpen, toggleSidebarExpanded, setSidebarExpanded,
  setActivePanel, closePanel, clearActivePanel,
  openModal, closeModal, setMapStyle, setIsMobile, setDeviceSize, setActiveMapTool,
} = uiSlice.actions;
export default uiSlice.reducer;
