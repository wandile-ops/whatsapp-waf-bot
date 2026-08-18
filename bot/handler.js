const {
  sendText,
  sendButtons
} = require("../whatsapp/whatsapp");

const flow =
  require("./flow");

const {
  getState,
  updateState,
  resetState
} = require("./conversation");

const {
  findProfileByEmail,
  findProfileByPhone,
  findOrCreateAuthUser,
  createOrUpdateProfile,
  createApplication,
  createActivity,
  updateProfileActivity,
  eventAlreadyProcessed
} = require("../firebase/database");

const {
  sendDashboardSetupEmail,
  sendAdminApplicationNotification
} = require("../email/email");


// ============================================================
// VALIDATION
// ============================================================

function isValidEmail(email) {

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    .test(String(email).trim());
}


function isValidNumber(value) {

  return /^\d+$/.test(
    String(value).trim()
  );
}


function parseDate(value) {

  const match =
    String(value)
      .trim()
      .match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (!match) {
    return null;
  }

  const day =
    Number(match[1]);

  const month =
    Number(match[2]);

  const year =
    Number(match[3]);

  const date =
    new Date(
      year,
      month - 1,
      day
    );

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return {
    day,
    month,
    year
  };
}


function is18OrOlder(date) {

  const today =
    new Date();

  let age =
    today.getFullYear() -
    date.year;

  const month =
    today.getMonth() + 1;

  const day =
    today.getDate();

  if (
    month < date.month ||
    (
      month === date.month &&
      day < date.day
    )
  ) {
    age--;
  }

  return age >= 18;
}


function cleanText(text) {

  return String(text || "")
    .trim();
}


function formatCurrency(value) {

  return Number(value || 0)
    .toLocaleString("en-ZA");
}


// ============================================================
// NORMALISE INCOMING MESSAGE
// ============================================================

function extractMessage(body) {

  try {

    const entry =
      body.entry?.[0];

    const changes =
      entry?.changes?.[0];

    const value =
      changes?.value;

    const message =
      value?.messages?.[0];

    if (!message) {
      return null;
    }

    const phone =
      message.from;

    let text = "";

    let interactionId = null;

    let interactionTitle = null;


    if (message.type === "text") {

      text =
        message.text?.body || "";

    }


    else if (
      message.type === "interactive"
    ) {

      if (
        message.interactive?.type ===
        "button_reply"
      ) {

        interactionId =
          message.interactive.button_reply.id;

        interactionTitle =
          message.interactive.button_reply.title;

        text =
          interactionId;
      }


      else if (
        message.interactive?.type ===
        "list_reply"
      ) {

        interactionId =
          message.interactive.list_reply.id;

        interactionTitle =
          message.interactive.list_reply.title;

        text =
          interactionId;
      }

    }


    return {

      messageId:
        message.id,

      phone,

      text:
        cleanText(text),

      interactionId,

      interactionTitle,

      type:
        message.type

    };

  } catch (error) {

    console.error(
      "Message extraction error:",
      error
    );

    return null;
  }
}


// ============================================================
// HANDLE MESSAGE
// ============================================================

async function handleIncomingMessage(body) {

  const message =
    extractMessage(body);

  if (!message) {
    return;
  }


  // ----------------------------------------------------------
  // PREVENT DUPLICATE WEBHOOK PROCESSING
  // ----------------------------------------------------------

  const alreadyProcessed =
    await eventAlreadyProcessed(
      message.messageId
    );

  if (alreadyProcessed) {

    console.log(
      "Duplicate WhatsApp message ignored:",
      message.messageId
    );

    return;
  }


  const phone =
    message.phone;

  const text =
    message.text;

  const interactionId =
    message.interactionId;


  // ----------------------------------------------------------
  // LOAD CONVERSATION
  // ----------------------------------------------------------

  let session =
    await getState(phone);

  let state =
    session.state;

  let data =
    session.data || {};


  // ----------------------------------------------------------
  // GLOBAL COMMANDS
  // ----------------------------------------------------------

  const lower =
    text.toLowerCase();


  if (
    lower === "hi" ||
    lower === "hello" ||
    lower === "start" ||
    lower === "menu"
  ) {

    await resetState(phone);

    await flow.welcome(phone);

    return;
  }


  if (
    lower === "cancel" ||
    lower === "exit"
  ) {

    await resetState(phone);

    await sendText(
      phone,
      "Your current WhatsApp session has been cancelled.\n\nSend START whenever you are ready to begin again."
    );

    return;
  }


  // ==========================================================
  // START
  // ==========================================================

  if (state === "START") {

    if (
      interactionId === "REGISTER"
    ) {

      data = {
        phone
      };

      await updateState(
        phone,
        "REGISTER_FULL_NAME",
        data
      );

      await flow.askRegistrationStart(phone);

      return;
    }


    if (
      interactionId === "START_APPLICATION"
    ) {

      data = {
        phone
      };

      await updateState(
        phone,
        "APPLICATION_START",
        data
      );

      await flow.askApplicationStart(phone);

      return;
    }


    if (
      interactionId === "HELP"
    ) {

      await sendText(
        phone,

`KZN WAF WhatsApp Help

To begin:
Send START.

You can:
1. Register
2. Submit an application

Your dashboard is accessed using your email address and password.

WhatsApp does not provide dashboard login.`
      );

      return;
    }


    await flow.welcome(phone);

    return;
  }


  // ==========================================================
  // REGISTRATION
  // ==========================================================

  if (
    state === "REGISTER_FULL_NAME"
  ) {

    if (text.length < 2) {

      await sendText(
        phone,
        "Please enter your full name."
      );

      return;
    }

    data.fullName =
      text;

    await updateState(
      phone,
      "REGISTER_EMAIL",
      data
    );

    await flow.askEmail(phone);

    return;
  }


  if (
    state === "REGISTER_EMAIL"
  ) {

    if (!isValidEmail(text)) {

      await sendText(
        phone,
        "That email address doesn't look correct. Please enter a valid email address."
      );

      return;
    }

    data.email =
      text.toLowerCase();

    await updateState(
      phone,
      "REGISTER_DOB",
      data
    );

    await flow.askDOB(phone);

    return;
  }


  if (
    state === "REGISTER_DOB"
  ) {

    const parsed =
      parseDate(text);

    if (!parsed) {

      await sendText(
        phone,
        "Please enter your date of birth using DD/MM/YYYY.\n\nExample: 12/02/2000"
      );

      return;
    }

    if (!is18OrOlder(parsed)) {

      await sendText(
        phone,
        "You must be 18 or older to continue."
      );

      return;
    }

    data.dob =
      `${String(parsed.day).padStart(2, "0")}/${String(parsed.month).padStart(2, "0")}/${parsed.year}`;

    await updateState(
      phone,
      "REGISTER_ID",
      data
    );

    await flow.askIdentity(phone);

    return;
  }


  if (
    state === "REGISTER_ID"
  ) {

    if (text.length < 5) {

      await sendText(
        phone,
        "Please enter a valid ID or passport number."
      );

      return;
    }

    if (
      text.toUpperCase().startsWith("PASSPORT")
    ) {

      data.passportNumber =
        text.substring(8).trim();

    } else {

      data.idNumber =
        text;
    }

    await updateState(
      phone,
      "REGISTER_BUSINESS_NAME",
      data
    );

    await flow.askBusinessName(phone);

    return;
  }


  if (
    state === "REGISTER_BUSINESS_NAME"
  ) {

    if (text.length < 2) {

      await sendText(
        phone,
        "Please enter your business or project name."
      );

      return;
    }

    data.businessName =
      text;

    await updateState(
      phone,
      "REGISTER_BUSINESS_REGISTRATION",
      data
    );

    await flow.askBusinessRegistration(phone);

    return;
  }


  if (
    state ===
    "REGISTER_BUSINESS_REGISTRATION"
  ) {

    data.businessRegistrationNumber =
      text || "N/A";

    // --------------------------------------------------------
    // CREATE AUTH USER
    // --------------------------------------------------------

    const authResult =
      await findOrCreateAuthUser(
        data.email,
        data.fullName
      );

    data.authUid =
      authResult.user.uid;

    data.registrationSource =
      "whatsapp";


    // --------------------------------------------------------
    // CREATE FIRESTORE PROFILE
    // --------------------------------------------------------

    const profile =
      await createOrUpdateProfile(
        data
      );

    data.profileId =
      profile.id;


    // --------------------------------------------------------
    // ACTIVITY
    // --------------------------------------------------------

    await createActivity({

      profileId:
        profile.id,

      type:
        "registration",

      message:
        "Applicant registered through WhatsApp."

    });


    // --------------------------------------------------------
    // PASSWORD SETUP EMAIL
    // --------------------------------------------------------

    try {

      await sendDashboardSetupEmail(
        data.email,
        data.fullName
      );

    } catch (emailError) {

      console.error(
        "Email error:",
        emailError
      );

      await sendText(
        phone,

`Your registration was saved successfully.

However, we could not send your dashboard password setup email.

Please contact the KZN WAF support team.`
      );

      await resetState(phone);

      return;
    }


    await sendText(
      phone,

`Registration successful.

Your details have been saved.

We have sent an email to:

${data.email}

The email contains instructions for creating your dashboard password.

Remember:
Your dashboard is accessed using your email address and password.`
    );


    await sendButtons(

      phone,

      "Would you like to continue with your application?",

      [

        {
          id: "CONTINUE_APPLICATION",
          title: "Continue"
        },

        {
          id: "CANCEL_APPLICATION",
          title: "Later"
        }

      ]

    );


    await updateState(
      phone,
      "AFTER_REGISTRATION",
      data
    );

    return;
  }


  // ==========================================================
  // AFTER REGISTRATION
  // ==========================================================

  if (
    state === "AFTER_REGISTRATION"
  ) {

    if (
      interactionId ===
      "CONTINUE_APPLICATION"
    ) {

      await updateState(
        phone,
        "APPLICATION_BUSINESS_TYPE",
        data
      );

      await flow.askBusinessType(phone);

      return;
    }


    if (
      interactionId ===
      "CANCEL_APPLICATION"
    ) {

      await resetState(phone);

      await sendText(
        phone,
        "No problem. Your registration has been saved.\n\nSend START whenever you are ready to continue."
      );

      return;
    }
  }


  // ==========================================================
  // APPLICATION START
  // ==========================================================

  if (
    state === "APPLICATION_START"
  ) {

    if (
      interactionId ===
      "ALREADY_REGISTERED"
    ) {

      await updateState(
        phone,
        "APPLICATION_EXISTING_EMAIL",
        data
      );

      await flow.askEmail(phone);

      return;
    }


    if (
      interactionId ===
      "NEW_APPLICANT"
    ) {

      await updateState(
        phone,
        "REGISTER_FULL_NAME",
        data
      );

      await flow.askRegistrationStart(phone);

      return;
    }


    if (
      interactionId === "CANCEL"
    ) {

      await resetState(phone);

      await sendText(
        phone,
        "Application cancelled.\n\nSend START whenever you are ready."
      );

      return;
    }
  }


  // ==========================================================
  // EXISTING APPLICANT EMAIL
  // ==========================================================

  if (
    state === "APPLICATION_EXISTING_EMAIL"
  ) {

    if (!isValidEmail(text)) {

      await sendText(
        phone,
        "Please enter the email address you used when registering on the platform."
      );

      return;
    }


    data.email =
      text.toLowerCase();


    const profile =
      await findProfileByEmail(
        data.email
      );


    if (!profile) {

      await sendButtons(

        phone,

`We couldn't find an existing profile with that email address.

Would you like to register a new profile?`,

        [

          {
            id: "NEW_APPLICANT",
            title: "Register"
          },

          {
            id: "TRY_EMAIL",
            title: "Try Again"
          },

          {
            id: "CANCEL",
            title: "Cancel"
          }

        ]

      );


      await updateState(
        phone,
        "EXISTING_EMAIL_NOT_FOUND",
        data
      );

      return;
    }


    data.profileId =
      profile.id;

    data.authUid =
      profile.authUid || null;

    data.fullName =
      profile.fullName || "";

    data.phone =
      phone;

    data.dob =
      profile.dob || "";

    data.idNumber =
      profile.idNumber || "";

    data.businessName =
      profile.businessName || "";


    await sendText(

      phone,

`We found your existing profile.

Name:
${data.fullName}

Email:
${data.email}

You can continue with a new application.`
    );


    await updateState(
      phone,
      "APPLICATION_BUSINESS_TYPE",
      data
    );

    await flow.askBusinessType(phone);

    return;
  }


  // ==========================================================
  // EXISTING EMAIL NOT FOUND
  // ==========================================================

  if (
    state ===
    "EXISTING_EMAIL_NOT_FOUND"
  ) {

    if (
      interactionId === "NEW_APPLICANT"
    ) {

      await updateState(
        phone,
        "REGISTER_FULL_NAME",
        {
          phone
        }
      );

      await flow.askRegistrationStart(phone);

      return;
    }


    if (
      interactionId === "TRY_EMAIL"
    ) {

      await updateState(
        phone,
        "APPLICATION_EXISTING_EMAIL",
        data
      );

      await flow.askEmail(phone);

      return;
    }


    if (
      interactionId === "CANCEL"
    ) {

      await resetState(phone);

      await sendText(
        phone,
        "Cancelled."
      );

      return;
    }
  }


  // ==========================================================
  // BUSINESS TYPE
  // ==========================================================

  if (
    state ===
    "APPLICATION_BUSINESS_TYPE"
  ) {

    const types = {

      SOLE_PROPRIETORSHIP:
        "Sole Proprietorship",

      PARTNERSHIP:
        "Partnership",

      PRIVATE_COMPANY:
        "Private Company (Pty Ltd)",

      COOPERATIVE:
        "Cooperative",

      NPO:
        "Non-Profit Organization",

      SOCIAL_ENTERPRISE:
        "Social Enterprise",

      OTHER:
        "Other"

    };


    const selected =
      types[interactionId];


    if (!selected) {

      await flow.askBusinessType(phone);

      return;
    }


    data.businessType =
      selected;


    await updateState(
      phone,
      "APPLICATION_DESCRIPTION",
      data
    );

    await flow.askDescription(phone);

    return;
  }


  // ==========================================================
  // DESCRIPTION
  // ==========================================================

  if (
    state ===
    "APPLICATION_DESCRIPTION"
  ) {

    if (text.length < 10) {

      await sendText(
        phone,
        "Please provide a little more information about your business/project."
      );

      return;
    }


    data.description =
      text;


    await updateState(
      phone,
      "APPLICATION_DISTRICT",
      data
    );

    await flow.askDistrict(phone);

    return;
  }


  // ==========================================================
  // DISTRICT
  // ==========================================================

  if (
    state ===
    "APPLICATION_DISTRICT"
  ) {

    const districts = {

      ETHEKWINI:
        "eThekwini Metro",

      AMAJUBA:
        "Amajuba",

      HARRYGWALA:
        "Harry Gwala",

      ILEMBE:
        "iLembe",

      "KING CETSHWAYO":
        "King Cetshwayo",

      UGU:
        "Ugu",

      UMGUNGUNDLOVU:
        "uMgungundlovu",

      UMKHANYAKUDE:
        "uMkhanyakude",

      UMZINYATHI:
        "uMzinyathi",

      UTHUKELA:
        "uThukela"

    };


    const selected =
      districts[interactionId];


    if (!selected) {

      await flow.askDistrict(phone);

      return;
    }


    data.district =
      selected;


    await updateState(
      phone,
      "APPLICATION_FULLTIME",
      data
    );

    await flow.askFullTimeEmployees(phone);

    return;
  }


  // ==========================================================
  // FULL TIME EMPLOYEES
  // ==========================================================

  if (
    state ===
    "APPLICATION_FULLTIME"
  ) {

    if (!isValidNumber(text)) {

      await sendText(
        phone,
        "Please enter a whole number.\n\nExample: 2"
      );

      return;
    }


    data.employeesFullTime =
      Number(text);


    await updateState(
      phone,
      "APPLICATION_PARTTIME",
      data
    );

    await flow.askPartTimeEmployees(phone);

    return;
  }


  // ==========================================================
  // PART TIME EMPLOYEES
  // ==========================================================

  if (
    state ===
    "APPLICATION_PARTTIME"
  ) {

    if (!isValidNumber(text)) {

      await sendText(
        phone,
        "Please enter a whole number.\n\nExample: 1"
      );

      return;
    }


    data.employeesPartTime =
      Number(text);


    await updateState(
      phone,
      "APPLICATION_FUNDING_AMOUNT",
      data
    );

    await flow.askFundingAmount(phone);

    return;
  }


  // ==========================================================
  // FUNDING AMOUNT
  // ==========================================================

  if (
    state ===
    "APPLICATION_FUNDING_AMOUNT"
  ) {

    const amount =
      Number(
        text.replace(/[R,\s]/gi, "")
      );


    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {

      await sendText(
        phone,
        "Please enter a valid funding amount.\n\nExample:\n78900"
      );

      return;
    }


    data.fundingAmount =
      amount;


    await updateState(
      phone,
      "APPLICATION_FUNDING_TYPE",
      data
    );

    await flow.askFundingType(phone);

    return;
  }


  // ==========================================================
  // FUNDING TYPE
  // ==========================================================

  if (
    state ===
    "APPLICATION_FUNDING_TYPE"
  ) {

    const fundingTypes = {

      GRANT:
        "GRANT (Don't pay back)",

      LOAN:
        "Loan",

      OTHER_FUNDING:
        "Other"

    };


    const selected =
      fundingTypes[interactionId];


    if (!selected) {

      await flow.askFundingType(phone);

      return;
    }


    data.fundingType =
      selected;


    await updateState(
      phone,
      "APPLICATION_CONFIRMATION",
      data
    );

    await flow.showConfirmation(
      phone,
      data
    );

    return;
  }


  // ==========================================================
  // CONFIRMATION
  // ==========================================================

  if (
    state ===
    "APPLICATION_CONFIRMATION"
  ) {

    if (
      interactionId ===
      "EDIT_APPLICATION"
    ) {

      await sendText(
        phone,

`To edit the application, we'll restart the application details.

Your registration information will remain saved.`
      );


      await updateState(
        phone,
        "APPLICATION_BUSINESS_TYPE",
        data
      );


      await flow.askBusinessType(phone);

      return;
    }


    if (
      interactionId ===
      "CANCEL_APPLICATION"
    ) {

      await resetState(phone);

      await sendText(
        phone,

`Your application has not been submitted.

Your registered profile remains saved.

Send START whenever you want to begin again.`
      );

      return;
    }


    if (
      interactionId !==
      "CONFIRM_APPLICATION"
    ) {

      await flow.showConfirmation(
        phone,
        data
      );

      return;
    }


    // --------------------------------------------------------
    // ENSURE AUTH ACCOUNT EXISTS
    // --------------------------------------------------------

    const authResult =
      await findOrCreateAuthUser(
        data.email,
        data.fullName
      );


    data.authUid =
      authResult.user.uid;


    // --------------------------------------------------------
    // ENSURE PROFILE EXISTS
    // --------------------------------------------------------

    const profile =
      await createOrUpdateProfile({

        ...data,

        authUid:
          data.authUid,

        registrationSource:
          data.registrationSource ||
          "whatsapp"

      });


    data.profileId =
      profile.id;


    // --------------------------------------------------------
    // CREATE APPLICATION
    // --------------------------------------------------------

    const application =
      await createApplication({

        ...data,

        profileId:
          data.profileId,

        authUid:
          data.authUid

      });


    // --------------------------------------------------------
    // ACTIVITY
    // --------------------------------------------------------

    await createActivity({

      profileId:
        data.profileId,

      applicationId:
        application.id,

      type:
        "application_submitted",

      message:
        `Application ${application.applicationReference} submitted through WhatsApp.`,

      status:
        "Submitted"

    });


    // --------------------------------------------------------
    // UPDATE PROFILE
    // --------------------------------------------------------

    await updateProfileActivity(

      data.profileId,

      `Application ${application.applicationReference} submitted through WhatsApp.`

    );


    // --------------------------------------------------------
    // SEND ADMIN EMAIL
    // --------------------------------------------------------

    try {

      await sendAdminApplicationNotification(
        application
      );

    } catch (error) {

      console.error(
        "Admin email failed:",
        error
      );

    }


    // --------------------------------------------------------
    // SEND APPLICANT CONFIRMATION
    // --------------------------------------------------------

    await sendText(

      phone,

`Application submitted successfully! 🎉

Application reference:

${application.applicationReference}

Applicant:
${application.fullName}

Business:
${application.businessName}

Funding requested:
R${formatCurrency(application.fundingAmount)}

Status:
Submitted

Your application has been saved to the KZN WAF system.

You can track your application through the online dashboard using your email address and password.

Email:
${application.email}`
    );


    await resetState(phone);

    return;
  }


  // ==========================================================
  // FALLBACK
  // ==========================================================

  await sendText(

    phone,

`I'm not sure what you mean.

Please send:

START

to return to the KZN WAF application menu.`

  );

}


module.exports = {
  handleIncomingMessage
};