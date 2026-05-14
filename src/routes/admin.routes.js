const router = require("express").Router();
const adminCtrl = require("../controllers/admin.controller");
const authMiddleware = require("../middlewares/OAuth.middlewares");
const roleMiddleware = require("../middlewares/role.middlewares");

// ─── Admin + Superadmin
router.get("/stats", authMiddleware, roleMiddleware(["admin", "superadmin"]), adminCtrl.getStats);
router.get("/stats/chart", authMiddleware, roleMiddleware(["admin", "superadmin"]), adminCtrl.getChartStats);
router.put("/books/:id/review", authMiddleware, roleMiddleware(["admin", "superadmin"]), adminCtrl.reviewBook);

// ─── Superadmin فقط
router.get("/users",            authMiddleware, roleMiddleware("superadmin"), adminCtrl.getAllUsers);
router.delete("/users/:id",     authMiddleware, roleMiddleware("superadmin"), adminCtrl.deleteUser);
router.put("/users/:id/role",   authMiddleware, roleMiddleware("superadmin"), adminCtrl.updateUserRole);
router.post("/create-user",                  authMiddleware, roleMiddleware("superadmin"), adminCtrl.createUser);
router.put("/users/:id/author-subscription", authMiddleware, roleMiddleware("superadmin"), adminCtrl.updateAuthorStatus);

module.exports = router;