import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { gamificationApi } from '../../api/gamificationApi';

// ─── Async Thunks ───────────────────────────────────────────────────────────

export const fetchMyProgress = createAsyncThunk(
  'gamification/fetchMyProgress',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await gamificationApi.getMyProgress();
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to fetch progress');
    }
  }
);

export const fetchUserProgress = createAsyncThunk(
  'gamification/fetchUserProgress',
  async (userId, { rejectWithValue }) => {
    try {
      const { data } = await gamificationApi.getUserProgress(userId);
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to fetch user progress');
    }
  }
);

export const performDailyLogin = createAsyncThunk(
  'gamification/dailyLogin',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await gamificationApi.dailyLogin();
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to record login');
    }
  }
);

export const fetchDailyChallenges = createAsyncThunk(
  'gamification/fetchDailyChallenges',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await gamificationApi.getDailyChallenges();
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to fetch challenges');
    }
  }
);

export const fetchAllAchievements = createAsyncThunk(
  'gamification/fetchAllAchievements',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await gamificationApi.getAllAchievements();
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to fetch achievements');
    }
  }
);

export const fetchLeaderboard = createAsyncThunk(
  'gamification/fetchLeaderboard',
  async (params = {}, { rejectWithValue }) => {
    try {
      const { data } = await gamificationApi.getLeaderboard(params);
      return { ...data.data, params };
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to fetch leaderboard');
    }
  }
);

export const fetchLevels = createAsyncThunk(
  'gamification/fetchLevels',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await gamificationApi.getLevels();
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to fetch levels');
    }
  }
);

export const fetchXPHistory = createAsyncThunk(
  'gamification/fetchXPHistory',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await gamificationApi.getXPHistory();
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || 'Failed to fetch XP history');
    }
  }
);

// ─── Slice ──────────────────────────────────────────────────────────────────

const initialState = {
  // My progress
  progress: null,
  progressLoading: false,
  progressError: null,

  // Achievements catalog
  achievements: [],
  achievementsLoading: false,

  // Daily challenges
  dailyChallenges: [],
  challengesLoading: false,

  // Leaderboard
  leaderboard: [],
  leaderboardMeta: null,
  myRank: null,
  leaderboardLoading: false,

  // Levels definitions
  levels: [],

  // XP history
  xpHistory: [],

  // XP popup queue (for animated notifications)
  xpPopups: [],

  // Other user progress (for profile viewing)
  viewedUserProgress: null,
};

const gamificationSlice = createSlice({
  name: 'gamification',
  initialState,
  reducers: {
    // Push an XP popup notification to the queue
    pushXPPopup(state, action) {
      state.xpPopups.push({
        id: Date.now(),
        ...action.payload,
      });
    },
    // Remove a displayed XP popup
    dismissXPPopup(state, action) {
      state.xpPopups = state.xpPopups.filter((p) => p.id !== action.payload);
    },
    // Clear all popups
    clearXPPopups(state) {
      state.xpPopups = [];
    },
    // Reset gamification state (on logout)
    resetGamification() {
      return initialState;
    },
    // Optimistic XP increment (for immediate UI feedback)
    optimisticXPGain(state, action) {
      if (state.progress) {
        state.progress.totalXP += action.payload.amount;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // ── My Progress ──
      .addCase(fetchMyProgress.pending, (state) => {
        state.progressLoading = true;
        state.progressError = null;
      })
      .addCase(fetchMyProgress.fulfilled, (state, action) => {
        state.progressLoading = false;
        state.progress = action.payload;
      })
      .addCase(fetchMyProgress.rejected, (state, action) => {
        state.progressLoading = false;
        state.progressError = action.payload;
      })

      // ── User Progress (profile view) ──
      .addCase(fetchUserProgress.fulfilled, (state, action) => {
        state.viewedUserProgress = action.payload;
      })

      // ── Daily Login ──
      .addCase(performDailyLogin.fulfilled, (state, action) => {
        if (state.progress) {
          state.progress.totalXP = action.payload.totalXP;
          state.progress.level = action.payload.level;
          state.progress.levelTitle = action.payload.levelTitle;
          state.progress.loginStreak = action.payload.streak;
        }
      })

      // ── Daily Challenges ──
      .addCase(fetchDailyChallenges.pending, (state) => {
        state.challengesLoading = true;
      })
      .addCase(fetchDailyChallenges.fulfilled, (state, action) => {
        state.challengesLoading = false;
        state.dailyChallenges = action.payload;
      })
      .addCase(fetchDailyChallenges.rejected, (state) => {
        state.challengesLoading = false;
      })

      // ── Achievements ──
      .addCase(fetchAllAchievements.pending, (state) => {
        state.achievementsLoading = true;
      })
      .addCase(fetchAllAchievements.fulfilled, (state, action) => {
        state.achievementsLoading = false;
        state.achievements = action.payload;
      })
      .addCase(fetchAllAchievements.rejected, (state) => {
        state.achievementsLoading = false;
      })

      // ── Leaderboard ──
      .addCase(fetchLeaderboard.pending, (state) => {
        state.leaderboardLoading = true;
      })
      .addCase(fetchLeaderboard.fulfilled, (state, action) => {
        state.leaderboardLoading = false;
        const { rankings, meta, myRank, params } = action.payload;
        state.leaderboard = rankings;
        state.leaderboardMeta = { ...meta, ...params };
        state.myRank = myRank;
      })
      .addCase(fetchLeaderboard.rejected, (state) => {
        state.leaderboardLoading = false;
      })

      // ── Levels ──
      .addCase(fetchLevels.fulfilled, (state, action) => {
        state.levels = action.payload;
      })

      // ── XP History ──
      .addCase(fetchXPHistory.fulfilled, (state, action) => {
        state.xpHistory = action.payload;
      });
  },
});

export const { pushXPPopup, dismissXPPopup, clearXPPopups, resetGamification, optimisticXPGain } =
  gamificationSlice.actions;

export default gamificationSlice.reducer;

// ─── Selectors ──────────────────────────────────────────────────────────────

const selectGamification = (state) => state.gamification;

export const selectProgress = createSelector(selectGamification, (g) => g.progress);
export const selectProgressLoading = createSelector(selectGamification, (g) => g.progressLoading);
export const selectTotalXP = createSelector(selectProgress, (p) => p?.totalXP ?? 0);
export const selectLevel = createSelector(selectProgress, (p) => p?.level ?? 1);
export const selectLevelTitle = createSelector(selectProgress, (p) => p?.levelTitle ?? 'Newcomer');
export const selectLoginStreak = createSelector(selectProgress, (p) => p?.loginStreak ?? 0);

export const selectAchievements = createSelector(selectGamification, (g) => g.achievements);
export const selectAchievementsLoading = createSelector(selectGamification, (g) => g.achievementsLoading);
export const selectEarnedAchievements = createSelector(selectAchievements, (achievements) =>
  achievements.filter((a) => a.earned)
);
export const selectUnearnedAchievements = createSelector(selectAchievements, (achievements) =>
  achievements.filter((a) => !a.earned)
);

export const selectDailyChallenges = createSelector(selectGamification, (g) => g.dailyChallenges);
export const selectChallengesLoading = createSelector(selectGamification, (g) => g.challengesLoading);

export const selectLeaderboard = createSelector(selectGamification, (g) => g.leaderboard);
export const selectLeaderboardLoading = createSelector(selectGamification, (g) => g.leaderboardLoading);
export const selectLeaderboardMeta = createSelector(selectGamification, (g) => g.leaderboardMeta);
export const selectMyRank = createSelector(selectGamification, (g) => g.myRank);

export const selectXPPopups = createSelector(selectGamification, (g) => g.xpPopups);
export const selectLevels = createSelector(selectGamification, (g) => g.levels);
export const selectXPHistory = createSelector(selectGamification, (g) => g.xpHistory);

export const selectViewedUserProgress = createSelector(selectGamification, (g) => g.viewedUserProgress);
