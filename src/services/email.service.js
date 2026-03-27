const axios = require("axios");

// Brevo API configuration
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const BREVO_API_KEY = process.env.BREVO_API_KEY;

const bookRequestStatusTemplate = (status, bookTitle) => {
  const config = {
    approved: {
      subject: `✅ تمت الموافقة على طلبك — ${bookTitle}`,
      color: "#4F46E5",
      title: "تمت الموافقة على طلبك!",
      message: `وافقنا على طلب كتاب <strong>${bookTitle}</strong> وسنعمل على توفيره قريباً.`,
    },
    fulfilled: {
      subject: `📚 الكتاب متاح الآن — ${bookTitle}`,
      color: "#059669",
      title: "الكتاب أصبح متاحاً!",
      message: `كتاب <strong>${bookTitle}</strong> أصبح متاحاً الآن في المكتبة!`,
    },
    rejected: {
      subject: `❌ بخصوص طلبك — ${bookTitle}`,
      color: "#DC2626",
      title: "لم نتمكن من توفير الكتاب",
      message: `نأسف، لم نتمكن من توفير كتاب <strong>${bookTitle}</strong> حالياً.`,
    },
  };

  const { color, title, message, subject } = config[status];

  return {
    subject,
    html: `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
        <tr><td align="center">
          <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;">
            <tr>
              <td align="center" style="background:${color};padding:36px 40px;">
                <h1 style="margin:0;color:#fff;font-size:26px;">بُكورا</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:40px;text-align:right;">
                <h2 style="margin:0 0 12px;color:#111827;">${title}</h2>
                <p style="margin:0 0 24px;color:#6b7280;line-height:1.6;">${message}</p>
                <div style="background:#f9fafb;border:2px dashed #e5e7eb;border-radius:10px;padding:20px;text-align:center;">
                  <p style="margin:0;font-weight:700;">📖 ${bookTitle}</p>
                </div>
                <p style="margin:24px 0 0;color:#9ca3af;font-size:13px;">شكراً لاستخدامك بُكورا 💜</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:24px;border-top:1px solid #f3f4f6;">
                <p style="margin:0;color:#9ca3af;font-size:12px;">© 2026 بُكورا. جميع الحقوق محفوظة.</p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>`
  };
};

const verifyEmailTemplate = (otp) => ({
    subject: "رمز التحقق الخاص بك — بُكورا",
    html: `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0; padding:0; background-color:#f4f4f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5; padding: 40px 0;">
            <tr>
                <td align="center">
                    <table width="520" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                        
                        <!-- Header -->
                        <tr>
                            <td align="center" style="background-color:#4F46E5; padding: 36px 40px;">
                                <h1 style="margin:0; color:#ffffff; font-size:26px; font-weight:700; letter-spacing:-0.5px;">بُكورا</h1>
                            </td>
                        </tr>

                        <!-- Body -->
                        <tr>
                            <td style="padding: 40px; text-align: right;">
                                
                                <h2 style="margin:0 0 12px 0; color:#111827; font-size:20px; font-weight:700;">
                                    تأكيد البريد الإلكتروني
                                </h2>
                                <p style="margin:0 0 28px 0; color:#6b7280; font-size:15px; line-height:1.6;">
                                    استخدم الرمز التالي لتفعيل حسابك. هذا الرمز صالح لمدة <strong>10 دقائق</strong> فقط.
                                </p>

                                <!-- OTP Box -->
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td align="center" style="background-color:#f9fafb; border: 2px dashed #e5e7eb; border-radius:10px; padding: 28px;">
                                            <p style="margin:0 0 6px 0; color:#6b7280; font-size:13px; text-transform:uppercase; letter-spacing:2px;">
                                                رمز التحقق
                                            </p>
                                            <p style="margin:0; color:#4F46E5; font-size:42px; font-weight:800; letter-spacing:12px;">
                                                ${otp}
                                            </p>
                                        </td>
                                    </tr>
                                </table>

                                <p style="margin:28px 0 0 0; color:#6b7280; font-size:13px; line-height:1.6;">
                                    إذا لم تقم بإنشاء حساب في بُكورا، يمكنك تجاهل هذا البريد بأمان.
                                </p>

                            </td>
                        </tr>

                        <!-- Divider -->
                        <tr>
                            <td style="padding: 0 40px;">
                                <hr style="border:none; border-top:1px solid #f3f4f6; margin:0;">
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td align="center" style="padding: 24px 40px;">
                                <p style="margin:0; color:#9ca3af; font-size:12px;">
                                    © 2026 بُكورا. جميع الحقوق محفوظة.
                                </p>
                            </td>
                        </tr>

                    </table>
                </td>
            </tr>
        </table>

    </body>
    </html>
    `
});


const resetPasswordTemplate = (otp) => ({
    subject: "إعادة تعيين كلمة المرور — بُكورا",
    html: `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0; padding:0; background-color:#f4f4f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5; padding: 40px 0;">
            <tr>
                <td align="center">
                    <table width="520" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                        
                        <!-- Header -->
                        <tr>
                            <td align="center" style="background-color:#DC2626; padding: 36px 40px;">
                                <h1 style="margin:0; color:#ffffff; font-size:26px; font-weight:700; letter-spacing:-0.5px;">بُكورا</h1>
                            </td>
                        </tr>

                        <!-- Body -->
                        <tr>
                            <td style="padding: 40px; text-align: right;">
                                
                                <h2 style="margin:0 0 12px 0; color:#111827; font-size:20px; font-weight:700;">
                                    إعادة تعيين كلمة المرور
                                </h2>
                                <p style="margin:0 0 28px 0; color:#6b7280; font-size:15px; line-height:1.6;">
                                    لقد تلقينا طلباً لإعادة تعيين كلمة مرور حسابك. استخدم الرمز التالي، علماً بأنه صالح لمدة <strong>10 دقائق</strong>.
                                </p>

                                <!-- OTP Box -->
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td align="center" style="background-color:#fef2f2; border: 2px dashed #fecaca; border-radius:10px; padding: 28px;">
                                            <p style="margin:0 0 6px 0; color:#6b7280; font-size:13px; text-transform:uppercase; letter-spacing:2px;">
                                                رمز إعادة التعيين
                                            </p>
                                            <p style="margin:0; color:#DC2626; font-size:42px; font-weight:800; letter-spacing:12px;">
                                                ${otp}
                                            </p>
                                        </td>
                                    </tr>
                                </table>

                                <!-- Warning -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                                    <tr>
                                        <td style="background-color:#fffbeb; border-right: 4px solid #f59e0b; border-radius:6px; padding: 14px 16px; text-align: right;">
                                            <p style="margin:0; color:#92400e; font-size:13px; line-height:1.6;">
                                                ⚠️ إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تأمين حسابك فوراً.
                                            </p>
                                        </td>
                                    </tr>
                                </table>

                                <p style="margin:28px 0 0 0; color:#6b7280; font-size:13px; line-height:1.6;">
                                    هذا الرمز يُستخدم لمرة واحدة فقط.
                                </p>

                            </td>
                        </tr>

                        <!-- Divider -->
                        <tr>
                            <td style="padding: 0 40px;">
                                <hr style="border:none; border-top:1px solid #f3f4f6; margin:0;">
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td align="center" style="padding: 24px 40px;">
                                <p style="margin:0; color:#9ca3af; font-size:12px;">
                                    © 2026 بُكورا. جميع الحقوق محفوظة.
                                </p>
                            </td>
                        </tr>

                    </table>
                </td>
            </tr>
        </table>

    </body>
    </html>
    `
});

const sendEmail = async ({ to, subject, html }) => {
    try {
        await axios.post(
            BREVO_API_URL,
            {
                sender: { name: "بُكورا (Bookora)", email: "no-reply@bkora.online" },
                to: [{ email: to }],
                subject: subject,
                htmlContent: html
            },
            {
                headers: {
                    "accept": "application/json",
                    "api-key": BREVO_API_KEY,
                    "content-type": "application/json"
                }
            }
        );
    } catch (error) {
        // Log the real error for debugging
        console.error("Brevo Email Error Details:", {
            message: error.message,
            response: error.response?.data,
            code: error.code
        });
        
        // Hide technical details from the user
        const friendlyError = new Error("عذراً، فشل إرسال الرمز إلى بريدك الإلكتروني. يرجى مراجعة البريد والمحاولة مرة أخرى.");
        friendlyError.status = 503; // Service Unavailable
        throw friendlyError;
    }
}

module.exports = { sendEmail, verifyEmailTemplate, resetPasswordTemplate, bookRequestStatusTemplate };