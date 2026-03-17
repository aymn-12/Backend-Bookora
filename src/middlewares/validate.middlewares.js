const fs = require("fs");

module.exports = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body , {abortEarly : false})
        if(error) {
            
            // حذف الملفات المرفوعة مؤقتاً إذا فشل التحقق
            if (req.files) {
                if (req.files.bookFile && fs.existsSync(req.files.bookFile[0].path)) {
                    fs.unlinkSync(req.files.bookFile[0].path);
                }
                if (req.files.coverImage && fs.existsSync(req.files.coverImage[0].path)) {
                    fs.unlinkSync(req.files.coverImage[0].path);
                }
            }

            const errorMessage = error.details.map((detail) => detail.message).join(", ")
            console.log(errorMessage)
            return res.status(400).json({
                success: false, 
                message: "خطأ في البيانات المدخلة",
                errors: errorMessage
            })

        }
        next()
    }
}