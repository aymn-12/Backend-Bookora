const router = require("express").Router();
const userCtrl = require("../controllers/user.controller");
const authMiddleware = require("../middlewares/OAuth.middlewares");
const verifiedMiddleware = require("../middlewares/verified.middleware");

router.get("/library",          authMiddleware, verifiedMiddleware, userCtrl.getLibrary);
router.post("/library/:bookId", authMiddleware, verifiedMiddleware, userCtrl.addToLibrary);
router.delete("/library/:bookId", authMiddleware, verifiedMiddleware, userCtrl.removeFromLibrary);

module.exports = router;