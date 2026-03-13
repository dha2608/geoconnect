import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authApi } from '../../api/authApi';

export const register = createAsyncThunk('auth/register', async (data, { rejectWithValue }) => {
  try {
    const res = await authApi.register(data);
    localStorage.setItem('accessToken', res.data.accessToken);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data || { message: 'Registration failed' });
  }
});

export const login = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const res = await authApi.login(credentials);
    localStorage.setItem('accessToken', res.data.accessToken);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data || { message: 'Login failed' });
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
    localStorage.setItem('accessToken', res.data.accessToken);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data || { message: 'Guest login failed' });
  }
});

export const getMe = createAsyncThunk('auth/getMe', async (_, { rejectWithValue }) => {
  try {
    const res = await authApi.getMe();
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data || { message: 'Failed to get user' });
  }
});

export const forgotPassword = createAsyncThunk('auth/forgotPassword', async (email, { rejectWithValue }) => {
  try { const res = await authApi.forgotPassword(email); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data); }
});

export const resetPassword = createAsyncThunk('auth/resetPassword', async (data, { rejectWithValue }) => {
  try { const res = await authApi.resetPassword(data); return res.data; }
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
  },
  reducers: {
    clearError: (state) => { state.error = null; },
    setUser: (state, action) => { state.user = action.payload; state.isAuthenticated = true; },
    // Called by axios interceptor when refresh fails — avoids hard redirect
    forceLogout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.isGuest = false;
      state.loading = false;
      state.initialized = true;
      localStorage.removeItem('accessToken');
    },
  },
  extraReducers: (builder) => {
    // Register
    builder.addCase(register.pending, (state) => { state.loading = true; state.error = null; });
    builder.addCase(register.fulfilled, (state, action) => {
      state.loading = false; state.user = action.payload.user;
      state.isAuthenticated = true; state.isGuest = false;
    });
    builder.addCase(register.rejected, (state, action) => { state.loading = false; state.error = action.payload?.message; });
    // Login
    builder.addCase(login.pending, (state) => { state.loading = true; state.error = null; });
    builder.addCase(login.fulfilled, (state, action) => {
      state.loading = false; state.user = action.payload.user;
      state.isAuthenticated = true; state.isGuest = false;
    });
    builder.addCase(login.rejected, (state, action) => { state.loading = false; state.error = action.payload?.message; });
    // Logout
    builder.addCase(logout.fulfilled, (state) => {
      state.user = null; state.isAuthenticated = false; state.isGuest = false; state.loading = false;
    });
    // Guest
    builder.addCase(guestLogin.pending, (state) => { state.loading = true; state.error = null; });
    builder.addCase(guestLogin.fulfilled, (state, action) => {
      state.loading = false; state.user = action.payload.user;
      state.isAuthenticated = true; state.isGuest = true;
    });
    builder.addCase(guestLogin.rejected, (state, action) => { state.loading = false; state.error = action.payload?.message; });
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

export const { clearError, setUser, forceLogout } = authSlice.actions;
export default authSlice.reducer;
