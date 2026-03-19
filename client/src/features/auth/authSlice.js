import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authApi } from '../../api/authApi';

// Server responses use ok() wrapper: { success, data: { ... } }
// Helper to unwrap: res.data → { success, data } → extract inner data
const unwrap = (res) => res.data?.data ?? res.data;

export const register = createAsyncThunk('auth/register', async (data, { rejectWithValue }) => {
  try {
    const res = await authApi.register(data);
    const payload = unwrap(res);
    localStorage.setItem('accessToken', payload.accessToken);
    return payload;
  } catch (err) {
    return rejectWithValue(err.response?.data || { message: 'Registration failed' });
  }
});

export const login = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const res = await authApi.login(credentials);
    const payload = unwrap(res);
    if (payload.requires2FA) {
      return { requires2FA: true, tempToken: payload.tempToken };
    }
    localStorage.setItem('accessToken', payload.accessToken);
    return payload;
  } catch (err) {
    return rejectWithValue(err.response?.data || { message: 'Login failed' });
  }
});

export const login2FA = createAsyncThunk('auth/login2FA', async ({ tempToken, code }, { rejectWithValue }) => {
  try {
    const res = await authApi.login2FA({ tempToken, code });
    const payload = unwrap(res);
    localStorage.setItem('accessToken', payload.accessToken);
    return payload;
  } catch (err) {
    return rejectWithValue(err.response?.data || { message: '2FA verification failed' });
  }
});

export const loginWithBackupCode = createAsyncThunk('auth/loginWithBackupCode', async ({ tempToken, backupCode }, { rejectWithValue }) => {
  try {
    const res = await authApi.loginWithBackupCode({ tempToken, backupCode });
    const payload = unwrap(res);
    localStorage.setItem('accessToken', payload.accessToken);
    return payload;
  } catch (err) {
    return rejectWithValue(err.response?.data || { message: 'Backup code verification failed' });
  }
});

export const logout = createAsyncThunk('auth/logout', async (_, { rejectWithValue }) => {
  try {
    await authApi.logout();
    localStorage.removeItem('accessToken');
  } catch (err) {
    localStorage.removeItem('accessToken');
    return rejectWithValue(err.response?.data || { message: 'Logout failed' });
  }
});

export const guestLogin = createAsyncThunk('auth/guestLogin', async (_, { rejectWithValue }) => {
  try {
    const res = await authApi.guestLogin();
    const payload = unwrap(res);
    localStorage.setItem('accessToken', payload.accessToken);
    return payload;
  } catch (err) {
    return rejectWithValue(err.response?.data || { message: 'Guest login failed' });
  }
});

export const getMe = createAsyncThunk('auth/getMe', async (_, { rejectWithValue }) => {
  try {
    const res = await authApi.getMe();
    const payload = unwrap(res);
    return { user: payload };
  } catch (err) {
    return rejectWithValue(err.response?.data || { message: 'Failed to get user' });
  }
});

export const forgotPassword = createAsyncThunk('auth/forgotPassword', async (email, { rejectWithValue }) => {
  try { const res = await authApi.forgotPassword(email); return unwrap(res); }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const resetPassword = createAsyncThunk('auth/resetPassword', async (data, { rejectWithValue }) => {
  try { const res = await authApi.resetPassword(data); return unwrap(res); }
  catch (err) { return rejectWithValue(err.response?.data); }
});

// If a token exists in localStorage on startup, we should show a loading
// state until getMe resolves — otherwise ProtectedRoute immediately
// redirects to /login before we can verify the token.
const hasTokenOnLoad = !!localStorage.getItem('accessToken');

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    isAuthenticated: false,
    isGuest: false,
    loading: hasTokenOnLoad,   // true if token exists → show spinner until getMe resolves
    initialized: false,        // becomes true after first getMe attempt
    error: null,
    // 2FA login flow
    requires2FA: false,
    tempToken: null,
  },
  reducers: {
    clearError: (state) => { state.error = null; },
    setUser: (state, action) => { state.user = action.payload; state.isAuthenticated = true; },
    clear2FA: (state) => { state.requires2FA = false; state.tempToken = null; },
    // Called by axios interceptor when refresh fails — avoids hard redirect
    forceLogout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.isGuest = false;
      state.loading = false;
      state.initialized = true;
      state.requires2FA = false;
      state.tempToken = null;
      localStorage.removeItem('accessToken');
    },
  },
  extraReducers: (builder) => {
    // Register
    builder.addCase(register.pending, (state) => { state.loading = true; state.error = null; });
    builder.addCase(register.fulfilled, (state, action) => {
      state.loading = false; state.initialized = true; state.user = action.payload.user;
      state.isAuthenticated = true; state.isGuest = false;
    });
    builder.addCase(register.rejected, (state, action) => { state.loading = false; state.error = action.payload?.message; });
    // Login
    builder.addCase(login.pending, (state) => { state.loading = true; state.error = null; state.requires2FA = false; state.tempToken = null; });
    builder.addCase(login.fulfilled, (state, action) => {
      state.loading = false;
      if (action.payload.requires2FA) {
        state.requires2FA = true;
        state.tempToken = action.payload.tempToken;
      } else {
        state.initialized = true;
        state.user = action.payload.user;
        state.isAuthenticated = true; state.isGuest = false;
      }
    });
    builder.addCase(login.rejected, (state, action) => { state.loading = false; state.error = action.payload?.message; });
    // Login 2FA
    builder.addCase(login2FA.pending, (state) => { state.loading = true; state.error = null; });
    builder.addCase(login2FA.fulfilled, (state, action) => {
      state.loading = false; state.initialized = true; state.user = action.payload.user;
      state.isAuthenticated = true; state.isGuest = false;
      state.requires2FA = false; state.tempToken = null;
    });
    builder.addCase(login2FA.rejected, (state, action) => { state.loading = false; state.error = action.payload?.message; });
    // Login with backup code
    builder.addCase(loginWithBackupCode.pending, (state) => { state.loading = true; state.error = null; });
    builder.addCase(loginWithBackupCode.fulfilled, (state, action) => {
      state.loading = false; state.initialized = true; state.user = action.payload.user;
      state.isAuthenticated = true; state.isGuest = false;
      state.requires2FA = false; state.tempToken = null;
    });
    builder.addCase(loginWithBackupCode.rejected, (state, action) => { state.loading = false; state.error = action.payload?.message; });
    // Logout
    builder.addCase(logout.fulfilled, (state) => {
      state.user = null; state.isAuthenticated = false; state.isGuest = false; state.loading = false;
    });
    // Guest
    builder.addCase(guestLogin.pending, (state) => { state.loading = true; state.error = null; });
    builder.addCase(guestLogin.fulfilled, (state, action) => {
      state.loading = false; state.initialized = true; state.user = action.payload.user;
      state.isAuthenticated = true; state.isGuest = true;
    });
    builder.addCase(guestLogin.rejected, (state, action) => { state.loading = false; state.initialized = true; state.error = action.payload?.message; });
    // getMe
    builder.addCase(getMe.pending, (state) => { state.loading = true; });
    builder.addCase(getMe.fulfilled, (state, action) => {
      state.loading = false; state.initialized = true;
      state.user = action.payload.user; state.isAuthenticated = true;
      state.isGuest = !!action.payload.user?.isGuest;
    });
    builder.addCase(getMe.rejected, (state) => {
      state.loading = false; state.initialized = true;
      state.isAuthenticated = false; state.user = null;
      localStorage.removeItem('accessToken');
    });
  },
});

export const { clearError, setUser, clear2FA, forceLogout } = authSlice.actions;
export default authSlice.reducer;
