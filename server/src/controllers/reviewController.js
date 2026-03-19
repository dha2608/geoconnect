import Review from '../models/Review.js';
import Pin from '../models/Pin.js';
import { createNotification } from '../utils/createNotification.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError, ERR } from '../utils/errors.js';
import { ok, created, paginated, noContent, message } from '../utils/response.js';
import { uploadToCloudinary } from '../middleware/upload.js';
import { awardXP, incrementDailyChallenge } from '../services/xpService.js';
import { checkAchievements } from '../services/achievementChecker.js';

const updatePinRating = async (pinId) => {
  const stats = await Review.aggregate([
    { $match: { pin: pinId } },
    { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  if (stats.length > 0) {
    await Pin.findByIdAndUpdate(pinId, {
      averageRating: Math.round(stats[0].avgRating * 10) / 10,
      reviewCount: stats[0].count,
    });
  } else {
    await Pin.findByIdAndUpdate(pinId, { averageRating: 0, reviewCount: 0 });
  }
};

export const getReviews = asyncHandler(async (req, res) => {
  const { sort = 'newest' } = req.query;
  let sortOption = { createdAt: -1 };
  if (sort === 'highest') sortOption = { rating: -1 };
  if (sort === 'helpful') sortOption = { helpfulVotes: -1 };

  const reviews = await Review.find({ pin: req.params.pinId })
    .populate('user', 'name avatar')
    .sort(sortOption);

  return ok(res, reviews);
});

export const createReview = asyncHandler(async (req, res) => {
  const existing = await Review.findOne({ pin: req.params.pinId, user: req.user._id });
  if (existing) {
    throw AppError.badRequest('You already reviewed this pin');
  }

  const pin = await Pin.findById(req.params.pinId);
  if (!pin) throw AppError.notFound('Pin not found');

  // Upload photos if provided
  const photos = [];
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      const url = await uploadToCloudinary(file.buffer, 'geoconnect/reviews');
      photos.push(url);
    }
  }

  const review = await Review.create({
    pin: req.params.pinId,
    user: req.user._id,
    rating: req.body.rating,
    text: req.body.text,
    photos,
  });

  await updatePinRating(review.pin);

  // Notify pin creator
  await createNotification(req, {
    recipientId: pin.createdBy,
    senderId: req.user._id,
    type: 'review',
    data: { pinId: pin._id, pinTitle: pin.title, rating: req.body.rating },
  });

  // Gamification: award XP for writing a review (fire-and-forget)
  awardXP(req.user._id, 'REVIEW_CREATE', { pinId: pin._id, reviewId: review._id }).catch((err) => console.error('[Gamification] awardXP REVIEW_CREATE failed:', err.message));
  incrementDailyChallenge(req.user._id, 'write_review').catch((err) => console.error('[Gamification] incrementDailyChallenge write_review failed:', err.message));
  checkAchievements(req.user._id, 'REVIEW_CREATE').catch((err) => console.error('[Gamification] checkAchievements REVIEW_CREATE failed:', err.message));

  const populated = await review.populate('user', 'name avatar');
  return created(res, populated);
});

export const updateReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.reviewId);
  if (!review) throw AppError.notFound('Review not found');
  if (review.user.toString() !== req.user._id.toString()) {
    throw new AppError(ERR.FORBIDDEN, 'Not authorized');
  }

  if (req.body.rating) review.rating = req.body.rating;
  if (req.body.text !== undefined) review.text = req.body.text;

  // Handle new photos
  if (req.files && req.files.length > 0) {
    const newPhotos = [];
    for (const file of req.files) {
      const url = await uploadToCloudinary(file.buffer, 'geoconnect/reviews');
      newPhotos.push(url);
    }
    // Keep existing photos user wants to keep + add new ones
    const keepPhotos = req.body.keepPhotos ? JSON.parse(req.body.keepPhotos) : [];
    review.photos = [...keepPhotos, ...newPhotos];
  } else if (req.body.keepPhotos) {
    review.photos = JSON.parse(req.body.keepPhotos);
  }

  await review.save();

  await updatePinRating(review.pin);
  const populated = await review.populate('user', 'name avatar');
  return ok(res, populated);
});

export const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.reviewId);
  if (!review) throw AppError.notFound('Review not found');
  if (review.user.toString() !== req.user._id.toString()) {
    throw new AppError(ERR.FORBIDDEN, 'Not authorized');
  }

  const pinId = review.pin;
  await review.deleteOne();
  await updatePinRating(pinId);

  return message(res, 'Review deleted');
});

export const voteHelpful = asyncHandler(async (req, res) => {
  const review = await Review.findByIdAndUpdate(
    req.params.reviewId,
    { $addToSet: { helpfulVotes: req.user._id } },
    { new: true }
  ).populate('user', 'name avatar');
  if (!review) throw AppError.notFound('Review not found');
  return ok(res, review);
});

export const unvoteHelpful = asyncHandler(async (req, res) => {
  const review = await Review.findByIdAndUpdate(
    req.params.reviewId,
    { $pull: { helpfulVotes: req.user._id } },
    { new: true }
  ).populate('user', 'name avatar');
  if (!review) throw AppError.notFound('Review not found');
  return ok(res, review);
});

export const respondToReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.reviewId).populate('user', 'name avatar');
  if (!review) throw AppError.notFound('Review not found');

  // Only pin owner can respond
  const pin = await Pin.findById(review.pin);
  if (!pin) throw AppError.notFound('Pin not found');
  if (pin.createdBy.toString() !== req.user._id.toString()) {
    throw new AppError(ERR.FORBIDDEN, 'Only pin owner can respond to reviews');
  }

  review.ownerResponse = {
    text: req.body.text,
    respondedAt: new Date(),
  };
  await review.save();

  // Notify reviewer
  await createNotification(req, {
    recipientId: review.user._id,
    senderId: req.user._id,
    type: 'review',
    data: { pinId: pin._id, pinTitle: pin.title, message: 'Owner responded to your review' },
  });

  return ok(res, review);
});

export const deleteResponse = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.reviewId);
  if (!review) throw AppError.notFound('Review not found');

  const pin = await Pin.findById(review.pin);
  if (!pin) throw AppError.notFound('Pin not found');
  if (pin.createdBy.toString() !== req.user._id.toString()) {
    throw new AppError(ERR.FORBIDDEN, 'Only pin owner can manage responses');
  }

  review.ownerResponse = undefined;
  await review.save();

  const populated = await review.populate('user', 'name avatar');
  return ok(res, populated);
});
