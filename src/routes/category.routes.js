const router = require("express").Router();
const categoryCtrl = require("../controllers/category.controller");
const authMiddleware = require("../middlewares/OAuth.middlewares");
const roleMiddleware = require("../middlewares/role.middlewares");

router.get("/", categoryCtrl.getAllCategories);
router.get("/:id", categoryCtrl.getCategoryById);

router.post("/", authMiddleware, roleMiddleware(["admin", "superadmin"]), categoryCtrl.createCategory);
router.put("/:id", authMiddleware, roleMiddleware(["admin", "superadmin"]), categoryCtrl.updateCategory);
router.delete("/:id", authMiddleware, roleMiddleware(["admin", "superadmin"]), categoryCtrl.deleteCategory);

module.exports = router;