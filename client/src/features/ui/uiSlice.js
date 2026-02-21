import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    sidebarOpen: false,
    activePanel: null, // 'feed', 'messages', 'notifications', 'profile', 'search'
    modalOpen: null, // 'createPin', 'createPost', 'createEvent', 'pinDetail', etc.
    modalData: null,
    mapStyle: 'dark',
    isMobile: window.innerWidth < 768,
  },
  reducers: {
    toggleSidebar: (state) => { state.sidebarOpen = !state.sidebarOpen; },
    setSidebarOpen: (state, action) => { state.sidebarOpen = action.payload; },
    setActivePanel: (state, action) => { state.activePanel = action.payload; state.sidebarOpen = true; },
    closePanel: (state) => { state.activePanel = null; state.sidebarOpen = false; },
    openModal: (state, action) => { state.modalOpen = action.payload.type; state.modalData = action.payload.data || null; },
    closeModal: (state) => { state.modalOpen = null; state.modalData = null; },
    setMapStyle: (state, action) => { state.mapStyle = action.payload; },
    setIsMobile: (state, action) => { state.isMobile = action.payload; },
  },
});

export const { toggleSidebar, setSidebarOpen, setActivePanel, closePanel, openModal, closeModal, setMapStyle, setIsMobile } = uiSlice.actions;
export default uiSlice.reducer;
