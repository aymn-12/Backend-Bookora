const router = require("express").Router();
const sectionCtrl = require("../controllers/section.controller");
const authMiddleware = require("../middlewares/OAuth.middlewares");
const roleMiddleware = require("../middlewares/role.middlewares");

router.get("/", sectionCtrl.getAllSections);
router.get("/:id", sectionCtrl.getSectionById);

router.post("/", authMiddleware, roleMiddleware(["admin", "superadmin"]), sectionCtrl.createSection);
router.put("/:id", authMiddleware, roleMiddleware(["admin", "superadmin"]), sectionCtrl.updateSection);
router.delete("/:id", authMiddleware, roleMiddleware(["admin", "superadmin"]), sectionCtrl.deleteSection);

// ─── إدارة كتب القسم
router.post("/:id/books",
    authMiddleware,
    roleMiddleware(["admin", "superadmin"]),
    sectionCtrl.addBookToSection
);

router.delete("/:id/books/:bookId",
    authMiddleware,
    roleMiddleware(["admin", "superadmin"]),
    sectionCtrl.removeBookFromSection
);

module.exports = router;
