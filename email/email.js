const nodemailer = require("nodemailer");

const {
  auth
} = require("../config/firebase");


// ============================================================
// SMTP TRANSPORT
// ============================================================

const transporter =
  nodemailer.createTransport({

    host:
      process.env.SMTP_HOST,

    port:
      Number(process.env.SMTP_PORT || 587),

    secure:
      process.env.SMTP_SECURE === "true",

    auth: {

      user:
        process.env.SMTP_USER,

      pass:
        process.env.SMTP_PASS

    }

  });


// ============================================================
// PASSWORD SETUP EMAIL
// ============================================================

async function sendDashboardSetupEmail(
  email,
  fullName
) {

  let resetLink;

  try {

    const actionCodeSettings =
      process.env.DASHBOARD_URL
        ? {
            url:
              process.env.DASHBOARD_URL,

            handleCodeInApp:
              false
          }
        : undefined;

    resetLink =
      await auth.generatePasswordResetLink(
        email,
        actionCodeSettings
      );

  } catch (error) {

    console.error(
      "Could not generate password reset link:",
      error
    );

    throw error;
  }


  const mail = {

    from:
      process.env.EMAIL_FROM ||
      process.env.SMTP_USER,

    to:
      email,

    subject:
      "KZN WAF Dashboard Account",

    text:

`Hello ${fullName},

Your KZN Women Advancement Fund application has been registered.

You will use your email address to access the KZN WAF dashboard.

Email:
${email}

Please create your dashboard password using the following link:

${resetLink}

After creating your password, go to:

${process.env.DASHBOARD_URL || "your KZN WAF dashboard"}

Your WhatsApp number is only used for application and registration purposes.

Regards,
KZN Women Advancement Fund`,

    html:

`<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8">

<title>KZN WAF Dashboard</title>

</head>

<body style="font-family:Arial,sans-serif;line-height:1.6;">

<h2>KZN Women Advancement Fund</h2>

<p>Hello ${escapeHtml(fullName)},</p>

<p>
Your KZN Women Advancement Fund application has been registered.
</p>

<p>
You will use your <strong>email address and password</strong>
to access your dashboard.
</p>

<p>
<strong>Email:</strong><br>
${escapeHtml(email)}
</p>

<p>

<a
href="${resetLink}"
style="
display:inline-block;
padding:12px 20px;
background:#f97316;
color:#ffffff;
text-decoration:none;
border-radius:6px;
"
>
Create Your Dashboard Password
</a>

</p>

<p>
After creating your password, access your dashboard here:
</p>

<p>
<a href="${process.env.DASHBOARD_URL || "#"}">
${process.env.DASHBOARD_URL || "KZN WAF Dashboard"}
</a>
</p>

<p>
WhatsApp is only used for registration and application submission.
</p>

<p>
Regards,<br>
<strong>KZN Women Advancement Fund</strong>
</p>

</body>

</html>`

  };


  return transporter.sendMail(mail);
}


// ============================================================
// ADMIN NOTIFICATION
// ============================================================

async function sendAdminApplicationNotification(
  application
) {

  const adminEmail =
    process.env.ADMIN_NOTIFICATION_EMAIL;

  if (!adminEmail) {
    return;
  }

  await transporter.sendMail({

    from:
      process.env.EMAIL_FROM ||
      process.env.SMTP_USER,

    to:
      adminEmail,

    subject:
      `New KZN WAF WhatsApp Application - ${application.applicationReference}`,

    text:

`A new application has been submitted through WhatsApp.

Application Reference:
${application.applicationReference}

Applicant:
${application.fullName}

Email:
${application.email}

Phone:
${application.phone}

Business:
${application.businessName}

Funding:
R${Number(application.fundingAmount).toLocaleString("en-ZA")}

Source:
WhatsApp

Status:
${application.status}`

  });
}


// ============================================================
// HTML ESCAPE
// ============================================================

function escapeHtml(value) {

  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


module.exports = {
  sendDashboardSetupEmail,
  sendAdminApplicationNotification
};