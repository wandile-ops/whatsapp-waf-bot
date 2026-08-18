const {
  sendText,
  sendButtons,
  sendList
} = require("../whatsapp/whatsapp");


// ============================================================
// WELCOME
// ============================================================

async function welcome(phone) {

  await sendText(
    phone,

`Welcome to the KZN Women Advancement Fund (KZN WAF).

You can use this WhatsApp service to register and submit your funding application.

Please note:
• WhatsApp is used to register and submit your application.
• Your application will be stored securely.
• You will use your email address and password to access the online dashboard later.

What would you like to do?`
  );

  await sendButtons(
    phone,

    "Choose an option:",

    [
      {
        id: "START_APPLICATION",
        title: "Start Application"
      },
      {
        id: "REGISTER",
        title: "Register"
      },
      {
        id: "HELP",
        title: "Help"
      }
    ]
  );
}


// ============================================================
// REGISTER
// ============================================================

async function askRegistrationStart(phone) {

  await sendText(
    phone,

`Let's get you registered.

Your WhatsApp number will be recorded as your contact number.

You will also need an email address because your email will be used to access the KZN WAF online dashboard.`
  );

  await sendText(
    phone,
    "Please enter your full name."
  );
}


// ============================================================
// APPLICATION START
// ============================================================

async function askApplicationStart(phone) {

  await sendButtons(
    phone,

`Before we start, have you already registered on the KZN WAF platform?`,

    [
      {
        id: "ALREADY_REGISTERED",
        title: "Yes"
      },
      {
        id: "NEW_APPLICANT",
        title: "No"
      },
      {
        id: "CANCEL",
        title: "Cancel"
      }
    ]
  );
}


// ============================================================
// EMAIL
// ============================================================

async function askEmail(phone) {

  await sendText(
    phone,

`Please enter your email address.

This is important because you will use this email to log into your dashboard.`
  );
}


// ============================================================
// DOB
// ============================================================

async function askDOB(phone) {

  await sendText(
    phone,

`Please enter your date of birth.

Use this format:

DD/MM/YYYY

Example:
12/02/2000`
  );
}


// ============================================================
// ID
// ============================================================

async function askIdentity(phone) {

  await sendText(
    phone,

`Please enter your South African ID number.

If you are using a passport, type:

PASSPORT followed by the passport number.`
  );
}


// ============================================================
// BUSINESS NAME
// ============================================================

async function askBusinessName(phone) {

  await sendText(
    phone,

`What is the name of your business or project?`
  );
}


// ============================================================
// BUSINESS REGISTRATION
// ============================================================

async function askBusinessRegistration(phone) {

  await sendText(
    phone,

`Please enter your business registration number.

If your business is not registered, type:

N/A`
  );
}


// ============================================================
// BUSINESS TYPE
// ============================================================

async function askBusinessType(phone) {

  await sendList(

    phone,

`What type of business is this?`,

    "Select business type",

    [

      {
        id: "SOLE_PROPRIETORSHIP",
        title: "Sole Proprietorship"
      },

      {
        id: "PARTNERSHIP",
        title: "Partnership"
      },

      {
        id: "PRIVATE_COMPANY",
        title: "Private Company"
      },

      {
        id: "COOPERATIVE",
        title: "Cooperative"
      },

      {
        id: "NPO",
        title: "Non-Profit Organisation"
      },

      {
        id: "SOCIAL_ENTERPRISE",
        title: "Social Enterprise"
      },

      {
        id: "OTHER",
        title: "Other"
      }

    ]

  );
}


// ============================================================
// DESCRIPTION
// ============================================================

async function askDescription(phone) {

  await sendText(
    phone,

`Please describe your business/project.

Tell us:
• What your business does
• What products/services you provide
• Who your customers are

You can type your answer in one or more messages.`
  );
}


// ============================================================
// DISTRICT
// ============================================================

async function askDistrict(phone) {

  await sendList(

    phone,

`Which district is your business/project based in?`,

    "Select district",

    [

      {
        id: "ETHEKWINI",
        title: "eThekwini Metro"
      },

      {
        id: "AMAJUBA",
        title: "Amajuba"
      },

      {
        id: "HARRYGWALA",
        title: "Harry Gwala"
      },

      {
        id: "ILEMBE",
        title: "iLembe"
      },

      {
        id: "KING CETSHWAYO",
        title: "King Cetshwayo"
      },

      {
        id: "UGU",
        title: "Ugu"
      },

      {
        id: "UMGUNGUNDLOVU",
        title: "uMgungundlovu"
      },

      {
        id: "UMKHANYAKUDE",
        title: "uMkhanyakude"
      },

      {
        id: "UMZINYATHI",
        title: "uMzinyathi"
      },

      {
        id: "UTHUKELA",
        title: "uThukela"
      }

    ]

  );
}


// ============================================================
// EMPLOYEES
// ============================================================

async function askFullTimeEmployees(phone) {

  await sendText(
    phone,

`How many full-time employees does your business currently have?

Please enter a number.

Example:
2`
  );
}


async function askPartTimeEmployees(phone) {

  await sendText(
    phone,

`How many part-time employees does your business currently have?

Please enter a number.

Example:
1`
  );
}


// ============================================================
// FUNDING
// ============================================================

async function askFundingAmount(phone) {

  await sendText(
    phone,

`How much funding are you applying for?

Enter the amount in South African Rand.

Example:

78900`
  );
}


async function askFundingType(phone) {

  await sendList(

    phone,

`What type of funding are you applying for?`,

    "Select funding type",

    [

      {
        id: "GRANT",
        title: "Grant"
      },

      {
        id: "LOAN",
        title: "Loan"
      },

      {
        id: "OTHER_FUNDING",
        title: "Other"
      }

    ]

  );
}


// ============================================================
// CONFIRM
// ============================================================

async function showConfirmation(phone, data) {

  const summary =

`Please check your application details:

Name: ${data.fullName}

Email: ${data.email}

Date of Birth: ${data.dob}

ID/Passport: ${data.idNumber || data.passportNumber}

Business: ${data.businessName}

Registration: ${data.businessRegistrationNumber}

Business Type: ${data.businessType}

District: ${data.district}

Full-time employees: ${data.employeesFullTime}

Part-time employees: ${data.employeesPartTime}

Funding requested: R${Number(data.fundingAmount).toLocaleString("en-ZA")}

Funding type: ${data.fundingType}

Description:
${data.description}

Are these details correct?`;

  await sendButtons(

    phone,

    summary,

    [

      {
        id: "CONFIRM_APPLICATION",
        title: "Submit"
      },

      {
        id: "EDIT_APPLICATION",
        title: "Edit"
      },

      {
        id: "CANCEL_APPLICATION",
        title: "Cancel"
      }

    ]

  );
}


module.exports = {

  welcome,

  askRegistrationStart,

  askApplicationStart,

  askEmail,

  askDOB,

  askIdentity,

  askBusinessName,

  askBusinessRegistration,

  askBusinessType,

  askDescription,

  askDistrict,

  askFullTimeEmployees,

  askPartTimeEmployees,

  askFundingAmount,

  askFundingType,

  showConfirmation
};