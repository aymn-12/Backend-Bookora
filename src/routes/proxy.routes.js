const router = require("express").Router();
const proxyCtrl = require("../controllers/proxy.controller");

// GET /api/proxy/image?url=...
router.get("/image", proxyCtrl.proxyImage);

module.exports = router;
