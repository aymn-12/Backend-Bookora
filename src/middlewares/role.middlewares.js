module.exports = (roles) => { 
    return (req, res, next) => {
        const userRole = req.user?.role?.toLowerCase();
        const requiredRoles = Array.isArray(roles) 
            ? roles.map(r => r.toLowerCase()) 
            : [roles.toLowerCase()];

        console.log("--- Authorization Debug ---");
        console.log("User ID:", req.user?._id);
        console.log("User Role (Raw):", req.user?.role);
        console.log("User Role (Processed):", userRole);
        console.log("Required Roles:", requiredRoles);
        console.log("Is Authorized:", userRole && requiredRoles.includes(userRole));
        console.log("---------------------------");

        if(!userRole || !requiredRoles.includes(userRole)){
            return res.status(403).json({ 
                success: false,
                message: "عذراً، لا تملك الصلاحيات الكافية. دورك الحالي هو: " + (req.user?.role || "غير معروف"),
                debug: {
                    yourRole: req.user?.role,
                    expectedRoles: roles
                }
            });
        }
        next()
    }
}