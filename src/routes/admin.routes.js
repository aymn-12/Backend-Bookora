const router = require("express").Router();
const adminCtrl = require("../controllers/admin.controller");
const authMiddleware = require("../middlewares/OAuth.middlewares");
const roleMiddleware = require("../middlewares/role.middlewares");

// ─── Admin + Superadmin
router.get("/stats", authMiddleware, roleMiddleware(["admin", "superadmin"]), adminCtrl.getStats);

// ─── Superadmin فقط
router.get("/users",            authMiddleware, roleMiddleware("superadmin"), adminCtrl.getAllUsers);
router.delete("/users/:id",     authMiddleware, roleMiddleware("superadmin"), adminCtrl.deleteUser);
router.put("/users/:id/role",   authMiddleware, roleMiddleware("superadmin"), adminCtrl.updateUserRole);
router.post("/create-user", authMiddleware, roleMiddleware("superadmin"), adminCtrl.createUser);

module.exports = router;