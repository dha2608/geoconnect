import API from './axios';

export const gamificationApi = {
  // Progress
  getMyProgress: () => API.get('/gamification/me'),
  getUserProgress: (userId) => API.get(`/gamification/users/${userId}`),

  // Daily login
  dailyLogin: () => API.post('/gamification/daily-login'),

  // Daily challenges
  getDailyChallenges: () => API.get('/gamification/daily-challenges'),

  // Achievements
  getAllAchievements: () => API.get('/gamification/achievements'),

  // Leaderboard
  getLeaderboard: (params) => API.get('/gamification/leaderboard', { params }),

  // Levels
  getLevels: () => API.get('/gamification/levels'),

  // XP history
  getXPHistory: () => API.get('/gamification/xp-history'),

  // Admin: seed achievements
  seedAchievements: () => API.post('/gamification/seed'),
};
