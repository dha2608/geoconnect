import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import mapReducer from '../features/map/mapSlice';
import pinReducer from '../features/pins/pinSlice';
import postReducer from '../features/posts/postSlice';
import eventReducer from '../features/events/eventSlice';
import userReducer from '../features/users/userSlice';
import notificationReducer from '../features/notifications/notificationSlice';
import messageReducer from '../features/messages/messageSlice';
import uiReducer from '../features/ui/uiSlice';
import { offlineCacheMiddleware } from '../middleware/offlineCacheMiddleware';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    map: mapReducer,
    pins: pinReducer,
    posts: postReducer,
    events: eventReducer,
    users: userReducer,
    notifications: notificationReducer,
    messages: messageReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(offlineCacheMiddleware),
});
