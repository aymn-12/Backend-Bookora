const express = require("express");
const router = express.Router();
const { 
    createRequest, 
    getAllRequests, 
    updateRequestStatus, 
    bulkUpdateRequestStatus,
    deleteRequest 
} = require("../controllers/bookRequest.controller");
const authMiddleware = require("../middlewares/OAuth.middlewares");
const roleMiddleware = require("../middlewares/role.middlewares");

router.use(authMiddleware);

router.post("/", createRequest);

// Admin only routes
router.get("/", roleMiddleware(["admin", "superadmin"]), getAllRequests);
router.patch("/bulk-status", roleMiddleware(["admin", "superadmin"]), bulkUpdateRequestStatus);
router.patch("/:id", roleMiddleware(["admin", "superadmin"]), updateRequestStatus);
router.delete("/:id", roleMiddleware(["admin", "superadmin"]), deleteRequest);

module.exports = router;
