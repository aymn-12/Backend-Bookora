const router = require("express").Router({ mergeParams: true });
const reviewCtrl = require("../controllers/review.controller");
const authMiddleware = require("../middlewares/OAuth.middlewares");
const verifiedMiddleware = require("../middlewares/verified.middleware");

// ─── Public
router.get("/", reviewCtrl.getBookReviews);

// ─── Protected
router.post("/",               authMiddleware, verifiedMiddleware, reviewCtrl.addReview);
router.delete("/:reviewId",    authMiddleware,                     reviewCtrl.deleteReview);

module.exports = router;