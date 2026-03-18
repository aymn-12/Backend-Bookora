module.exports = (roles) => { 
    return (req, res, next) => {
        const userRole = req.user?.role?.toLowerCase();
        const requiredRoles = Array.isArray(roles) 
            ? roles.map(r => r.toLowerCase()) 
            : [roles.toLowerCase()];

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