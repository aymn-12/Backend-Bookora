const router = require("express").Router();
const seriesCtrl     = require("../controllers/series.controller");
const authMiddleware = require("../middlewares/OAuth.middlewares");
const roleMiddleware = require("../middlewares/role.middlewares");

// ─── Public
router.get("/",    seriesCtrl.getAllSeries);
router.get("/:id", seriesCtrl.getSeriesById);

// ─── Admin + Superadmin
router.post("/",
    authMiddleware,
    roleMiddleware(["admin", "superadmin"]),
    seriesCtrl.createSeries
);

router.put("/:id",
    authMiddleware,
    roleMiddleware(["admin", "superadmin"]),
    seriesCtrl.updateSeries
);

router.delete("/:id",
    authMiddleware,
    roleMiddleware(["admin", "superadmin"]),
    seriesCtrl.deleteSeries
);

// ─── إدارة كتب السلسلة
router.post("/:id/books",
    authMiddleware,
    roleMiddleware(["admin", "superadmin"]),
    seriesCtrl.addBookToSeries
);

router.delete("/:id/books/:bookId",
    authMiddleware,
    roleMiddleware(["admin", "superadmin"]),
    seriesCtrl.removeBookFromSeries
);

module.exports = router;