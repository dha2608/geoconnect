import Review from '../models/Review.js';
import Pin from '../models/Pin.js';
import { createNotification } from '../utils/createNotification.js';

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

export const getReviews = async (req, res) => {
  try {
    const { sort = 'newest' } = req.query;
    let sortOption = { createdAt: -1 };
    if (sort === 'highest') sortOption = { rating: -1 };
    if (sort === 'helpful') sortOption = { helpfulVotes: -1 };
    
    const reviews = await Review.find({ pin: req.params.pinId })
      .populate('user', 'name avatar')
      .sort(sortOption);
    
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const createReview = async (req, res) => {
  try {
    const existing = await Review.findOne({ pin: req.params.pinId, user: req.user._id });
    if (existing) {
      return res.status(400).json({ message: 'You already reviewed this pin' });
    }

    const pin = await Pin.findById(req.params.pinId);
    if (!pin) return res.status(404).json({ message: 'Pin not found' });
    
    const review = await Review.create({
      pin: req.params.pinId,
      user: req.user._id,
      rating: req.body.rating,
      text: req.body.text,
      photo: req.body.photo || '',
    });
    
    await updatePinRating(review.pin);

    // Notify pin creator
    await createNotification(req, {
      recipientId: pin.createdBy,
      senderId: req.user._id,
      type: 'review',
      data: { pinId: pin._id, pinTitle: pin.title, rating: req.body.rating },
    });

    const populated = await review.populate('user', 'name avatar');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    if (review.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    if (req.body.rating) review.rating = req.body.rating;
    if (req.body.text !== undefined) review.text = req.body.text;
    await review.save();
    
    await updatePinRating(review.pin);
    const populated = await review.populate('user', 'name avatar');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    if (review.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const pinId = review.pin;
    await review.deleteOne();
    await updatePinRating(pinId);
    
    res.json({ message: 'Review deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const voteHelpful = async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.reviewId,
      { $addToSet: { helpfulVotes: req.user._id } },
      { new: true }
    ).populate('user', 'name avatar');
    if (!review) return res.status(404).json({ message: 'Review not found' });
    res.json(review);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const unvoteHelpful = async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.reviewId,
      { $pull: { helpfulVotes: req.user._id } },
      { new: true }
    ).populate('user', 'name avatar');
    if (!review) return res.status(404).json({ message: 'Review not found' });
    res.json(review);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
