const { Resend } = require("resend")
const resend =  new Resend(process.env.RESEND_API_KEY);

const verifyEmailTemplate = (otp) => ({
    subject: "Verify your email — Bookora",
    html: `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0; padding:0; background-color:#f4f4f5; font-family: Arial, sans-serif;">
        
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5; padding: 40px 0;">
            <tr>
                <td align="center">
                    <table width="520" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                        
                        <!-- Header -->
                        <tr>
                            <td align="center" style="background-color:#4F46E5; padding: 36px 40px;">
                                <h1 style="margin:0; color:#ffffff; font-size:26px; font-weight:700; letter-spacing:-0.5px;">Bookora</h1>
                            </td>
                        </tr>

                        <!-- Body -->
                        <tr>
                            <td style="padding: 40px;">
                                
                                <h2 style="margin:0 0 12px 0; color:#111827; font-size:20px; font-weight:700;">
                                    Verify your email address
                                </h2>
                                <p style="margin:0 0 28px 0; color:#6b7280; font-size:15px; line-height:1.6;">
                                    Use the code below to verify your email. This code expires in <strong>10 minutes</strong>.
                                </p>

                                <!-- OTP Box -->
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td align="center" style="background-color:#f9fafb; border: 2px dashed #e5e7eb; border-radius:10px; padding: 28px;">
                                            <p style="margin:0 0 6px 0; color:#6b7280; font-size:13px; text-transform:uppercase; letter-spacing:2px;">
                                                Verification Code
                                            </p>
                                            <p style="margin:0; color:#4F46E5; font-size:42px; font-weight:800; letter-spacing:12px;">
                                                ${otp}
                                            </p>
                                        </td>
                                    </tr>
                                </table>

                                <p style="margin:28px 0 0 0; color:#6b7280; font-size:13px; line-height:1.6;">
                                    If you didn't create an account with Bookora, you can safely ignore this email.
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
                                    © 2026 Bookora. All rights reserved.
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
    subject: "Reset your password — Bookora",
    html: `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0; padding:0; background-color:#f4f4f5; font-family: Arial, sans-serif;">
        
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5; padding: 40px 0;">
            <tr>
                <td align="center">
                    <table width="520" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                        
                        <!-- Header -->
                        <tr>
                            <td align="center" style="background-color:#DC2626; padding: 36px 40px;">
                                <h1 style="margin:0; color:#ffffff; font-size:26px; font-weight:700; letter-spacing:-0.5px;">Bookora</h1>
                            </td>
                        </tr>

                        <!-- Body -->
                        <tr>
                            <td style="padding: 40px;">
                                
                                <h2 style="margin:0 0 12px 0; color:#111827; font-size:20px; font-weight:700;">
                                    Reset your password
                                </h2>
                                <p style="margin:0 0 28px 0; color:#6b7280; font-size:15px; line-height:1.6;">
                                    We received a request to reset your password. Use the code below — it expires in <strong>10 minutes</strong>.
                                </p>

                                <!-- OTP Box -->
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td align="center" style="background-color:#fef2f2; border: 2px dashed #fecaca; border-radius:10px; padding: 28px;">
                                            <p style="margin:0 0 6px 0; color:#6b7280; font-size:13px; text-transform:uppercase; letter-spacing:2px;">
                                                Reset Code
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
                                        <td style="background-color:#fffbeb; border-left: 4px solid #f59e0b; border-radius:6px; padding: 14px 16px;">
                                            <p style="margin:0; color:#92400e; font-size:13px; line-height:1.6;">
                                                ⚠️ If you didn't request a password reset, please secure your account immediately.
                                            </p>
                                        </td>
                                    </tr>
                                </table>

                                <p style="margin:28px 0 0 0; color:#6b7280; font-size:13px; line-height:1.6;">
                                    This code can only be used once and will expire in 10 minutes.
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
                                    © 2026 Bookora. All rights reserved.
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



const sendEmail = async ({to , subject , html}) => {
    
    await resend.emails.send({
        from : "onboarding@resend.dev",
        to,
        subject,
        html
    })
    
}

module.exports = { sendEmail, verifyEmailTemplate, resetPasswordTemplate };